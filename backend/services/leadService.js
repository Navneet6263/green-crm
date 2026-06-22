const db = require("../db/connection");
const crypto = require("crypto");
const companyRepository = require("../repositories/companyRepository");
const userRepository = require("../repositories/userRepository");
const productRepository = require("../repositories/productRepository");
const leadRepository = require("../repositories/leadRepository");
const leadAssignmentRepository = require("../repositories/leadAssignmentRepository");
const leadDocumentRepository = require("../repositories/leadDocumentRepository");
const workflowRepository = require("../repositories/workflowRepository");
const auditRepository = require("../repositories/auditRepository");
const { LEAD_ACTIVITY_TYPES, LEAD_PRIORITIES, LEAD_STATUSES } = require("../constants/lead");
const { LEAD_CREATOR_ROLES, MANAGER_ROLES, ROLES } = require("../constants/roles");
const { parseCsv } = require("../utils/csv");
const { buildPaginatedResult, parsePagination } = require("../utils/pagination");
const { createPrefixedId } = require("../utils/ids");
const AppError = require("../utils/appError");
const { assertCompanyAccess, getAccessibleCompanyIds, isManagerRole, isPlatformOperatorRole } = require("../utils/tenant");
const {
  deleteStoredLeadDocument,
  storeLeadDocument,
} = require("./leadDocumentStorageService");
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
const { assertValidTransition } = require("../utils/workflowStateMachine");

const INVALID_LEAD_DATE = Symbol("invalid_lead_date");
const PRIMARY_ASSIGNMENT_ACCESS_TYPE = "primary";
const SHARED_ACCESS_ROLES = [
  ROLES.SALES,
  ROLES.MARKETING,
  ROLES.LEGAL_TEAM,
  ROLES.FINANCE_TEAM,
  ROLES.SUPPORT,
  ROLES.VIEWER,
];
const LEAD_DOCUMENT_UPLOAD_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.PLATFORM_ADMIN,
  ROLES.PLATFORM_MANAGER,
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.SALES,
  ROLES.MARKETING,
  ROLES.LEGAL_TEAM,
  ROLES.FINANCE_TEAM,
  ROLES.SUPPORT,
  ROLES.EXPERT,
];

function normalizeLeadNumber(value) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const directNumeric = Number(value);
  if (Number.isFinite(directNumeric)) {
    return directNumeric;
  }

  const cleaned = String(value)
    .replace(/[^\d.-]/g, "")
    .trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeLeadInteger(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const directNumeric = Number(value);
  if (Number.isFinite(directNumeric)) {
    return Number.isInteger(directNumeric) ? directNumeric : NaN;
  }

  const cleaned = String(value)
    .replace(/[^\d-]/g, "")
    .trim();

  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);
  return Number.isInteger(parsed) ? parsed : NaN;
}

function normalizeLeadDate(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? INVALID_LEAD_DATE : value;
  }

  const source = String(value).trim();
  const normalized = source.includes("T") ? source : source.replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? INVALID_LEAD_DATE : parsed;
}

function normalizeLeadFilterDate(value, { endOfDay = false } = {}) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = normalizeLeadDate(value);
  if (parsed === INVALID_LEAD_DATE) {
    throw new AppError("Lead filter date is invalid.", 400);
  }

  const date = new Date(parsed);
  const source = String(value).trim();

  if (!source.includes("T") && !source.includes(":")) {
    date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  }

  return date;
}

function maskLeadForRole(lead, role) {
  if (!lead) return lead;
  if (role === 'expert') {
    return {
      ...lead,
      phone: null,
      email: null,
      whatsapp: null,
      customer_phone: null,
      customer_email: null,
      customer_whatsapp: null,
      total_lead_value: null,
      advance_received: null,
      remaining_payment: null,
    };
  }
  return lead;
}

function normalizeLeadPayload(payload) {
  return {
    contact_person: String(payload.contact_person || payload.contact_person_name || "").trim(),
    company_name: String(payload.company_name || "").trim(),
    email: payload.email ? String(payload.email).trim().toLowerCase() : "",
    phone: String(payload.phone || "").trim(),
    address_street: payload.address_street || payload.street || null,
    address_city: payload.address_city || payload.city || null,
    address_state: payload.address_state || payload.state || null,
    address_zip: payload.address_zip || payload.postal_code || null,
    address_country: payload.address_country || payload.country || "India",
    industry: payload.industry || null,
    lead_source: payload.lead_source || payload.source || "website",
    follow_up_date: normalizeLeadDate(payload.follow_up_date),
    status: String(payload.status || "new").toLowerCase(),
    priority: String(payload.priority || "medium").toLowerCase(),
    estimated_value: normalizeLeadNumber(payload.estimated_value || payload.estimated_deal_value || 0),
    number_of_units: normalizeLeadInteger(
      payload.number_of_units ?? payload.number_of_unit ?? payload.unit_count ?? payload.units ?? null
    ),
    product_id: payload.product_id || null,
    no_of_employees: payload.no_of_employees !== undefined ? String(payload.no_of_employees).trim() : null,
    requirements: payload.requirements || payload.notes || null,
    workflow_stage: String(payload.workflow_stage || "sales").toLowerCase(),
    assigned_to: payload.assigned_to || null,
    total_lead_value: normalizeLeadNumber(payload.estimated_value ?? payload.total_lead_value ?? 0),
    advance_received: normalizeLeadNumber(payload.advance_received ?? 0),
    active_users: normalizeLeadInteger(payload.active_users ?? null),
    payment_mode: payload.payment_mode || null,
    payment_date: normalizeLeadDate(payload.payment_date),
    client_tenure: payload.client_tenure || null,
    subscription_start_date: normalizeLeadDate(payload.subscription_start_date),
    next_payment_date: normalizeLeadDate(payload.next_payment_date),
  };
}

function isImportEmpty(value) {
  if (value === undefined || value === null) {
    return true;
  }

  const normalized = String(value).trim();
  return !normalized || /^null$/i.test(normalized);
}

function getImportValue(row, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row || {}, key) && !isImportEmpty(row[key])) {
      return String(row[key]).trim();
    }
  }

  return null;
}

function getImportNumber(row, keys, fallback = 0) {
  const rawValue = getImportValue(row, keys);
  if (rawValue === null) {
    return fallback;
  }

  const numericValue = Number(rawValue);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function buildBulkImportLeadPayload(row, defaultCompanyId = null) {
  const assignedCode = getImportValue(row, [
    "assigned_to",
    "assigned_emp_code",
    "assigned_employee_code",
    "assigned_user_id",
    "employee_code",
    "emp_code",
  ]);
  const productCode = getImportValue(row, ["product_id", "product_code"]);

  return {
    company_id: getImportValue(row, ["company_id", "company_code"]) || defaultCompanyId || null,
    team_id: getImportValue(row, ["team_id", "team_code"]),
    product_id: productCode,
    assigned_to: assignedCode || null,
    contact_person: getImportValue(row, ["contact_person", "contact_person_name"]) || "",
    company_name: getImportValue(row, ["company_name"]) || "",
    email: getImportValue(row, ["email"]) || "",
    phone: getImportValue(row, ["phone"]) || "",
    industry: getImportValue(row, ["industry"]),
    lead_source: getImportValue(row, ["lead_source", "source"]) || "website",
    follow_up_date: getImportValue(row, ["follow_up_date"]),
    estimated_value: getImportNumber(row, ["estimated_value", "estimated_deal_value"], 0),
    number_of_units: getImportValue(row, ["number_of_units", "number_of_unit", "unit_count", "units"]),
    priority: getImportValue(row, ["priority"]) || "medium",
    address_street: getImportValue(row, ["address_street", "street"]),
    address_city: getImportValue(row, ["address_city", "city"]),
    address_state: getImportValue(row, ["address_state", "state"]),
    address_zip: getImportValue(row, ["address_zip", "postal_code"]),
    address_country: getImportValue(row, ["address_country", "country"]) || "India",
    status: "new",
    requirements: null,
    workflow_stage: "sales",
    row_number: Number(row.__row_number || row.row_number || 0) || null,
  };
}

function validateLeadPayload(lead) {
  if (!lead.contact_person || !lead.company_name) {
    throw new AppError("Contact person and company name are required.");
  }

  if (!lead.phone && !lead.email) {
    throw new AppError("Either email or phone is required.");
  }

  if (!lead.product_id) {
    throw new AppError("A product is required for every lead.", 400);
  }

  if (!LEAD_PRIORITIES.includes(lead.priority)) {
    throw new AppError("Invalid lead priority.");
  }

  if (!LEAD_STATUSES.includes(lead.status)) {
    throw new AppError("Invalid lead status.");
  }

  if (!Number.isFinite(lead.estimated_value)) {
    throw new AppError("Estimated value must be a valid number.", 400);
  }

  if (lead.number_of_units !== null && (!Number.isInteger(lead.number_of_units) || lead.number_of_units < 0)) {
    throw new AppError("Number of units must be a whole number.", 400);
  }

  if (lead.follow_up_date === INVALID_LEAD_DATE) {
    throw new AppError("Follow-up date is invalid.", 400);
  }
}

function comparableValue(value) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value).trim();
}

