const db = require("../db/connection");
const companyRepository = require("../repositories/companyRepository");
const userRepository = require("../repositories/userRepository");
const productRepository = require("../repositories/productRepository");
const leadRepository = require("../repositories/leadRepository");
const workflowRepository = require("../repositories/workflowRepository");
const auditRepository = require("../repositories/auditRepository");
const { LEAD_ACTIVITY_TYPES, LEAD_PRIORITIES, LEAD_STATUSES } = require("../constants/lead");
const { LEAD_CREATOR_ROLES, MANAGER_ROLES, ROLES } = require("../constants/roles");
const { parseCsv } = require("../utils/csv");
const { buildPaginatedResult, parsePagination } = require("../utils/pagination");
const { createPrefixedId } = require("../utils/ids");
const AppError = require("../utils/appError");
const { assertCompanyAccess, getAccessibleCompanyIds, isManagerRole, isPlatformOperatorRole } = require("../utils/tenant");

const INVALID_LEAD_DATE = Symbol("invalid_lead_date");

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
    product_id: payload.product_id || null,
    requirements: payload.requirements || payload.notes || null,
    workflow_stage: String(payload.workflow_stage || "sales").toLowerCase(),
    assigned_to: payload.assigned_to || null,
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
  if (!lead.contact_person || !lead.company_name || !lead.phone) {
    throw new AppError("Contact person, company name, and phone are required.");
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

async function assertLeadAccess(auth, lead) {
  if (!lead) {
    throw new AppError("Lead not found.", 404);
  }

  assertCompanyAccess(auth, lead.company_id);

  if (auth.role === ROLES.SALES && lead.assigned_to !== auth.userId) {
    throw new AppError("Sales users can only access leads assigned to them.", 403);
  }

  if (auth.role === ROLES.MARKETING && lead.assigned_to !== auth.userId) {
    throw new AppError("Marketing users can only access leads assigned to them.", 403);
  }

  if (auth.role === ROLES.LEGAL_TEAM && lead.workflow_stage !== "legal") {
    throw new AppError("Legal team can only access legal stage leads.", 403);
  }

  if (auth.role === ROLES.FINANCE_TEAM && lead.workflow_stage !== "finance") {
    throw new AppError("Finance team can only access finance stage leads.", 403);
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

function buildLeadFilters(auth, query) {
  const filters = {
    companyId: null,
    companyIds: null,
    status: query.status || null,
    quickFilter: query.quick_filter || query.quickFilter || null,
    priority: query.priority || null,
    search: query.search || "",
    workflowStage: query.workflow_stage || null,
    productId: query.product_id || null,
  };

  if (auth.role === ROLES.SUPER_ADMIN) {
    filters.companyId = query.company_id || null;
    filters.assignedTo = query.assigned_to || null;
    filters.createdBy = query.created_by || null;
    return filters;
  }

  if (isPlatformOperatorRole(auth.role)) {
    filters.companyId = query.company_id || null;
    filters.companyIds = filters.companyId ? null : getAccessibleCompanyIds(auth);
    filters.assignedTo = query.assigned_to || null;
    filters.createdBy = query.created_by || null;
    return filters;
  }

  filters.companyId = auth.companyId;

  if (auth.role === ROLES.SALES) {
    filters.assignedTo = auth.userId;
  } else if (auth.role === ROLES.MARKETING) {
    filters.assignedTo = auth.userId;
  } else if (auth.role === ROLES.LEGAL_TEAM) {
    filters.workflowStage = "legal";
    filters.assignedTo = auth.userId;
  } else if (auth.role === ROLES.FINANCE_TEAM) {
    filters.workflowStage = "finance";
    filters.assignedTo = auth.userId;
  } else {
    filters.assignedTo = query.assigned_to || null;
    filters.createdBy = query.created_by || null;
  }

  return filters;
}

async function listLeads(auth, query) {
  const pagination = parsePagination(query);
  const filters = buildLeadFilters(auth, query);

  if (filters.companyId) {
    assertCompanyAccess(auth, filters.companyId);
  }

  const { rows, total, pageInfo } = await leadRepository.listLeads(filters, pagination);

  return buildPaginatedResult(rows, total, pagination, pageInfo);
}

async function getLead(auth, leadId) {
  const lead = await leadRepository.getLeadById(
    leadId,
    auth.role === ROLES.SUPER_ADMIN || isPlatformOperatorRole(auth.role) ? null : auth.companyId
  );

  await assertLeadAccess(auth, lead);
  const [legalDocuments, financeDocuments, stageHistory, transferHistory] = await Promise.all([
    workflowRepository.listLegalDocumentsByLead(lead.lead_id, lead.company_id),
    workflowRepository.listFinanceDocumentsByLead(lead.lead_id, lead.company_id),
    workflowRepository.listStageHistoryByLead(lead.lead_id, lead.company_id),
    workflowRepository.listTransferHistoryByLead(lead.lead_id, lead.company_id),
  ]);

  return {
    ...lead,
    legal_documents: legalDocuments,
    finance_documents: financeDocuments,
    stage_history: stageHistory,
    transfer_history: transferHistory,
    can_transfer_to_legal:
      ["super-admin", "admin", "manager", "sales"].includes(auth.role) &&
      lead.status === "closed-won" &&
      (lead.workflow_stage || "sales") === "sales",
  };
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
        assigned_to: assignedTo,
        assigned_by: auth.userId,
        created_by: auth.userId,
        product_id: lead.product_id,
        requirements: lead.requirements,
        workflow_stage: lead.workflow_stage,
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

    return createdLead;
  });
}

async function updateLead(auth, leadId, payload) {
  const lead = await getLead(auth, leadId);

  if (auth.role === ROLES.SUPPORT || auth.role === ROLES.VIEWER) {
    throw new AppError("This role cannot update lead core fields.", 403);
  }

  const normalized = normalizeLeadPayload({ ...lead, ...payload });
  validateLeadPayload(normalized);
  await ensureLeadContext(lead.company_id, normalized.product_id);

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
    product_id: normalized.product_id,
    requirements: normalized.requirements,
    workflow_stage: normalized.workflow_stage,
  };

  let assignedToOverride;

  if (payload.assigned_to) {
    if (!MANAGER_ROLES.includes(auth.role)) {
      throw new AppError("Only managers and admins can reassign leads.", 403);
    }

    updates.assigned_to = (await ensureSameCompanyUser(payload.assigned_to, lead.company_id)).user_id;
    assignedToOverride = updates.assigned_to;
    updates.assigned_by = auth.userId;
    updates.assigned_at = new Date();
  }

  const changes = buildLeadChangeSummary(lead, updates, assignedToOverride);
  if (!changes.length) {
    return lead;
  }

  const changeNote = String(payload.change_note || payload.note || "").trim();
  if (!changeNote) {
    throw new AppError("A note is required whenever a lead is changed.", 400);
  }

  return db.withTransaction(async (transaction) => {
    const updatedLead = await leadRepository.updateLead(leadId, lead.company_id, updates, transaction);

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

    return updatedLead;
  });
}

