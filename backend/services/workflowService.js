const db = require("../db/connection");
const workflowRepository = require("../repositories/workflowRepository");
const leadRepository = require("../repositories/leadRepository");
const userRepository = require("../repositories/userRepository");
const auditRepository = require("../repositories/auditRepository");
const { ROLES } = require("../constants/roles");
const { createPrefixedId } = require("../utils/ids");
const { buildPaginatedResult, parsePagination } = require("../utils/pagination");
const AppError = require("../utils/appError");
const { assertCompanyAccess } = require("../utils/tenant");

async function getWorkflowLead(auth, leadId) {
  const lead = await leadRepository.getLeadById(leadId, auth.companyId);
  if (!lead) {
    throw new AppError("Lead not found.", 404);
  }

  assertCompanyAccess(auth, lead.company_id);
  return lead;
}

async function listMyAssigned(auth, query) {
  const pagination = parsePagination(query);
  const stage =
    auth.role === ROLES.LEGAL_TEAM
      ? "legal"
      : auth.role === ROLES.FINANCE_TEAM
        ? "finance"
        : query.stage || query.workflow_stage || null;

  const { rows, total } = await workflowRepository.listWorkflowLeads(
    {
      companyId: auth.role === ROLES.SUPER_ADMIN ? query.company_id || auth.companyId : auth.companyId,
      stage,
      assignedUserId:
        [ROLES.LEGAL_TEAM, ROLES.FINANCE_TEAM, ROLES.SALES].includes(auth.role) ? auth.userId : query.assigned_to || null,
      pagination,
    }
  );

  return buildPaginatedResult(rows, total, pagination);
}

async function getTracker(auth, query) {
  if (![ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER].includes(auth.role)) {
    throw new AppError("Only managers and admins can access workflow tracker.", 403);
  }

  const pagination = parsePagination(query);
  const { rows, total } = await workflowRepository.listWorkflowLeads(
    {
      companyId: auth.role === ROLES.SUPER_ADMIN ? query.company_id || auth.companyId : auth.companyId,
      stage: query.stage || query.workflow_stage || null,
      assignedUserId: query.assigned_to || null,
      pagination,
    }
  );

  return buildPaginatedResult(rows, total, pagination);
}

async function getMyHistory(auth, query) {
  const pagination = parsePagination(query);
  const { rows, total } = await workflowRepository.listTransferHistory({
    companyId: auth.companyId,
    userId: auth.userId,
    pagination,
  });
  return buildPaginatedResult(rows, total, pagination);
}

async function listUsersByRole(auth, role) {
  if (![ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.LEGAL_TEAM, ROLES.FINANCE_TEAM].includes(auth.role)) {
    throw new AppError("You cannot access workflow user lists.", 403);
  }

  const users = await userRepository.listUsersByRole(auth.companyId, role);
  return users;
}

async function moveLead(auth, leadId, toStage, assignedUserId, extraUpdates = {}, notes = null) {
  const lead = await getWorkflowLead(auth, leadId);
  if (lead.workflow_stage === toStage) {
    throw new AppError("Lead is already in this workflow stage.", 400);
  }

  if (assignedUserId) {
    const assignee = await userRepository.getUserInCompany(assignedUserId, lead.company_id);
    if (!assignee) {
      throw new AppError("Assigned workflow owner must belong to the same company.", 400);
    }
  }

  return db.withTransaction(async (transaction) => {
    const updates = {
      workflow_stage: toStage,
      assigned_to: assignedUserId || lead.assigned_to,
      assigned_by: auth.userId,
      assigned_at: new Date(),
      ...extraUpdates,
    };

    if (toStage === "legal") {
      updates.assigned_to_legal = assignedUserId || lead.assigned_to_legal || lead.assigned_to;
      updates.agreement_status = extraUpdates.agreement_status || "pending";
    }

    if (toStage === "finance") {
      updates.assigned_to_finance = assignedUserId || lead.assigned_to_finance || lead.assigned_to;
      updates.agreement_status = extraUpdates.agreement_status || "approved";
      updates.legal_approved_at = new Date();
      updates.legal_approved_by = auth.userId;
    }

    await leadRepository.updateLead(lead.lead_id, lead.company_id, updates, transaction);
    await workflowRepository.closeOpenStageHistory(lead.lead_id, lead.company_id, transaction);
    await workflowRepository.addStageHistory(lead.lead_id, lead.company_id, toStage, transaction);
    await workflowRepository.createTransferHistory(
      {
        lead_id: lead.lead_id,
        company_id: lead.company_id,
        from_stage: lead.workflow_stage,
        to_stage: toStage,
        transferred_by: auth.userId,
        transferred_to: assignedUserId || null,
        notes,
      },
      transaction
    );
    await leadRepository.createActivity(
      {
        activity_id: await createPrefixedId("act"),
        company_id: lead.company_id,
        lead_id: lead.lead_id,
        type: "status_changed",
        description: `Workflow moved from ${lead.workflow_stage} to ${toStage}`,
        created_by: auth.userId,
      },
      transaction
    );

    return leadRepository.getLeadById(lead.lead_id, lead.company_id, transaction);
  });
}

