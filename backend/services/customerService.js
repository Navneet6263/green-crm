const customerRepository = require("../repositories/customerRepository");
const userRepository = require("../repositories/userRepository");
const auditRepository = require("../repositories/auditRepository");
const { ROLES } = require("../constants/roles");
const { createPrefixedId } = require("../utils/ids");
const { buildPaginatedResult, parsePagination } = require("../utils/pagination");
const AppError = require("../utils/appError");
const { assertCompanyAccess, getAccessibleCompanyIds, isPlatformOperatorRole } = require("../utils/tenant");

function buildCustomerFilters(auth, query) {
  const filters = {
    companyId: null,
    companyIds: null,
    status: query.status || null,
    search: query.search || "",
    assignedTo: null,
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
  } else if ([ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_MANAGER].includes(auth.role)) {
    filters.assignedTo = query.assigned_to || null;
  }

  return filters;
}

async function listCustomers(auth, query) {
  const pagination = parsePagination(query);
  const filters = buildCustomerFilters(auth, query);

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
    assigned_to: assignee,
    last_interaction: payload.last_interaction || null,
    next_follow_up: payload.next_follow_up || null,
    notes: payload.notes || null,
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

  const updated = await customerRepository.updateCustomer(customer.customer_id, customer.company_id, {
    name: payload.name !== undefined ? String(payload.name || "").trim() : customer.name,
    company_name: payload.company_name !== undefined ? String(payload.company_name || "").trim() : customer.company_name,
    email: payload.email !== undefined ? String(payload.email || "").trim().toLowerCase() : customer.email,
    phone: payload.phone !== undefined ? String(payload.phone || "").trim() : customer.phone,
    converted_from_lead_id: payload.converted_from_lead_id !== undefined ? payload.converted_from_lead_id : customer.converted_from_lead_id,
    total_value: payload.total_value !== undefined ? Number(payload.total_value || 0) : customer.total_value,
    status: payload.status !== undefined ? payload.status : customer.status,
    assigned_to: assignee !== undefined ? assignee : customer.assigned_to,
    last_interaction: payload.last_interaction !== undefined ? payload.last_interaction : customer.last_interaction,
    next_follow_up: payload.next_follow_up !== undefined ? payload.next_follow_up : customer.next_follow_up,
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

  const entry = `[${new Date().toISOString()}] ${auth.name}: ${String(payload.content).trim()}`;
  const notes = customer.notes ? `${customer.notes}\n${entry}` : entry;
  const updated = await customerRepository.updateCustomer(customer.customer_id, customer.company_id, {
    notes,
    last_interaction: new Date(),
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

  return updated;
}

module.exports = {
  addCustomerFollowUp,
  addCustomerNote,
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
};
