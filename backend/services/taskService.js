const taskRepository = require("../repositories/taskRepository");
const userRepository = require("../repositories/userRepository");
const auditRepository = require("../repositories/auditRepository");
const { ROLES } = require("../constants/roles");
const { createPrefixedId } = require("../utils/ids");
const { buildPaginatedResult, parsePagination } = require("../utils/pagination");
const AppError = require("../utils/appError");
const { assertCompanyAccess, getAccessibleCompanyIds, isPlatformOperatorRole } = require("../utils/tenant");
const leadRepository = require("../repositories/leadRepository");
const customerRepository = require("../repositories/customerRepository");
const {
  assertRecordTeamAccess,
  assertTeamAccess,
  ensureTeamIdWhenTeamsConfigured,
  ensureUserBelongsToTeam,
  parseRequestedTeamIds,
  resolveDefaultTeamId,
  resolvePreferredTeamId,
  resolveTeamScope,
} = require("./accessScopeService");

async function resolveTaskTeamId(auth, companyId, payload, existingTask = null) {
  const requestedTeamIds = parseRequestedTeamIds(payload);
  if (requestedTeamIds.length) {
    const [teamId] = requestedTeamIds;
    await assertTeamAccess(auth, companyId, teamId, {
      includeManaged: true,
      includeMembership: true,
    });
    return teamId;
  }

  if (payload.related_to === "lead" && payload.related_id) {
    const lead = await leadRepository.getLeadById(payload.related_id, companyId);
    if (lead?.team_id) {
      return lead.team_id;
    }
  }

  if (payload.related_to === "customer" && payload.related_id) {
    const customer = await customerRepository.getCustomerById(payload.related_id, companyId);
    if (customer?.team_id) {
      return customer.team_id;
    }
  }

  if (existingTask?.team_id) {
    return existingTask.team_id;
  }

  if (payload.assigned_to) {
    const preferredAssigneeTeam = await resolvePreferredTeamId(companyId, payload.assigned_to);
    if (preferredAssigneeTeam) {
      return preferredAssigneeTeam;
    }
  }

  const creatorTeamId = await resolvePreferredTeamId(companyId, auth.userId);
  if (creatorTeamId) {
    return creatorTeamId;
  }

  return resolveDefaultTeamId(companyId);
}

async function buildTaskFilters(auth, query) {
  const filters = {
    companyId: null,
    companyIds: null,
    status: query.status || null,
    priority: query.priority || null,
    search: query.search || "",
    assignedTo: null,
    teamIds: null,
  };

  if (auth.role === ROLES.SUPER_ADMIN) {
    filters.companyId = query.company_id || null;
  } else if (isPlatformOperatorRole(auth.role)) {
    filters.companyId = query.company_id || null;
    filters.companyIds = filters.companyId ? null : getAccessibleCompanyIds(auth);
  } else {
    filters.companyId = auth.companyId;
  }

  if ([ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_MANAGER].includes(auth.role)) {
    filters.assignedTo = query.assigned_to || null;
  } else {
    filters.assignedTo = auth.userId;
  }

  if (filters.companyId) {
    const teamScope = await resolveTeamScope(auth, filters.companyId, parseRequestedTeamIds(query), {
      includeManaged: true,
      includeMembership: true,
    });
    filters.teamIds = teamScope.teamIds;
  }

  return filters;
}

async function listTasks(auth, query) {
  const pagination = parsePagination(query);
  const filters = await buildTaskFilters(auth, query);

  if (filters.companyId) {
    assertCompanyAccess(auth, filters.companyId);
  }

  const { rows, total } = await taskRepository.listTasks(filters, pagination);
  return buildPaginatedResult(rows, total, pagination);
}

async function getTask(auth, taskId) {
  const companyId =
    auth.role === ROLES.SUPER_ADMIN || isPlatformOperatorRole(auth.role) ? null : auth.companyId;
  const task = await taskRepository.getTaskById(taskId, companyId);
  if (!task) {
    throw new AppError("Task not found.", 404);
  }

  assertCompanyAccess(auth, task.company_id);
  await assertRecordTeamAccess(auth, task, {
    includeManaged: true,
    includeMembership: true,
  });

  if (![ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_MANAGER].includes(auth.role) && task.assigned_to !== auth.userId) {
    throw new AppError("You can only access your own tasks.", 403);
  }

  return task;
}