async function deleteLead(auth, leadId, payload = {}) {
  const lead = await getLead(auth, leadId);

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

  const lead = await getLead(auth, leadId);
  const assignee = await ensureSameCompanyUser(payload.assigned_to, lead.company_id);
  return updateLead(auth, leadId, {
    assigned_to: assignee.user_id,
    change_note: payload.change_note || payload.note || "",
  });
}

async function addLeadNote(auth, leadId, payload) {
  const lead = await getLead(auth, leadId);

  if (!payload.content) {
    throw new AppError("Note content is required.");
  }

  await leadRepository.createNote({
    company_id: lead.company_id,
    lead_id: leadId,
    content: String(payload.content).trim(),
    created_by: auth.userId,
  });

  return { created: true };
}

async function addLeadActivity(auth, leadId, payload) {
  const lead = await getLead(auth, leadId);
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
  const lead = await getLead(auth, leadId);
  const pagination = parsePagination(query);
  const { rows, total, pageInfo } = await leadRepository.listActivities(
    leadId,
    lead.company_id,
    pagination
  );

  return buildPaginatedResult(rows, total, pagination, pageInfo);
}

async function listLeadNotes(auth, leadId, query) {
  const lead = await getLead(auth, leadId);
  const pagination = parsePagination(query);
  const { rows, total, pageInfo } = await leadRepository.listNotes(leadId, lead.company_id, pagination);

  return buildPaginatedResult(rows, total, pagination, pageInfo);
}

async function listReminders(auth, query) {
  const pagination = parsePagination(query);
  const filters = {
    companyId: null,
    companyIds: null,
    userId: auth.role === ROLES.SALES ? auth.userId : query.user_id || null,
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
  return leadRepository.getProductStats(companyId);
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
  return leadRepository.getUserProductHistory(query.user_id || auth.userId, companyId);
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
  const imported = [];
  const errors = [];

  for (const [index, row] of rows.entries()) {
    const mappedRow = buildBulkImportLeadPayload(row, defaultCompanyId);
    const rowNumber = mappedRow.row_number || index + 1;

    try {
      const createdLead = await createLead(auth, mappedRow);

      imported.push({
        row: rowNumber,
        lead_id: createdLead.lead_id,
        company_id: createdLead.company_id,
      });
    } catch (error) {
      errors.push({
        row: rowNumber,
        message: error.message || "Lead import failed.",
      });
    }
  }

  return {
    imported: imported.length,
    failed: errors.length,
    items: imported,
    errors,
    lead_ids: imported.map((item) => item.lead_id),
  };
}

module.exports = {
  addLeadActivity,
  addLeadNote,
  assignLead,
  bulkUpload,
  createLead,
  deleteLead,
  getLead,
  getProductStats,
  getUserProductHistory,
  listLeadActivities,
  listLeadNotes,
  listLeads,
  listMyLeads,
  listReminders,
  updateLead,
};