function buildLeadChangeSummary(previousLead, nextLead, assignedToOverride) {
  const changes = [];
  const track = (label, before, after) => {
    if (comparableValue(before) !== comparableValue(after)) {
      changes.push({
        label,
        before: comparableValue(before) || "--",
        after: comparableValue(after) || "--",
      });
    }
  };

  track("Contact person", previousLead.contact_person, nextLead.contact_person);
  track("Company name", previousLead.company_name, nextLead.company_name);
  track("Email", previousLead.email, nextLead.email);
  track("Phone", previousLead.phone, nextLead.phone);
  track("City", previousLead.address_city, nextLead.address_city);
  track("State", previousLead.address_state, nextLead.address_state);
  track("Country", previousLead.address_country, nextLead.address_country);
  track("Industry", previousLead.industry, nextLead.industry);
  track("Lead source", previousLead.lead_source, nextLead.lead_source);
  track("Follow-up date", previousLead.follow_up_date, nextLead.follow_up_date);
  track("Status", previousLead.status, nextLead.status);
  track("Priority", previousLead.priority, nextLead.priority);
  track("Estimated value", previousLead.estimated_value, nextLead.estimated_value);
  track("Number of units", previousLead.number_of_units, nextLead.number_of_units);
  track("No. of employees", previousLead.no_of_employees, nextLead.no_of_employees);
  track("Product", previousLead.product_id, nextLead.product_id);
  track("Workflow", previousLead.workflow_stage, nextLead.workflow_stage);
  track("Requirements", previousLead.requirements, nextLead.requirements);

  if (assignedToOverride !== undefined) {
    track("Owner", previousLead.assigned_to, assignedToOverride);
  }

  return changes;
}

function buildChangeNoteContent(noteContent, changes) {
  const summary = changes.map((change) => `${change.label}: ${change.before} -> ${change.after}`);
  return summary.length
    ? `${noteContent}\n\nChanges:\n${summary.join("\n")}`
    : noteContent;
}

async function ensureSameCompanyUser(userId, companyId) {
  const user = await userRepository.getUserInCompany(userId, companyId);

  if (!user || !user.is_active) {
    throw new AppError("User must belong to the same active company.", 400);
  }

  return user;
}

function normalizeUserIdList(values = []) {
  const queue = Array.isArray(values) ? values : [values];
  const items = [];

  queue.forEach((value) => {
    if (Array.isArray(value)) {
      items.push(...value);
      return;
    }

    if (value && typeof value === "object") {
      items.push(value.user_id || value.id || "");
      return;
    }

    items.push(...String(value || "").split(","));
  });

  return [...new Set(items.map((value) => String(value || "").trim()).filter(Boolean))];
}

function getRestrictedLeadAccessColumns(role) {
  if (role === ROLES.LEGAL_TEAM) {
    return ["assigned_to_legal", "assigned_to"];
  }

  if (role === ROLES.FINANCE_TEAM) {
    return ["assigned_to_finance", "assigned_to"];
  }

  if (SHARED_ACCESS_ROLES.includes(role)) {
    return ["assigned_to"];
  }

  return [];
}

function buildLeadAssignmentPayload(lead, sharedUsers = []) {
  const primaryAssignee = lead?.assigned_to
    ? {
        user_id: lead.assigned_to,
        name: lead.assigned_to_name || null,
        email: lead.assigned_to_email || null,
        role: lead.assigned_to_role || null,
        department: lead.assigned_to_department || null,
        access_type: PRIMARY_ASSIGNMENT_ACCESS_TYPE,
        is_primary: true,
      }
    : null;
  const collaborators = (Array.isArray(sharedUsers) ? sharedUsers : []).map((user) => ({
    user_id: user.user_id,
    name: user.name || null,
    email: user.email || null,
    role: user.role || null,
    department: user.department || null,
    access_type: user.access_type || "shared",
    is_primary: false,
    created_at: user.created_at || null,
    updated_at: user.updated_at || null,
  }));

  return {
    primary_assignee: primaryAssignee,
    shared_users: collaborators,
    shared_user_ids: collaborators.map((user) => user.user_id),
    assignment_users: primaryAssignee ? [primaryAssignee, ...collaborators] : collaborators,
  };
}

function buildSharedAssignmentChangeMessage(addedUsers = [], removedUsers = []) {
  const parts = [];

  if (addedUsers.length) {
    parts.push(`Added ${addedUsers.join(", ")}`);
  }

  if (removedUsers.length) {
    parts.push(`Removed ${removedUsers.join(", ")}`);
  }

  return parts.length ? `Shared access updated. ${parts.join(". ")}.` : "Shared access updated.";
}

async function ensureSharedUsersAllowed(lead, userIds) {
  const normalizedUserIds = normalizeUserIdList(userIds).filter((userId) => userId !== lead.assigned_to);
  const users = [];

  for (const userId of normalizedUserIds) {
    const user = await ensureSameCompanyUser(userId, lead.company_id);
    await ensureUserBelongsToTeam(lead.company_id, user.user_id, lead.team_id, "Shared user");
    users.push(user);
  }

  return users;
}

async function getLeadRecord(auth, leadId) {
  const lead = await leadRepository.getLeadById(
    leadId,
    auth.role === ROLES.SUPER_ADMIN || isPlatformOperatorRole(auth.role) ? null : auth.companyId
  );

  await assertLeadAccess(auth, lead);
  return lead;
}

async function assertLeadAccess(auth, lead) {
  if (!lead) {
    throw new AppError("Lead not found.", 404);
  }

  await assertRecordTeamAccess(auth, lead, {
    includeManaged: true,
    includeMembership: true,
  });

  if (auth.role === ROLES.LEGAL_TEAM && lead.workflow_stage !== "legal") {
    throw new AppError("Legal team can only access legal stage leads.", 403);
  }

  if (auth.role === ROLES.FINANCE_TEAM && lead.workflow_stage !== "finance") {
    throw new AppError("Finance team can only access finance stage leads.", 403);
  }

  const accessColumns = getRestrictedLeadAccessColumns(auth.role);
  if (!accessColumns.length) {
    return;
  }

  const hasPrimaryAccess = accessColumns.some((column) => lead[column] === auth.userId);
  if (hasPrimaryAccess) {
    return;
  }

  const hasSharedAccess = await leadAssignmentRepository.hasSharedUserAccess(
    lead.lead_id,
    lead.company_id,
    auth.userId
  );

  if (!hasSharedAccess) {
    throw new AppError("You can only access leads shared with you or assigned to you.", 403);
  }
}

