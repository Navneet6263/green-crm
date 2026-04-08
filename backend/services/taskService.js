const taskRepository = require("../repositories/taskRepository");
const userRepository = require("../repositories/userRepository");
const auditRepository = require("../repositories/auditRepository");
const { ROLES } = require("../constants/roles");
const { createPrefixedId } = require("../utils/ids");
const { buildPaginatedResult, parsePagination } = require("../utils/pagination");
const AppError = require("../utils/appError");
const { assertCompanyAccess } = require("../utils/tenant");

function buildTaskFilters(auth, query) {
  const filters = {
    companyId: auth.role === ROLES.SUPER_ADMIN ? query.company_id || auth.companyId : auth.companyId,
    status: query.status || null,
    priority: query.priority || null,
    search: query.search || "",
    assignedTo: null,
  };

  if ([ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPER_ADMIN].includes(auth.role)) {
    filters.assignedTo = query.assigned_to || null;
  } else {
    filters.assignedTo = auth.userId;
  }

  return filters;
}

async function listTasks(auth, query) {
  const pagination = parsePagination(query);
  const filters = buildTaskFilters(auth, query);

  assertCompanyAccess(auth, filters.companyId);
  const { rows, total } = await taskRepository.listTasks(filters, pagination);
  return buildPaginatedResult(rows, total, pagination);
}

async function getTask(auth, taskId) {
  const companyId = auth.role === ROLES.SUPER_ADMIN ? auth.companyId : auth.companyId;
  const task = await taskRepository.getTaskById(taskId, companyId);
  if (!task) {
    throw new AppError("Task not found.", 404);
  }

  assertCompanyAccess(auth, task.company_id);

  if (![ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPER_ADMIN].includes(auth.role) && task.assigned_to !== auth.userId) {
    throw new AppError("You can only access your own tasks.", 403);
  }

  return task;
}

async function createTask(auth, payload) {
  const companyId = auth.role === ROLES.SUPER_ADMIN ? payload.company_id || auth.companyId : auth.companyId;
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

  const task = await taskRepository.createTask({
    task_id: await createPrefixedId("tsk"),
    company_id: companyId,
    title: String(payload.title).trim(),
    type: payload.type || "call",
    status: payload.status || "pending",
    priority: payload.priority || "medium",
    due_date: payload.due_date,
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

  const updates = {
    title: payload.title !== undefined ? String(payload.title || "").trim() : task.title,
    type: payload.type !== undefined ? payload.type : task.type,
    status: payload.status !== undefined ? payload.status : task.status,
    priority: payload.priority !== undefined ? payload.priority : task.priority,
    due_date: payload.due_date !== undefined ? payload.due_date : task.due_date,
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
