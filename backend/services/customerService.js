const customerRepository = require("../repositories/customerRepository");
const customerMemberRepository = require("../repositories/customerMemberRepository");
const customerActivityRepository = require("../repositories/customerActivityRepository");
const userRepository = require("../repositories/userRepository");
const auditRepository = require("../repositories/auditRepository");
const { ROLES } = require("../constants/roles");
const { createPrefixedId } = require("../utils/ids");
const { buildPaginatedResult, parsePagination } = require("../utils/pagination");
const AppError = require("../utils/appError");
const { assertCompanyAccess, getAccessibleCompanyIds, isPlatformOperatorRole } = require("../utils/tenant");
const leadRepository = require("../repositories/leadRepository");
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

async function resolveCustomerTeamId(auth, companyId, payload, existingCustomer = null) {
  const requestedTeamIds = parseRequestedTeamIds(payload);
  if (requestedTeamIds.length) {
    const [teamId] = requestedTeamIds;
    await assertTeamAccess(auth, companyId, teamId, {
      includeManaged: true,
      includeMembership: true,
    });
    return teamId;
  }

  if (payload.converted_from_lead_id) {
    const sourceLead = await leadRepository.getLeadById(payload.converted_from_lead_id, companyId);
    if (sourceLead?.team_id) {
      return sourceLead.team_id;
    }
  }

  if (existingCustomer?.team_id) {
    return existingCustomer.team_id;
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

async function buildCustomerFilters(auth, query) {
  const filters = {
    companyId: null,
    companyIds: null,
    status: query.status || null,
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

  if ([ROLES.SALES, ROLES.MARKETING].includes(auth.role)) {
    filters.assignedTo = auth.userId;
  } else if ([ROLES.LEGAL_TEAM, ROLES.FINANCE_TEAM, ROLES.SUPPORT, ROLES.VIEWER].includes(auth.role)) {
    filters.assignedTo = auth.userId;
  } else if ([ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_MANAGER].includes(auth.role)) {
    filters.assignedTo = query.assigned_to || null;
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

async function listCustomers(auth, query) {
  const pagination = parsePagination(query);
  const filters = await buildCustomerFilters(auth, query);

  if (filters.companyId) {
    assertCompanyAccess(auth, filters.companyId);
  }

  const { rows, total } = await customerRepository.listCustomers(filters, pagination);
  return buildPaginatedResult(rows, total, pagination);
}

async function getCustomer(auth, customerId) {
  const customer = await customerRepository.getCustomerById(
    customerId,
    auth.role === ROLES.SUPER_ADMIN || isPlatformOperatorRole(auth.role) ? null : auth.companyId
  );
  if (!customer) {
    throw new AppError("Customer not found.", 404);
  }

  assertCompanyAccess(auth, customer.company_id);
  await assertRecordTeamAccess(auth, customer, {
    includeManaged: true,
    includeMembership: true,
  });

  if (![ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_MANAGER].includes(auth.role) && customer.assigned_to !== auth.userId) {
    throw new AppError("You can only access customers assigned to you.", 403);
  }
  return customer;
}

async function createCustomer(auth, payload) {
  if (auth.role === ROLES.VIEWER) {
    throw new AppError("View-only users cannot create customers.", 403);
  }

  const companyId =
    auth.role === ROLES.SUPER_ADMIN || isPlatformOperatorRole(auth.role)
      ? payload.company_id || null
      : auth.companyId;

  if (!companyId) {
    throw new AppError("A company is required.");
  }

  assertCompanyAccess(auth, companyId);

  if (!payload.name || !payload.company_name || !payload.email || !payload.phone) {
    throw new AppError("Name, company name, email, and phone are required.");
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
    await resolveCustomerTeamId(auth, companyId, {
      ...payload,
      assigned_to: assignee,
    })
  );
  await ensureUserBelongsToTeam(companyId, assignee, teamId, "Customer owner");

  const customer = await customerRepository.createCustomer({
    customer_id: await createPrefixedId("cst"),
    company_id: companyId,
    name: String(payload.name).trim(),
    company_name: String(payload.company_name).trim(),
    email: String(payload.email).trim().toLowerCase(),
    phone: String(payload.phone).trim(),
    converted_from_lead_id: payload.converted_from_lead_id || null,
    total_value: Number(payload.total_value || 0),
    status: payload.status || "active",
    team_id: teamId,
    assigned_to: assignee,
    last_interaction: payload.last_interaction || null,
    next_follow_up: payload.next_follow_up || null,
    onboarding_date: payload.onboarding_date || null,
    onboarding_status: payload.onboarding_status || "pending",
    product_id: payload.product_id || null,
    notes: payload.notes || null,
    created_by: auth.userId,
  });

  // Log creation activity
  await customerActivityRepository.createActivity({
    company_id: companyId,
    customer_id: customer.customer_id,
    type: "created",
    description: `Customer created for ${customer.company_name}`,
    created_by: auth.userId,
  });

  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: companyId,
    action: "customer.created",
    performed_by: auth.userId,
    target_user: assignee,
    user_email: auth.email,
    user_role: auth.role,
    details: {
      customer_id: customer.customer_id,
    },
  });

  return customer;
}

async function updateCustomer(auth, customerId, payload) {
  const customer = await getCustomer(auth, customerId);
  let assignee = payload.assigned_to;

  if (assignee) {
    const user = await userRepository.getUserInCompany(assignee, customer.company_id);
    if (!user) {
      throw new AppError("Assigned user must belong to the same company.", 400);
    }
    assignee = user.user_id;
  }

  const nextTeamId = await ensureTeamIdWhenTeamsConfigured(
    customer.company_id,
    await resolveCustomerTeamId(
      auth,
      customer.company_id,
      {
        ...payload,
        assigned_to: assignee !== undefined ? assignee : customer.assigned_to,
      },
      customer
    )
  );
  await ensureUserBelongsToTeam(
    customer.company_id,
    assignee !== undefined ? assignee : customer.assigned_to,
    nextTeamId,
    "Customer owner"
  );

  const updated = await customerRepository.updateCustomer(customer.customer_id, customer.company_id, {
    name: payload.name !== undefined ? String(payload.name || "").trim() : customer.name,
    company_name: payload.company_name !== undefined ? String(payload.company_name || "").trim() : customer.company_name,
    email: payload.email !== undefined ? String(payload.email || "").trim().toLowerCase() : customer.email,
    phone: payload.phone !== undefined ? String(payload.phone || "").trim() : customer.phone,
    converted_from_lead_id: payload.converted_from_lead_id !== undefined ? payload.converted_from_lead_id : customer.converted_from_lead_id,
    total_value: payload.total_value !== undefined ? Number(payload.total_value || 0) : customer.total_value,
    status: payload.status !== undefined ? payload.status : customer.status,
    team_id: nextTeamId,
    assigned_to: assignee !== undefined ? assignee : customer.assigned_to,
    last_interaction: payload.last_interaction !== undefined ? payload.last_interaction : customer.last_interaction,
    next_follow_up: payload.next_follow_up !== undefined ? payload.next_follow_up : customer.next_follow_up,
    onboarding_date: payload.onboarding_date !== undefined ? payload.onboarding_date : customer.onboarding_date,
    onboarding_status: payload.onboarding_status !== undefined ? payload.onboarding_status : customer.onboarding_status,
    product_id: payload.product_id !== undefined ? payload.product_id : customer.product_id,
    notes: payload.notes !== undefined ? payload.notes : customer.notes,
  });

  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: customer.company_id,
    action: "customer.updated",
    performed_by: auth.userId,
    target_user: updated.assigned_to,
    user_email: auth.email,
    user_role: auth.role,
    details: {
      customer_id: updated.customer_id,
    },
  });

  // Log update activity
  await customerActivityRepository.createActivity({
    company_id: customer.company_id,
    customer_id: updated.customer_id,
    type: "updated",
    description: `Customer details updated by ${auth.name || auth.email}`,
    created_by: auth.userId,
  });

  return updated;
}

async function deleteCustomer(auth, customerId) {
  const customer = await getCustomer(auth, customerId);
  await customerRepository.updateCustomer(customer.customer_id, customer.company_id, { is_active: 0 });
  return { deleted: true };
}

async function addCustomerNote(auth, customerId, payload) {
  const customer = await getCustomer(auth, customerId);
  if (!payload.content) {
    throw new AppError("Note content is required.");
  }

  const content = String(payload.content).trim();
  const entry = `[${new Date().toISOString()}] ${auth.name}: ${content}`;
  const notes = customer.notes ? `${customer.notes}\n${entry}` : entry;
  const updated = await customerRepository.updateCustomer(customer.customer_id, customer.company_id, {
    notes,
    last_interaction: new Date(),
  });

  // Log note activity
  await customerActivityRepository.createActivity({
    company_id: customer.company_id,
    customer_id: customer.customer_id,
    type: "note",
    description: content,
    created_by: auth.userId,
  });

  return updated;
}

async function addCustomerFollowUp(auth, customerId, payload) {
  const customer = await getCustomer(auth, customerId);
  if (!payload.next_follow_up) {
    throw new AppError("next_follow_up is required.");
  }

  const updated = await customerRepository.updateCustomer(customer.customer_id, customer.company_id, {
    next_follow_up: payload.next_follow_up,
    last_interaction: new Date(),
  });

  // Log follow-up activity
  await customerActivityRepository.createActivity({
    company_id: customer.company_id,
    customer_id: customer.customer_id,
    type: "follow_up",
    description: `Follow-up scheduled for ${new Date(payload.next_follow_up).toLocaleDateString("en-IN")}`,
    created_by: auth.userId,
  });

  return updated;
}

async function listCustomerMembers(auth, customerId) {
  const customer = await getCustomer(auth, customerId);
  return customerMemberRepository.listMembers(customer.customer_id, customer.company_id);
}

async function addCustomerMember(auth, customerId, payload) {
  const customer = await getCustomer(auth, customerId);
  if (!payload.user_id) throw new AppError("user_id is required.");
  const user = await userRepository.getUserInCompany(payload.user_id, customer.company_id);
  if (!user) throw new AppError("User must belong to the same company.", 400);

  await customerMemberRepository.addMember({
    company_id: customer.company_id,
    customer_id: customer.customer_id,
    user_id: user.user_id,
    role: payload.role || "collaborator",
    added_by: auth.userId,
  });

  // Log member-added activity
  await customerActivityRepository.createActivity({
    company_id: customer.company_id,
    customer_id: customer.customer_id,
    type: "member_added",
    description: `${user.name || user.user_id} added as ${payload.role || "collaborator"}`,
    created_by: auth.userId,
  });

  return customerMemberRepository.listMembers(customer.customer_id, customer.company_id);
}

async function removeCustomerMember(auth, customerId, userId) {
  const customer = await getCustomer(auth, customerId);
  const members = await customerMemberRepository.listMembers(customer.customer_id, customer.company_id);
  const target = members.find((m) => m.user_id === userId);

  await customerMemberRepository.removeMember(customer.customer_id, userId);

  // Log member-removed activity
  await customerActivityRepository.createActivity({
    company_id: customer.company_id,
    customer_id: customer.customer_id,
    type: "member_removed",
    description: `${target?.user_name || userId} removed from customer`,
    created_by: auth.userId,
  });

  return { removed: true };
}

async function listCustomerActivities(auth, customerId, query = {}) {
  const customer = await getCustomer(auth, customerId);
  const pagination = parsePagination(query);
  const { rows, total } = await customerActivityRepository.listActivities(
    customer.customer_id,
    customer.company_id,
    pagination
  );
  return buildPaginatedResult(rows, total, pagination);
}

module.exports = {
  addCustomerFollowUp,
  addCustomerMember,
  addCustomerNote,
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomerActivities,
  listCustomerMembers,
  listCustomers,
  removeCustomerMember,
  updateCustomer,
};