async function ensureLeadContext(companyId, productId) {
  const company = await companyRepository.getCompanyById(companyId);
  if (!company) {
    throw new AppError("Company not found.", 404);
  }

  if (productId) {
    const product = await productRepository.getProductById(productId);
    if (!product || product.company_id !== companyId || !product.is_active) {
      throw new AppError("Selected product is not available for this company.", 400);
    }
  }
}

async function resolveLeadTeamId(auth, companyId, payload, existingLead = null) {
  const requestedTeamIds = parseRequestedTeamIds(payload);
  let resolvedTeamId = null;

  if (requestedTeamIds.length) {
    [resolvedTeamId] = requestedTeamIds;
    await assertTeamAccess(auth, companyId, resolvedTeamId, {
      includeManaged: true,
      includeMembership: true,
    });
  }

  let product = null;
  if (payload.product_id) {
    product = await productRepository.getProductById(payload.product_id);
    if (product && product.company_id !== companyId) {
      throw new AppError("Selected product is not available for this company.", 400);
    }
  }

  if (resolvedTeamId && product?.team_id && product.team_id !== resolvedTeamId) {
    throw new AppError("Lead team must match the selected product team.", 400);
  }

  if (!resolvedTeamId && product?.team_id) {
    return product.team_id;
  }

  if (existingLead?.team_id) {
    return existingLead.team_id;
  }

  if (resolvedTeamId) {
    return resolvedTeamId;
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

async function buildLeadFilters(auth, query) {
  const createdFrom = normalizeLeadFilterDate(query.from_date || query.created_from || null);
  const createdTo = normalizeLeadFilterDate(query.to_date || query.created_to || null, { endOfDay: true });

  if (createdFrom && createdTo && createdFrom > createdTo) {
    throw new AppError("From date must be before or equal to the end date.", 400);
  }

  const filters = {
    companyId: null,
    companyIds: null,
    status: query.status || null,
    quickFilter: query.quick_filter || query.quickFilter || null,
    priority: query.priority || null,
    leadSource: query.lead_source || query.source || null,
    search: query.search || "",
    notesSearch: query.notes_search || "",
    workflowStage: query.workflow_stage || null,
    productId: query.product_id || null,
    createdFrom,
    createdTo,
    hasPayment: query.has_payment === "true" || query.has_payment === true || query.hasPayment === "true" || query.hasPayment === true,
    teamIds: null,
  };

  if (auth.role === ROLES.SUPER_ADMIN) {
    const requestedTeamIds = parseRequestedTeamIds(query);
    filters.companyId = query.company_id || null;
    filters.assignedTo = query.assigned_to || null;
    filters.createdBy = query.created_by || null;
    filters.teamIds = requestedTeamIds.length ? requestedTeamIds : null;
    return filters;
  }

  if (isPlatformOperatorRole(auth.role)) {
    const requestedTeamIds = parseRequestedTeamIds(query);
    filters.companyId = query.company_id || null;
    filters.companyIds = filters.companyId ? null : getAccessibleCompanyIds(auth);
    filters.assignedTo = query.assigned_to || null;
    filters.createdBy = query.created_by || null;
    filters.teamIds = (
      await resolveTeamScope(auth, filters.companyId, requestedTeamIds, {
        includeManaged: true,
        includeMembership: true,
      })
    ).teamIds;
    return filters;
  }

  filters.companyId = auth.companyId;

  if (query.is_workflow !== undefined) {
    filters.isWorkflow = query.is_workflow === "true" || query.is_workflow === "1" || query.is_workflow === true;
  } else if (query.isWorkflow !== undefined) {
    filters.isWorkflow = query.isWorkflow === "true" || query.isWorkflow === "1" || query.isWorkflow === true;
  }

  if (auth.role === "expert") {
    filters.assignedTo = auth.userId;
    filters.isWorkflow = 1;
  } else if (auth.role === ROLES.SALES) {
    filters.viewerUserId = auth.userId;
    filters.viewerAccessColumns = getRestrictedLeadAccessColumns(auth.role);
  } else if (auth.role === ROLES.MARKETING) {
    filters.viewerUserId = auth.userId;
    filters.viewerAccessColumns = getRestrictedLeadAccessColumns(auth.role);
  } else if (auth.role === ROLES.LEGAL_TEAM) {
    filters.workflowStage = "legal";
    filters.viewerUserId = auth.userId;
    filters.viewerAccessColumns = getRestrictedLeadAccessColumns(auth.role);
  } else if (auth.role === ROLES.FINANCE_TEAM) {
    filters.workflowStage = "finance";
    filters.viewerUserId = auth.userId;
    filters.viewerAccessColumns = getRestrictedLeadAccessColumns(auth.role);
  } else if ([ROLES.SUPPORT, ROLES.VIEWER].includes(auth.role)) {
    filters.viewerUserId = auth.userId;
    filters.viewerAccessColumns = getRestrictedLeadAccessColumns(auth.role);
  } else {
    filters.assignedTo = query.assigned_to === "me" ? auth.userId : (query.assigned_to || null);
    filters.createdBy = query.created_by || null;
  }

  filters.teamIds = (
    await resolveTeamScope(auth, filters.companyId, parseRequestedTeamIds(query), {
      includeManaged: true,
      includeMembership: true,
    })
  ).teamIds;

  return filters;
}

async function listLeads(auth, query) {
  const pagination = parsePagination(query);
  const filters = await buildLeadFilters(auth, query);

  if (filters.companyId) {
    assertCompanyAccess(auth, filters.companyId);
  }

  const { rows, total, totalValue, totalClosedWon, totalAdvanceReceived, pageInfo } = await leadRepository.listLeads(filters, pagination);
  const maskedRows = rows.map((row) => maskLeadForRole(row, auth.role));

  const result = buildPaginatedResult(maskedRows, total, pagination, pageInfo);
  result.meta.total_value = totalValue;
  result.meta.total_closed_won = totalClosedWon;
  result.meta.total_advance_received = totalAdvanceReceived;

  if (filters.companyId) {
    let teamClause = "";
    const params = [filters.companyId];
    if (Array.isArray(filters.teamIds) && filters.teamIds.length > 0) {
      teamClause = ` AND team_id IN (${filters.teamIds.map(() => "?").join(", ")})`;
      params.push(...filters.teamIds);
    } else if (Array.isArray(filters.teamIds) && filters.teamIds.length === 0) {
      teamClause = " AND 1 = 0";
    }

    const [sumRows] = await db.query(
      `SELECT
         COUNT(*) AS total_workflow_leads,
         SUM(CASE WHEN workflow_status IN ('in_progress', 'pending_qa', 'revisions_needed') THEN 1 ELSE 0 END) AS active_workflow_leads,
         SUM(CASE WHEN workflow_status IN ('approved', 'completed') THEN 1 ELSE 0 END) AS completed_workflow_leads,
         COALESCE(SUM(advance_received), 0) AS total_advance_received,
         COALESCE(SUM(remaining_payment), 0) AS total_remaining_payment
       FROM leads
       WHERE company_id = ? AND is_active = 1 AND is_workflow = 1${teamClause}`,
      params
    );
    const row = sumRows[0] || {};
    result.meta.workflow_summary = {
      total_workflow_leads: row.total_workflow_leads || 0,
      active_workflow_leads: row.active_workflow_leads || 0,
      completed_workflow_leads: row.completed_workflow_leads || 0,
      total_advance_received: row.total_advance_received || 0,
      total_remaining_payment: row.total_remaining_payment || 0,
    };
  }

  return result;
}

async function getLead(auth, leadId) {
  const lead = await getLeadRecord(auth, leadId);
  const [documents, legalDocuments, financeDocuments, stageHistory, transferHistory, sharedUsers] = await Promise.all([
    leadDocumentRepository.listLeadDocumentsByLead(lead.lead_id, lead.company_id),
    workflowRepository.listLegalDocumentsByLead(lead.lead_id, lead.company_id),
    workflowRepository.listFinanceDocumentsByLead(lead.lead_id, lead.company_id),
    workflowRepository.listStageHistoryByLead(lead.lead_id, lead.company_id),
    workflowRepository.listTransferHistoryByLead(lead.lead_id, lead.company_id),
    leadAssignmentRepository.listSharedUsersByLead(lead.lead_id, lead.company_id),
  ]);
  const assignmentPayload = buildLeadAssignmentPayload(lead, sharedUsers);

  const leadObj = {
    ...lead,
    ...assignmentPayload,
    documents,
    legal_documents: legalDocuments,
    finance_documents: financeDocuments,
    stage_history: stageHistory,
    transfer_history: transferHistory,
    can_transfer_to_legal:
      ["super-admin", "admin", "manager", "sales"].includes(auth.role) &&
      lead.status === "closed-won" &&
      (lead.workflow_stage || "sales") === "sales",
  };
  return maskLeadForRole(leadObj, auth.role);
}

async function listLeadDocuments(auth, leadId) {
  const lead = await getLeadRecord(auth, leadId);
  return leadDocumentRepository.listLeadDocumentsByLead(lead.lead_id, lead.company_id);
}

async function uploadLeadDocument(auth, leadId, metadata, fileBuffer) {
  const lead = await getLeadRecord(auth, leadId);
  if (!LEAD_DOCUMENT_UPLOAD_ROLES.includes(auth.role)) {
    throw new AppError("This role cannot upload lead documents.", 403);
  }

  const buffer = Buffer.isBuffer(fileBuffer)
    ? fileBuffer
    : fileBuffer
      ? Buffer.from(fileBuffer)
      : null;

  if (!buffer?.length) {
    throw new AppError("A document file is required.", 400);
  }

  const storedDocument = await storeLeadDocument({
    buffer,
    companyId: lead.company_id,
    contentType: String(metadata?.contentType || "application/octet-stream").trim().toLowerCase(),
    documentType: "general",
    fileName: metadata?.fileName,
    leadId: lead.lead_id,
  });

  try {
    return await db.withTransaction(async (transaction) => {
      const createdDocument = await leadDocumentRepository.createLeadDocument(
        {
          company_id: lead.company_id,
          lead_id: lead.lead_id,
          file_name: storedDocument.fileName,
          file_url: storedDocument.fileUrl,
          file_size: storedDocument.fileSize,
          content_type: storedDocument.contentType,
          uploaded_by: auth.userId,
        },
        transaction
      );

      await leadRepository.createActivity(
        {
          activity_id: await createPrefixedId("act"),
          company_id: lead.company_id,
          lead_id: lead.lead_id,
          type: "updated",
          description: `Document uploaded: ${storedDocument.fileName}`,
          created_by: auth.userId,
        },
        transaction
      );

      await auditRepository.createLog(
        {
          audit_id: await createPrefixedId("aud"),
          company_id: lead.company_id,
          entity_id: lead.lead_id,
          action: "lead.document.uploaded",
          performed_by: auth.userId,
          details: {
            content_type: storedDocument.contentType,
            file_name: storedDocument.fileName,
            file_size: storedDocument.fileSize,
          },
        },
        transaction
      );

      return {
        id: createdDocument.id,
        file_name: createdDocument.file_name,
        file_url: createdDocument.file_url,
        file_size: createdDocument.file_size,
        mime_type: createdDocument.content_type || null,
        document_type: "general",
        uploaded_by: createdDocument.uploaded_by,
        created_at: createdDocument.uploaded_at || null,
        ...createdDocument,
      };
    });
  } catch (error) {
    await deleteStoredLeadDocument(storedDocument.fileUrl).catch(() => {});
    throw error;
  }
}

async function createLead(auth, payload) {
  if (!LEAD_CREATOR_ROLES.includes(auth.role)) {
    throw new AppError("Your role cannot create leads.", 403);
  }

  const companyId =
    auth.role === ROLES.SUPER_ADMIN || isPlatformOperatorRole(auth.role)
      ? payload.company_id
      : auth.companyId;
  if (!companyId) {
    throw new AppError("A company is required.");
  }

  assertCompanyAccess(auth, companyId);

  const lead = normalizeLeadPayload(payload);
  validateLeadPayload(lead);
  await ensureLeadContext(companyId, lead.product_id);

  let assignedTo = lead.assigned_to || auth.userId;
  if (assignedTo) {
    if (!isManagerRole(auth.role) && assignedTo !== auth.userId) {
      throw new AppError("Only admins and managers can assign leads to someone else.", 403);
    }

    assignedTo = (await ensureSameCompanyUser(assignedTo, companyId)).user_id;
  }

  const teamId = await ensureTeamIdWhenTeamsConfigured(
    companyId,
    await resolveLeadTeamId(auth, companyId, {
      ...payload,
      product_id: lead.product_id,
      assigned_to: assignedTo,
    })
  );
  await ensureUserBelongsToTeam(companyId, assignedTo, teamId, "Lead owner");

  if (lead.phone) {
    const existing = await leadRepository.findLeadByPhoneInTeam(lead.phone, teamId);
    if (existing) {
      throw new AppError(`This number already exists in this team under the name: ${existing.contact_person || existing.company_name}`, 400);
    }
  }

  let is_workflow = 0;
  let workflow_status = null;
  if (assignedTo) {
    const assignedUser = await userRepository.getUserInCompany(assignedTo, companyId);
    if (assignedUser && assignedUser.role === 'expert') {
      is_workflow = 1;
      workflow_status = 'in_progress';
    }
  }

  return db.withTransaction(async (transaction) => {
    const createdLead = await leadRepository.createLead(
      {
        lead_id: await createPrefixedId("led"),
        company_id: companyId,
        contact_person: lead.contact_person,
        company_name: lead.company_name,
        email: lead.email,
        phone: lead.phone,
        address_street: lead.address_street,
        address_city: lead.address_city,
        address_state: lead.address_state,
        address_zip: lead.address_zip,
        address_country: lead.address_country,
        industry: lead.industry,
        lead_source: lead.lead_source,
        follow_up_date: lead.follow_up_date,
        status: lead.status,
        priority: lead.priority,
        estimated_value: lead.estimated_value,
        number_of_units: lead.number_of_units,
        team_id: teamId,
        assigned_to: assignedTo,
        assigned_by: auth.userId,
        created_by: auth.userId,
        product_id: lead.product_id,
        requirements: lead.requirements,
        workflow_stage: lead.workflow_stage,
        is_workflow,
        workflow_status,
        total_lead_value: lead.estimated_value || lead.total_lead_value,
        advance_received: lead.advance_received,
      },
      transaction
    );

    await leadRepository.createActivity(
      {
        activity_id: await createPrefixedId("act"),
        company_id: companyId,
        lead_id: createdLead.lead_id,
        type: "created",
        description: `Lead created for ${lead.company_name}`,
        created_by: auth.userId,
      },
      transaction
    );

    await auditRepository.createLog(
      {
        audit_id: await createPrefixedId("aud"),
        company_id: companyId,
        entity_type: "lead",
        entity_id: createdLead.lead_id,
        action: "lead.created",
        performed_by: auth.userId,
        details: {
          assigned_to: assignedTo,
          status: lead.status,
          workflow_stage: lead.workflow_stage,
        },
      },
      transaction
    );

    return maskLeadForRole(createdLead, auth.role);
  });
}

async function updateLead(auth, leadId, payload) {
  const lead = await getLeadRecord(auth, leadId);

  if (auth.role === ROLES.SUPPORT || auth.role === ROLES.VIEWER) {
    throw new AppError("This role cannot update lead core fields.", 403);
  }

  const normalized = normalizeLeadPayload({ ...lead, ...payload });
  validateLeadPayload(normalized);

  // Enforce workflow stage transition order: sales → legal → finance → completed
  if (normalized.workflow_stage !== lead.workflow_stage) {
    assertValidTransition(lead.workflow_stage, normalized.workflow_stage);
  }

  await ensureLeadContext(lead.company_id, normalized.product_id);

  if (normalized.phone && normalized.phone !== lead.phone) {
    const existing = await leadRepository.findLeadByPhoneInTeam(normalized.phone, lead.team_id, lead.lead_id);
    if (existing) {
      throw new AppError(`This number already exists in this team under the name: ${existing.contact_person || existing.company_name}`, 400);
    }
  }

  const updates = {
    contact_person: normalized.contact_person,
    company_name: normalized.company_name,
    email: normalized.email,
    phone: normalized.phone,
    address_street: normalized.address_street,
    address_city: normalized.address_city,
    address_state: normalized.address_state,
    address_zip: normalized.address_zip,
    address_country: normalized.address_country,
    industry: normalized.industry,
    lead_source: normalized.lead_source,
    follow_up_date: normalized.follow_up_date,
    status: normalized.status,
    priority: normalized.priority,
    estimated_value: normalized.estimated_value,
    number_of_units: normalized.number_of_units,
    no_of_employees: normalized.no_of_employees,
    product_id: normalized.product_id,
    requirements: normalized.requirements,
    workflow_stage: normalized.workflow_stage,
    total_lead_value: normalized.estimated_value || normalized.total_lead_value,
    advance_received: normalized.advance_received,
    active_users: normalized.active_users,
    payment_mode: normalized.payment_mode,
    payment_date: normalized.payment_date,
    client_tenure: normalized.client_tenure,
    subscription_start_date: normalized.subscription_start_date,
    next_payment_date: normalized.next_payment_date,
  };

  let assignedToOverride;

  if (payload.assigned_to !== undefined && payload.assigned_to !== lead.assigned_to) {
    const isDemoHandoff =
      normalized.status === "booked-demo" &&
      [ROLES.SALES, ROLES.MARKETING].includes(auth.role) &&
      lead.assigned_to === auth.userId;

    if (!MANAGER_ROLES.includes(auth.role) && !isDemoHandoff) {
      throw new AppError("Only managers and admins can reassign leads.", 403);
    }

    updates.assigned_to = (await ensureSameCompanyUser(payload.assigned_to, lead.company_id)).user_id;
    assignedToOverride = updates.assigned_to;
    updates.assigned_by = auth.userId;
    updates.assigned_at = new Date();
  }

  if (assignedToOverride !== undefined) {
    if (assignedToOverride) {
      const assignedUser = await userRepository.getUserInCompany(assignedToOverride, lead.company_id);
      if (assignedUser && assignedUser.role === 'expert') {
        updates.is_workflow = 1;
        updates.workflow_status = 'in_progress';
      } else {
        updates.is_workflow = 0;
        updates.workflow_status = null;
      }
    } else {
      updates.is_workflow = 0;
      updates.workflow_status = null;
    }
  }

  updates.team_id = await ensureTeamIdWhenTeamsConfigured(
    lead.company_id,
    await resolveLeadTeamId(
      auth,
      lead.company_id,
      {
        ...payload,
        product_id: normalized.product_id,
        assigned_to: assignedToOverride !== undefined ? assignedToOverride : lead.assigned_to,
      },
      lead
    )
  );
  await ensureUserBelongsToTeam(
    lead.company_id,
    assignedToOverride !== undefined ? assignedToOverride : lead.assigned_to,
    updates.team_id,
    "Lead owner"
  );

  const changes = buildLeadChangeSummary(lead, updates, assignedToOverride);
  if (!changes.length) {
    return lead;
  }

  const changeNote = String(payload.change_note || payload.note || "").trim();
  if (!changeNote) {
    throw new AppError("A note is required whenever a lead is changed.", 400);
  }

  const updatedLead = await db.withTransaction(async (transaction) => {
    await leadRepository.updateLead(leadId, lead.company_id, updates, transaction);
    if (updates.assigned_to) {
      await leadAssignmentRepository.removeSharedUserAccess(
        leadId,
        lead.company_id,
        updates.assigned_to,
        transaction
      );
    }

    await leadRepository.createNote(
      {
        company_id: lead.company_id,
        lead_id: leadId,
        content: buildChangeNoteContent(changeNote, changes),
        created_by: auth.userId,
      },
      transaction
    );

    await leadRepository.createActivity(
      {
        activity_id: await createPrefixedId("act"),
        company_id: lead.company_id,
        lead_id: leadId,
        type: payload.assigned_to ? "assigned" : "updated",
        description: payload.assigned_to ? `Lead reassigned. ${changeNote}` : `Lead updated. ${changeNote}`,
        created_by: auth.userId,
      },
      transaction
    );

    return leadRepository.getLeadById(leadId, lead.company_id, transaction);
  });

  const sharedUsers = await leadAssignmentRepository.listSharedUsersByLead(
    updatedLead.lead_id,
    updatedLead.company_id
  );
  return maskLeadForRole({
    ...updatedLead,
    ...buildLeadAssignmentPayload(updatedLead, sharedUsers),
  }, auth.role);
}

async function deleteLead(auth, leadId, payload = {}) {
  const lead = await getLeadRecord(auth, leadId);

  if (!MANAGER_ROLES.includes(auth.role) && auth.role !== ROLES.SUPER_ADMIN) {
    throw new AppError("Only admins and managers can delete leads.", 403);
  }

  const changeNote = String(payload.change_note || payload.note || "").trim();
  if (!changeNote) {
    throw new AppError("A note is required whenever a lead is changed.", 400);
  }

  await db.withTransaction(async (transaction) => {
    await leadRepository.softDeleteLead(leadId, lead.company_id, transaction);
    await leadRepository.createNote(
      {
        company_id: lead.company_id,
        lead_id: leadId,
        content: `Lead archived.\n\nReason:\n${changeNote}`,
        created_by: auth.userId,
      },
      transaction
    );
    await leadRepository.createActivity(
      {
        activity_id: await createPrefixedId("act"),
        company_id: lead.company_id,
        lead_id: leadId,
        type: "updated",
        description: `Lead archived. ${changeNote}`,
        created_by: auth.userId,
      },
      transaction
    );
  });

  return { deleted: true };
}

async function assignLead(auth, leadId, payload) {
  if (!MANAGER_ROLES.includes(auth.role)) {
    throw new AppError("Only managers, admins, and super admins can assign leads.", 403);
  }

  if (!payload.assigned_to) {
    throw new AppError("assigned_to is required.");
  }

  const lead = await getLeadRecord(auth, leadId);
  const assignee = await ensureSameCompanyUser(payload.assigned_to, lead.company_id);
  return updateLead(auth, leadId, {
    assigned_to: assignee.user_id,
    change_note: payload.change_note || payload.note || "",
  });
}

function createBulkActivityId() {
  return `AI${Date.now().toString(36)}${crypto.randomBytes(4).toString("hex")}`.slice(0, 20);
}

function placeholders(items) {
  return items.map(() => "?").join(", ");
}

function chunkItems(items, size = 250) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function listBulkAssignableLeads(auth, leadIds) {
  const rows = [];

  for (const batch of chunkItems(leadIds, 900)) {
    const [batchRows] = await db.query(
      `
        SELECT
          l.lead_id,
          l.company_id,
          l.team_id,
          l.assigned_to,
          p.team_id AS product_team_id
        FROM leads l
        LEFT JOIN products p ON p.product_id = l.product_id AND p.company_id = l.company_id
        WHERE l.is_active = 1
          AND l.lead_id IN (${placeholders(batch)})
      `,
      batch
    );
    rows.push(...batchRows);
  }

  if (rows.length !== leadIds.length) {
    throw new AppError("Some selected leads were not found or are inactive.", 404);
  }

  const companyIds = [...new Set(rows.map((lead) => lead.company_id).filter(Boolean))];
  for (const companyId of companyIds) {
    assertCompanyAccess(auth, companyId);
    const scope = await resolveTeamScope(auth, companyId, [], {
      includeManaged: true,
      includeMembership: true,
    });
    if (scope.teamIds) {
      const outsideTeam = rows.some((lead) => lead.company_id === companyId && (!lead.team_id || !scope.teamIds.includes(lead.team_id)));
      if (outsideTeam) {
        throw new AppError("You cannot assign leads outside your allowed teams.", 403);
      }
    }
  }

  return rows;
}

async function listAssignedUserTeamIds(companyId, userId, teamIds) {
  const normalizedTeamIds = normalizeUserIdList(teamIds);
  if (!normalizedTeamIds.length) {
    return [];
  }

  const [rows] = await db.query(
    `
      SELECT DISTINCT team_id
      FROM (
        SELECT team_id
        FROM team_members
        WHERE company_id = ? AND user_id = ? AND is_active = 1
          AND team_id IN (${placeholders(normalizedTeamIds)})
        UNION
        SELECT team_id
        FROM team_managers
        WHERE company_id = ? AND user_id = ? AND is_active = 1
          AND team_id IN (${placeholders(normalizedTeamIds)})
      ) scoped_user_teams
    `,
    [companyId, userId, ...normalizedTeamIds, companyId, userId, ...normalizedTeamIds]
  );

  return normalizeUserIdList(rows.map((row) => row.team_id));
}

async function prepareBulkAssignmentRows(auth, rows, assignee) {
  const companyIds = [...new Set(rows.map((lead) => lead.company_id).filter(Boolean))];
  if (companyIds.length !== 1 || companyIds[0] !== assignee.company_id) {
    throw new AppError("Bulk assignment supports one company and one matching assignee at a time.", 400);
  }

  const companyId = companyIds[0];
  const needsFallbackTeam = rows.some((lead) => !lead.team_id && !lead.product_team_id);
  let fallbackTeamId = null;

  if (needsFallbackTeam) {
    fallbackTeamId =
      await resolvePreferredTeamId(companyId, assignee.user_id)
      || await resolveDefaultTeamId(companyId);
    fallbackTeamId = await ensureTeamIdWhenTeamsConfigured(companyId, fallbackTeamId);
  }

  const prepared = rows.map((lead) => ({
    ...lead,
    next_team_id: lead.product_team_id || lead.team_id || fallbackTeamId || null,
  }));
  const nextTeamIds = [...new Set(prepared.map((lead) => lead.next_team_id).filter(Boolean))];
  const userTeamIds = await listAssignedUserTeamIds(companyId, assignee.user_id, nextTeamIds);
  const missingTeam = nextTeamIds.find((teamId) => !userTeamIds.includes(teamId));

  if (missingTeam) {
    throw new AppError("Lead owner must belong to every selected lead team.", 400);
  }

  return prepared.filter((lead) => lead.assigned_to !== assignee.user_id);
}

async function writeBulkAssignment(auth, leads, assignee, changeNote) {
  if (!leads.length) {
    return;
  }

  await db.withTransaction(async (transaction) => {
    for (const batch of chunkItems(leads, 250)) {
      await transaction.query(
        `
          UPDATE leads
          SET
            assigned_to = ?,
            assigned_by = ?,
            assigned_at = SYSUTCDATETIME(),
            team_id = CASE lead_id ${batch.map(() => "WHEN ? THEN ?").join(" ")} ELSE team_id END,
            updated_at = SYSUTCDATETIME()
          WHERE company_id = ?
            AND lead_id IN (${placeholders(batch)})
        `,
        [
          assignee.user_id,
          auth.userId,
          ...batch.flatMap((lead) => [lead.lead_id, lead.next_team_id]),
          assignee.company_id,
          ...batch.map((lead) => lead.lead_id),
        ]
      );

      await transaction.query(
        `
          DELETE FROM lead_assignments
          WHERE company_id = ?
            AND user_id = ?
            AND access_type = ?
            AND lead_id IN (${placeholders(batch)})
        `,
        [assignee.company_id, assignee.user_id, leadAssignmentRepository.SHARED_ACCESS_TYPE, ...batch.map((lead) => lead.lead_id)]
      );

      await transaction.query(
        `
          INSERT INTO lead_notes (company_id, lead_id, content, created_by, created_at, updated_at)
          VALUES ${batch.map(() => "(?, ?, ?, ?, SYSUTCDATETIME(), SYSUTCDATETIME())").join(", ")}
        `,
        batch.flatMap((lead) => [
          lead.company_id,
          lead.lead_id,
          buildChangeNoteContent(changeNote, buildLeadChangeSummary(lead, { ...lead, assigned_to: assignee.user_id }, assignee.user_id)),
          auth.userId,
        ])
      );

      await transaction.query(
        `
          INSERT INTO lead_activities (activity_id, company_id, lead_id, type, description, created_by, created_at)
          VALUES ${batch.map(() => "(?, ?, ?, ?, ?, ?, SYSUTCDATETIME())").join(", ")}
        `,
        batch.flatMap((lead) => [
          createBulkActivityId(),
          lead.company_id,
          lead.lead_id,
          "assigned",
          `Lead reassigned. ${changeNote}`,
          auth.userId,
        ])
      );
    }
  });
}

async function bulkAssignLeads(auth, payload = {}) {
  if (!MANAGER_ROLES.includes(auth.role)) {
    throw new AppError("Only managers, admins, and super admins can assign leads.", 403);
  }

  const leadIds = normalizeUserIdList(payload.lead_ids || payload.ids);
  const assignedTo = String(payload.assigned_to || "").trim();
  const changeNote = String(payload.change_note || payload.note || "").trim();

  if (!leadIds.length) {
    throw new AppError("lead_ids are required.", 400);
  }
  if (!assignedTo) {
    throw new AppError("assigned_to is required.", 400);
  }
  if (!changeNote) {
    throw new AppError("A note is required whenever a lead is changed.", 400);
  }

  const selectedLeads = await listBulkAssignableLeads(auth, leadIds);
  const companyIds = [...new Set(selectedLeads.map((lead) => lead.company_id).filter(Boolean))];
  const assignee = await ensureSameCompanyUser(assignedTo, companyIds[0]);
  const changedLeads = await prepareBulkAssignmentRows(auth, selectedLeads, assignee);

  await writeBulkAssignment(auth, changedLeads, assignee, changeNote);

  return {
    lead_ids: leadIds,
    skipped_count: selectedLeads.length - changedLeads.length,
    updated_count: changedLeads.length,
    updated_leads: changedLeads.map((lead) => ({
      lead_id: lead.lead_id,
      assigned_to: assignee.user_id,
      assigned_to_name: assignee.name || null,
      team_id: lead.next_team_id,
    })),
  };
}

async function getLeadAssignments(auth, leadId) {
  const lead = await getLeadRecord(auth, leadId);
  const sharedUsers = await leadAssignmentRepository.listSharedUsersByLead(lead.lead_id, lead.company_id);

  return {
    lead_id: lead.lead_id,
    ...buildLeadAssignmentPayload(lead, sharedUsers),
  };
}

async function updateLeadAssignments(auth, leadId, payload) {
  if (!MANAGER_ROLES.includes(auth.role) && auth.role !== ROLES.SALES) { throw new AppError("Only managers, admins, and sales can update shared lead access.", 403);
  }

  const lead = await getLeadRecord(auth, leadId);
  const currentSharedUsers = await leadAssignmentRepository.listSharedUsersByLead(lead.lead_id, lead.company_id);
  const nextSharedUsers = await ensureSharedUsersAllowed(lead, [
    payload.shared_user_ids,
    payload.user_ids,
    payload.user_id,
  ]);
  const nextUserIds = nextSharedUsers.map((user) => user.user_id);

  const result = await db.withTransaction(async (transaction) => {
    const replacement = await leadAssignmentRepository.replaceSharedUsers(
      lead.lead_id,
      lead.company_id,
      nextUserIds,
      auth.userId,
      transaction
    );

    if (replacement.addedUserIds.length || replacement.removedUserIds.length) {
      const addedLabels = nextSharedUsers
        .filter((user) => replacement.addedUserIds.includes(user.user_id))
        .map((user) => user.name || user.user_id);
      const removedLabels = currentSharedUsers
        .filter((user) => replacement.removedUserIds.includes(user.user_id))
        .map((user) => user.name || user.user_id);

      await leadRepository.createActivity(
        {
          activity_id: await createPrefixedId("act"),
          company_id: lead.company_id,
          lead_id: lead.lead_id,
          type: "updated",
          description: buildSharedAssignmentChangeMessage(addedLabels, removedLabels),
          created_by: auth.userId,
        },
        transaction
      );

      await auditRepository.createLog(
        {
          audit_id: await createPrefixedId("aud"),
          company_id: lead.company_id,
          entity_type: "lead",
          entity_id: lead.lead_id,
          action: "lead.shared_access.updated",
          performed_by: auth.userId,
          details: {
            added_user_ids: replacement.addedUserIds,
            removed_user_ids: replacement.removedUserIds,
            primary_assignee: lead.assigned_to || null,
          },
        },
        transaction
      );
    }

    return replacement;
  });

  return {
    lead_id: lead.lead_id,
    ...buildLeadAssignmentPayload(lead, result.rows),
  };
}

async function removeLeadAssignment(auth, leadId, userId) {
  if (!MANAGER_ROLES.includes(auth.role) && auth.role !== ROLES.SALES) { throw new AppError("Only managers, admins, and sales can remove shared lead access.", 403);
  }

  const lead = await getLeadRecord(auth, leadId);
  if (String(userId || "").trim() === lead.assigned_to) {
    throw new AppError("Primary assignee must be changed through lead owner controls.", 400);
  }

  const sharedUsers = await leadAssignmentRepository.listSharedUsersByLead(lead.lead_id, lead.company_id);
  const existingUser = sharedUsers.find((user) => user.user_id === String(userId || "").trim());
  if (!existingUser) {
    return {
      lead_id: lead.lead_id,
      ...buildLeadAssignmentPayload(lead, sharedUsers),
    };
  }

  await db.withTransaction(async (transaction) => {
    await leadAssignmentRepository.removeSharedUserAccess(
      lead.lead_id,
      lead.company_id,
      existingUser.user_id,
      transaction
    );
    await leadRepository.createActivity(
      {
        activity_id: await createPrefixedId("act"),
        company_id: lead.company_id,
        lead_id: lead.lead_id,
        type: "updated",
        description: buildSharedAssignmentChangeMessage([], [existingUser.name || existingUser.user_id]),
        created_by: auth.userId,
      },
      transaction
    );
    await auditRepository.createLog(
      {
        audit_id: await createPrefixedId("aud"),
        company_id: lead.company_id,
        entity_type: "lead",
        entity_id: lead.lead_id,
        action: "lead.shared_access.removed",
        performed_by: auth.userId,
        details: {
          removed_user_ids: [existingUser.user_id],
          primary_assignee: lead.assigned_to || null,
        },
      },
      transaction
    );
  });

  const nextSharedUsers = sharedUsers.filter((user) => user.user_id !== existingUser.user_id);
  return {
    lead_id: lead.lead_id,
    ...buildLeadAssignmentPayload(lead, nextSharedUsers),
  };
}

async function addLeadNote(auth, leadId, payload) {
  const lead = await getLeadRecord(auth, leadId);

  if (!payload.content) {
    throw new AppError("Note content is required.");
  }

  const content = String(payload.content).trim();

  await db.withTransaction(async (transaction) => {
    await leadRepository.createNote({
      company_id: lead.company_id,
      lead_id: leadId,
      content,
      created_by: auth.userId,
    }, transaction);

    await leadRepository.createActivity({
      activity_id: await createPrefixedId("act"),
      company_id: lead.company_id,
      lead_id: leadId,
      type: "note",
      description: content,
      created_by: auth.userId,
    }, transaction);
  });

  return { created: true };
}

async function addLeadActivity(auth, leadId, payload) {
  const lead = await getLeadRecord(auth, leadId);
  const type = String(payload.type || payload.activity_type || "comment").toLowerCase();

  if (!LEAD_ACTIVITY_TYPES.includes(type)) {
    throw new AppError("Invalid activity type.");
  }

  await leadRepository.createActivity({
    activity_id: await createPrefixedId("act"),
    company_id: lead.company_id,
    lead_id: leadId,
    type,
    description: payload.description || payload.message || null,
    created_by: auth.userId,
  });

  return { created: true };
}

async function listLeadActivities(auth, leadId, query) {
  const lead = await getLeadRecord(auth, leadId);
  const pagination = parsePagination(query);
  const { rows, total, pageInfo } = await leadRepository.listActivities(
    leadId,
    lead.company_id,
    pagination
  );

  return buildPaginatedResult(rows, total, pagination, pageInfo);
}

async function listLeadNotes(auth, leadId, query) {
  const lead = await getLeadRecord(auth, leadId);
  const pagination = parsePagination(query);
  const { rows, total, pageInfo } = await leadRepository.listNotes(leadId, lead.company_id, pagination);

  return buildPaginatedResult(rows, total, pagination, pageInfo);
}

async function listReminders(auth, query) {
  const pagination = parsePagination(query);
  const filters = {
    companyId: null,
    companyIds: null,
    viewerUserId: SHARED_ACCESS_ROLES.includes(auth.role) ? auth.userId : null,
    viewerAccessColumns: getRestrictedLeadAccessColumns(auth.role),
    userId: !SHARED_ACCESS_ROLES.includes(auth.role) ? query.user_id || null : null,
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

  if (filters.companyId) {
    assertCompanyAccess(auth, filters.companyId);
    filters.teamIds = (
      await resolveTeamScope(auth, filters.companyId, parseRequestedTeamIds(query), {
        includeManaged: true,
        includeMembership: true,
      })
    ).teamIds;
  }

  const { rows, total, pageInfo } = await leadRepository.listReminders(filters, pagination);
  return buildPaginatedResult(rows, total, pagination, pageInfo);
}

async function listMyLeads(auth, query) {
  return listLeads(auth, {
    ...query,
    created_by: auth.userId,
  });
}

async function getProductStats(auth, query = {}) {
  const companyId =
    auth.role === ROLES.SUPER_ADMIN || isPlatformOperatorRole(auth.role)
      ? query.company_id || null
      : auth.companyId;

  if (!companyId) {
    throw new AppError("Select a company before viewing product stats.", 400);
  }

  assertCompanyAccess(auth, companyId);
  const { teamIds } = await resolveTeamScope(auth, companyId, parseRequestedTeamIds(query), {
    includeManaged: true,
    includeMembership: true,
  });
  return leadRepository.getProductStats({
    companyId,
    teamIds,
    assignedTo: !SHARED_ACCESS_ROLES.includes(auth.role) ? query.assigned_to || null : null,
    viewerUserId: SHARED_ACCESS_ROLES.includes(auth.role) ? auth.userId : null,
    viewerAccessColumns: getRestrictedLeadAccessColumns(auth.role),
  });
}

async function getUserProductHistory(auth, query = {}) {
  const companyId =
    auth.role === ROLES.SUPER_ADMIN || isPlatformOperatorRole(auth.role)
      ? query.company_id || null
      : auth.companyId;

  if (!companyId) {
    throw new AppError("Select a company before viewing product history.", 400);
  }

  assertCompanyAccess(auth, companyId);
  const { teamIds } = await resolveTeamScope(auth, companyId, parseRequestedTeamIds(query), {
    includeManaged: true,
    includeMembership: true,
  });
  const targetUserId = [ROLES.SALES, ROLES.MARKETING, ROLES.LEGAL_TEAM, ROLES.FINANCE_TEAM, ROLES.SUPPORT, ROLES.VIEWER].includes(auth.role)
    ? auth.userId
    : query.user_id || auth.userId;
  return leadRepository.getUserProductHistory(targetUserId, companyId, teamIds);
}

async function bulkUpload(auth, payload) {
  if (![ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_MANAGER, ROLES.ADMIN, ROLES.MANAGER, ROLES.MARKETING].includes(auth.role)) {
    throw new AppError("Your role cannot bulk import leads.", 403);
  }

  const rows = Array.isArray(payload.rows) ? payload.rows : parseCsv(payload.csv);
  if (!rows.length) {
    throw new AppError("No CSV rows were provided.");
  }

  if (rows.length > 250) {
    throw new AppError("Bulk import supports up to 250 rows at a time.");
  }

  const defaultCompanyId =
    auth.role === ROLES.SUPER_ADMIN || isPlatformOperatorRole(auth.role)
      ? payload.company_id || null
      : auth.companyId;

  // Pre-validate all rows before inserting anything
  const validRows = [];
  const errors = [];

  for (const [index, row] of rows.entries()) {
    const mappedRow = buildBulkImportLeadPayload(row, defaultCompanyId);
    const rowNumber = mappedRow.row_number || index + 1;

    try {
      const lead = normalizeLeadPayload(mappedRow);
      validateLeadPayload(lead);
      validRows.push({ mappedRow, rowNumber });
    } catch (error) {
      errors.push({
        row: rowNumber,
        field: error.field || null,
        message: error.message || "Validation failed.",
        phase: "validation",
      });
    }
  }

  // If any validation errors, return immediately — nothing inserted
  if (errors.length) {
    return {
      imported: 0,
      failed: errors.length,
      items: [],
      errors,
      lead_ids: [],
      aborted: true,
      message: `Import aborted: ${errors.length} row(s) failed validation. Fix errors and retry.`,
    };
  }

  // All rows valid — insert inside a single transaction for atomicity
  const imported = [];
  const insertErrors = [];

  try {
    await db.withTransaction(async (transaction) => {
      for (const { mappedRow, rowNumber } of validRows) {
        try {
          const createdLead = await createLead(auth, mappedRow);
          imported.push({
            row: rowNumber,
            lead_id: createdLead.lead_id,
            company_id: createdLead.company_id,
          });
        } catch (error) {
          insertErrors.push({
            row: rowNumber,
            field: null,
            message: error.message || "Lead insert failed.",
            phase: "insert",
          });
          // Throw to rollback the entire transaction
          throw error;
        }
      }
    });
  } catch (_transactionError) {
    // Transaction rolled back — report the first insert error
    return {
      imported: 0,
      failed: insertErrors.length || 1,
      items: [],
      errors: insertErrors.length ? insertErrors : [{ row: null, message: "Transaction failed. No leads were imported.", phase: "insert" }],
      lead_ids: [],
      aborted: true,
      message: "Import rolled back due to an error. No leads were saved.",
    };
  }

  return {
    imported: imported.length,
    failed: 0,
    items: imported,
    errors: [],
    lead_ids: imported.map((item) => item.lead_id),
    aborted: false,
    message: `Successfully imported ${imported.length} lead(s).`,
  };
}

async function convertLeadToCustomer(auth, leadId) {
  const customerService = require("./customerService");
  const customerRepository = require("../repositories/customerRepository");
  const lead = await getLeadRecord(auth, leadId);

  if (lead.status !== "closed-won") {
    throw new AppError("Only closed-won leads can be converted to customers.", 400);
  }

  if (lead.converted_to_customer_id) {
    throw new AppError("This lead has already been converted to a customer.", 400);
  }

  // Check for duplicate customer by email or company name
  const existingCustomer = await customerRepository.findDuplicateCustomer(
    lead.company_id,
    lead.email,
    lead.company_name
  );

  if (existingCustomer) {
    const ownerInfo = existingCustomer.assigned_to_name 
      ? `${existingCustomer.assigned_to_name} (${existingCustomer.assigned_to_email || 'No email'})`
      : 'the assigned owner';
    
    throw new AppError(
      `A customer with this email or company name already exists. Please contact ${ownerInfo} to view this customer.`,
      409,
      {
        duplicate: true,
        existing_customer_id: existingCustomer.customer_id,
        assigned_to_name: existingCustomer.assigned_to_name,
        assigned_to_email: existingCustomer.assigned_to_email,
      }
    );
  }

  return db.withTransaction(async (transaction) => {
    const customerPayload = {
      company_id: lead.company_id,
      name: lead.contact_person,
      company_name: lead.company_name,
      email: lead.email,
      phone: lead.phone,
      team_id: lead.team_id,
      assigned_to: lead.assigned_to,
      product_id: lead.product_id,
      total_value: lead.estimated_value || 0,
      converted_from_lead_id: lead.lead_id,
      onboarding_status: "pending",
      status: "active",
      notes: lead.requirements || null,
    };

    const customer = await customerService.createCustomer(auth, customerPayload);

    await leadRepository.updateLead(
      lead.lead_id,
      lead.company_id,
      { converted_to_customer_id: customer.customer_id },
      transaction
    );

    await leadRepository.createActivity(
      {
        activity_id: await createPrefixedId("act"),
        company_id: lead.company_id,
        lead_id: lead.lead_id,
        type: "converted",
        description: `Lead converted to customer: ${customer.company_name}`,
        created_by: auth.userId,
      },
      transaction
    );

    await auditRepository.createLog(
      {
        audit_id: await createPrefixedId("aud"),
        company_id: lead.company_id,
        entity_type: "lead",
        entity_id: lead.lead_id,
        action: "lead.converted_to_customer",
        performed_by: auth.userId,
        details: {
          customer_id: customer.customer_id,
          customer_name: customer.company_name,
        },
      },
      transaction
    );

    return {
      customer,
      lead_id: lead.lead_id,
      message: "Lead successfully converted to customer",
    };
  });
}

module.exports = {
  addLeadActivity,
  addLeadNote,
  assignLead,
  bulkAssignLeads,
  bulkUpload,
  convertLeadToCustomer,
  createLead,
  deleteLead,
  getLead,
  getLeadAssignments,
  getProductStats,
  getUserProductHistory,
  listLeadDocuments,
  listLeadActivities,
  listLeadNotes,
  listLeads,
  listMyLeads,
  listReminders,
  removeLeadAssignment,
  updateLead,
  updateLeadAssignments,
  uploadLeadDocument,
};

