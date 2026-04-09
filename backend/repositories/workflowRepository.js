const db = require("../db/connection");

function getExecutor(executor) {
  return executor || db;
}

async function listWorkflowLeads({ companyId, companyIds = null, stage, assignedUserId, pagination }, executor) {
  const active = getExecutor(executor);
  const conditions = ["l.is_active = 1"];
  const params = [];

  if (companyId) {
    conditions.push("l.company_id = ?");
    params.push(companyId);
  } else if (Array.isArray(companyIds)) {
    if (!companyIds.length) {
      conditions.push("1 = 0");
    } else {
      conditions.push(`l.company_id IN (${companyIds.map(() => "?").join(", ")})`);
      params.push(...companyIds);
    }
  }

  if (stage) {
    conditions.push("l.workflow_stage = ?");
    params.push(stage);
  }

  if (assignedUserId) {
    if (stage === "legal") {
      conditions.push("(l.assigned_to_legal = ? OR l.assigned_to = ?)");
      params.push(assignedUserId, assignedUserId);
    } else if (stage === "finance") {
      conditions.push("(l.assigned_to_finance = ? OR l.assigned_to = ?)");
      params.push(assignedUserId, assignedUserId);
    } else {
      conditions.push("l.assigned_to = ?");
      params.push(assignedUserId);
    }
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const [countRows] = await active.query(
    `SELECT COUNT(*) AS total FROM leads l ${whereClause}`,
    params
  );
  const [rows] = await active.query(
    `
      SELECT
        l.*,
        creator.name AS created_by_name,
        assignee.name AS assigned_to_name,
        legal_user.name AS legal_owner_name,
        finance_user.name AS finance_owner_name,
        (
          SELECT COUNT(*)
          FROM lead_legal_documents d
          WHERE d.company_id = l.company_id AND d.lead_id = l.lead_id
        ) AS legal_doc_count,
        (
          SELECT COUNT(*)
          FROM lead_finance_documents d
          WHERE d.company_id = l.company_id AND d.lead_id = l.lead_id
        ) AS finance_doc_count
        ,
        (
          SELECT COUNT(*)
          FROM lead_legal_documents d
          WHERE d.company_id = l.company_id AND d.lead_id = l.lead_id
        ) +
        (
          SELECT COUNT(*)
          FROM lead_finance_documents d
          WHERE d.company_id = l.company_id AND d.lead_id = l.lead_id
        ) AS doc_count
      FROM leads l
      LEFT JOIN users creator ON creator.user_id = l.created_by
      LEFT JOIN users assignee ON assignee.user_id = l.assigned_to
      LEFT JOIN users legal_user ON legal_user.user_id = l.assigned_to_legal
      LEFT JOIN users finance_user ON finance_user.user_id = l.assigned_to_finance
      ${whereClause}
      ORDER BY l.updated_at DESC
      OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `,
    [...params, pagination.offset, pagination.limit]
  );

  return {
    rows,
    total: countRows[0].total,
  };
}

async function listTransferHistory({ companyId, userId, pagination }, executor) {
  const active = getExecutor(executor);
  const [countRows] = await active.query(
    `
      SELECT COUNT(*) AS total
      FROM lead_transfer_history
      WHERE company_id = ? AND (transferred_by = ? OR transferred_to = ?)
    `,
    [companyId, userId, userId]
  );
  const [rows] = await active.query(
    `
      SELECT
        h.*,
        l.company_name,
        l.contact_person
      FROM lead_transfer_history h
      INNER JOIN leads l ON l.lead_id = h.lead_id
      WHERE h.company_id = ? AND (h.transferred_by = ? OR h.transferred_to = ?)
      ORDER BY h.transferred_at DESC
      OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `,
    [companyId, userId, userId, pagination.offset, pagination.limit]
  );

  return {
    rows,
    total: countRows[0].total,
  };
}

async function createTransferHistory(entry, executor) {
  const active = getExecutor(executor);
  await active.query(
    `
      INSERT INTO lead_transfer_history
        (lead_id, company_id, from_stage, to_stage, transferred_by, transferred_to, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      entry.lead_id,
      entry.company_id,
      entry.from_stage,
      entry.to_stage,
      entry.transferred_by,
      entry.transferred_to || null,
      entry.notes || null,
    ]
  );
}

async function closeOpenStageHistory(leadId, companyId, executor) {
  const active = getExecutor(executor);
  await active.query(
    `
      UPDATE lead_stage_history
      SET
        exited_at = GETDATE(),
        duration = DATEDIFF(MINUTE, entered_at, GETDATE())
      WHERE lead_id = ? AND company_id = ? AND exited_at IS NULL
    `,
    [leadId, companyId]
  );
}

async function addStageHistory(leadId, companyId, stage, executor) {
  const active = getExecutor(executor);
  await active.query(
    `
      INSERT INTO lead_stage_history (lead_id, company_id, stage, entered_at)
      VALUES (?, ?, ?, GETDATE())
    `,
    [leadId, companyId, stage]
  );
}

async function createLegalDocument(document, executor) {
  const active = getExecutor(executor);
  await active.query(
    `
      INSERT INTO lead_legal_documents
        (company_id, lead_id, file_name, file_url, file_size, uploaded_by, document_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      document.company_id,
      document.lead_id,
      document.file_name,
      document.file_url,
      document.file_size || null,
      document.uploaded_by,
      document.document_type || "agreement",
    ]
  );
}

async function createFinanceDocument(document, executor) {
  const active = getExecutor(executor);
  await active.query(
    `
      INSERT INTO lead_finance_documents
        (company_id, lead_id, file_name, file_url, file_size, uploaded_by, document_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      document.company_id,
      document.lead_id,
      document.file_name,
      document.file_url,
      document.file_size || null,
      document.uploaded_by,
      document.document_type || "invoice",
    ]
  );
}

async function deleteLegalDocument(id, companyId, leadId, executor) {
  const active = getExecutor(executor);
  await active.query(
    "DELETE FROM lead_legal_documents WHERE id = ? AND company_id = ? AND lead_id = ?",
    [id, companyId, leadId]
  );
}

async function deleteFinanceDocument(id, companyId, leadId, executor) {
  const active = getExecutor(executor);
  await active.query(
    "DELETE FROM lead_finance_documents WHERE id = ? AND company_id = ? AND lead_id = ?",
    [id, companyId, leadId]
  );
}

async function listLegalDocumentsByLead(leadId, companyId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    `
      SELECT
        d.*,
        u.name AS uploaded_by_name
      FROM lead_legal_documents d
      LEFT JOIN users u ON u.user_id = d.uploaded_by
      WHERE d.lead_id = ? AND d.company_id = ?
      ORDER BY d.uploaded_at DESC, d.id DESC
    `,
    [leadId, companyId]
  );

  return rows;
}

async function listFinanceDocumentsByLead(leadId, companyId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    `
      SELECT
        d.*,
        u.name AS uploaded_by_name
      FROM lead_finance_documents d
      LEFT JOIN users u ON u.user_id = d.uploaded_by
      WHERE d.lead_id = ? AND d.company_id = ?
      ORDER BY d.uploaded_at DESC, d.id DESC
    `,
    [leadId, companyId]
  );

  return rows;
}

async function listStageHistoryByLead(leadId, companyId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    `
      SELECT
        stage,
        entered_at,
        exited_at,
        duration
      FROM lead_stage_history
      WHERE lead_id = ? AND company_id = ?
      ORDER BY entered_at ASC, id ASC
    `,
    [leadId, companyId]
  );

  return rows;
}

async function listTransferHistoryByLead(leadId, companyId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    `
      SELECT
        h.*,
        by_user.name AS transferred_by_name,
        to_user.name AS transferred_to_name
      FROM lead_transfer_history h
      LEFT JOIN users by_user ON by_user.user_id = h.transferred_by
      LEFT JOIN users to_user ON to_user.user_id = h.transferred_to
      WHERE h.lead_id = ? AND h.company_id = ?
      ORDER BY h.transferred_at DESC, h.id DESC
    `,
    [leadId, companyId]
  );

  return rows;
}

module.exports = {
  addStageHistory,
  closeOpenStageHistory,
  createFinanceDocument,
  createLegalDocument,
  createTransferHistory,
  deleteFinanceDocument,
  deleteLegalDocument,
  listFinanceDocumentsByLead,
  listLegalDocumentsByLead,
  listStageHistoryByLead,
  listTransferHistory,
  listTransferHistoryByLead,
  listWorkflowLeads,
};