async function transferToLegal(auth, leadId, payload) {
  if (![ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES].includes(auth.role)) {
    throw new AppError("Your role cannot transfer leads to legal.", 403);
  }

  const updatedLead = await moveLead(auth, leadId, "legal", payload.assigned_to || null, {}, payload.notes || null);
  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: updatedLead.company_id,
    action: "workflow.transfer_to_legal",
    performed_by: auth.userId,
    target_user: updatedLead.assigned_to_legal || updatedLead.assigned_to,
    user_email: auth.email,
    user_role: auth.role,
    details: { lead_id: updatedLead.lead_id },
  });
  return updatedLead;
}

async function transferToFinance(auth, leadId, payload) {
  if (![ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LEGAL_TEAM].includes(auth.role)) {
    throw new AppError("Your role cannot transfer leads to finance.", 403);
  }

  const updatedLead = await moveLead(
    auth,
    leadId,
    "finance",
    payload.assigned_to || null,
    {
      agreement_status: payload.agreement_status || "approved",
    },
    payload.notes || null
  );
  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: updatedLead.company_id,
    action: "workflow.transfer_to_finance",
    performed_by: auth.userId,
    target_user: updatedLead.assigned_to_finance || updatedLead.assigned_to,
    user_email: auth.email,
    user_role: auth.role,
    details: { lead_id: updatedLead.lead_id },
  });
  return updatedLead;
}

async function completeWorkflow(auth, leadId, payload) {
  if (![ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.FINANCE_TEAM].includes(auth.role)) {
    throw new AppError("Your role cannot complete workflow.", 403);
  }

  const updatedLead = await moveLead(
    auth,
    leadId,
    "completed",
    payload.assigned_to || null,
    {
      status: payload.status || "closed-won",
      invoice_number: payload.invoice_number || null,
      invoice_amount: payload.invoice_amount || null,
      tax_invoice_number: payload.tax_invoice_number || null,
    },
    payload.notes || null
  );

  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: updatedLead.company_id,
    action: "workflow.completed",
    performed_by: auth.userId,
    target_user: updatedLead.assigned_to,
    user_email: auth.email,
    user_role: auth.role,
    details: { lead_id: updatedLead.lead_id },
  });
  return updatedLead;
}

async function uploadLegalDocument(auth, leadId, payload) {
  const lead = await getWorkflowLead(auth, leadId);
  if (!payload.file_name || !payload.file_url) {
    throw new AppError("file_name and file_url are required.");
  }

  await workflowRepository.createLegalDocument({
    company_id: lead.company_id,
    lead_id: lead.lead_id,
    file_name: payload.file_name,
    file_url: payload.file_url,
    file_size: payload.file_size || null,
    uploaded_by: auth.userId,
    document_type: payload.document_type || "agreement",
  });

  return { uploaded: true };
}

async function uploadFinanceDocument(auth, leadId, payload) {
  const lead = await getWorkflowLead(auth, leadId);
  if (!payload.file_name || !payload.file_url) {
    throw new AppError("file_name and file_url are required.");
  }

  await workflowRepository.createFinanceDocument({
    company_id: lead.company_id,
    lead_id: lead.lead_id,
    file_name: payload.file_name,
    file_url: payload.file_url,
    file_size: payload.file_size || null,
    uploaded_by: auth.userId,
    document_type: payload.document_type || "invoice",
  });

  return { uploaded: true };
}

async function deleteLegalDocument(auth, leadId, docId) {
  const lead = await getWorkflowLead(auth, leadId);
  await workflowRepository.deleteLegalDocument(docId, lead.company_id, lead.lead_id);
  return { deleted: true };
}

async function deleteFinanceDocument(auth, leadId, docId) {
  const lead = await getWorkflowLead(auth, leadId);
  await workflowRepository.deleteFinanceDocument(docId, lead.company_id, lead.lead_id);
  return { deleted: true };
}

async function sendDocumentEmail(auth, payload) {
  if (!payload.to || !payload.subject) {
    throw new AppError("Recipient and subject are required.");
  }

  return {
    sent: true,
    delivery: "preview",
    to: payload.to,
    subject: payload.subject,
    message: payload.message || "",
  };
}

module.exports = {
  completeWorkflow,
  deleteFinanceDocument,
  deleteLegalDocument,
  getMyHistory,
  getTracker,
  listMyAssigned,
  listUsersByRole,
  sendDocumentEmail,
  transferToFinance,
  transferToLegal,
  uploadFinanceDocument,
  uploadLegalDocument,
};