async function createTask(auth, payload) {
  const companyId =
    auth.role === ROLES.SUPER_ADMIN || isPlatformOperatorRole(auth.role)
      ? payload.company_id || null
      : auth.companyId;

  if (!companyId) {
    throw new AppError("A company is required.");
  }

  assertCompanyAccess(auth, companyId);

  if (!payload.title || !payload.due_date) {
    throw new AppError("Task title and due date are required.");
  }

  let assignee = payload.assigned_to || auth.userId;
  if (assignee) {
    const user = await userRepository.getUserInCompany(assignee, companyId);
    if (!user) {
      throw new AppError("Assigned user must belong to the same company.", 400);
    }
    assignee = user.user_id;
  }

  const teamId = await ensureTeamIdWhenTeamsConfigured(
    companyId,
    await resolveTaskTeamId(auth, companyId, {
      ...payload,
      assigned_to: assignee,
    })
  );
  await ensureUserBelongsToTeam(companyId, assignee, teamId, "Task owner");

  const task = await taskRepository.createTask({
    task_id: await createPrefixedId("tsk"),
    company_id: companyId,
    title: String(payload.title).trim(),
    type: payload.type || "call",
    status: payload.status || "pending",
    priority: payload.priority || "medium",
    due_date: payload.due_date,
    team_id: teamId,
    assigned_to: assignee,
    related_to: payload.related_to || null,
    related_id: payload.related_id || null,
    created_by: auth.userId,
    notes: payload.notes || null,
  });

  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: companyId,
    action: "task.created",
    performed_by: auth.userId,
    target_user: assignee,
    user_email: auth.email,
    user_role: auth.role,
    details: {
      task_id: task.task_id,
    },
  });

  return task;
}

async function updateTask(auth, taskId, payload) {
  const task = await getTask(auth, taskId);
  let assignee = payload.assigned_to;

  if (assignee) {
    const user = await userRepository.getUserInCompany(assignee, task.company_id);
    if (!user) {
      throw new AppError("Assigned user must belong to the same company.", 400);
    }
    assignee = user.user_id;
  }

  const nextTeamId = await ensureTeamIdWhenTeamsConfigured(
    task.company_id,
    await resolveTaskTeamId(
      auth,
      task.company_id,
      {
        ...payload,
        assigned_to: assignee !== undefined ? assignee : task.assigned_to,
      },
      task
    )
  );
  await ensureUserBelongsToTeam(
    task.company_id,
    assignee !== undefined ? assignee : task.assigned_to,
    nextTeamId,
    "Task owner"
  );

  const updates = {
    title: payload.title !== undefined ? String(payload.title || "").trim() : task.title,
    type: payload.type !== undefined ? payload.type : task.type,
    status: payload.status !== undefined ? payload.status : task.status,
    priority: payload.priority !== undefined ? payload.priority : task.priority,
    due_date: payload.due_date !== undefined ? payload.due_date : task.due_date,
    team_id: nextTeamId,
    assigned_to: assignee !== undefined ? assignee : task.assigned_to,
    related_to: payload.related_to !== undefined ? payload.related_to : task.related_to,
    related_id: payload.related_id !== undefined ? payload.related_id : task.related_id,
    notes: payload.notes !== undefined ? payload.notes : task.notes,
  };

  const updated = await taskRepository.updateTask(task.task_id, task.company_id, updates);
  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: task.company_id,
    action: "task.updated",
    performed_by: auth.userId,
    target_user: updated.assigned_to,
    user_email: auth.email,
    user_role: auth.role,
    details: {
      task_id: updated.task_id,
    },
  });

  return updated;
}

async function deleteTask(auth, taskId) {
  const task = await getTask(auth, taskId);
  await taskRepository.deleteTask(task.task_id, task.company_id);
  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: task.company_id,
    action: "task.deleted",
    performed_by: auth.userId,
    target_user: task.assigned_to,
    user_email: auth.email,
    user_role: auth.role,
    details: {
      task_id: task.task_id,
    },
  });

  return { deleted: true };
}

module.exports = {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTask,
};
