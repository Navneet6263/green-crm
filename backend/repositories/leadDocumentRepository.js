const db = require("../db/connection");

function getExecutor(executor) {
  return executor || db;
}

async function listLeadDocumentsByLead(leadId, companyId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    `
      SELECT
        d.*,
        u.name AS uploaded_by_name
      FROM lead_documents d
      LEFT JOIN users u ON u.user_id = d.uploaded_by
      WHERE d.lead_id = ? AND d.company_id = ?
      ORDER BY d.uploaded_at DESC, d.id DESC
    `,
    [leadId, companyId]
  );

  return rows;
}

async function createLeadDocument(document, executor) {
  const active = getExecutor(executor);
  await active.query(
    `
      INSERT INTO lead_documents
        (company_id, lead_id, file_name, file_url, file_size, content_type, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      document.company_id,
      document.lead_id,
      document.file_name,
      document.file_url,
      document.file_size || null,
      document.content_type || null,
      document.uploaded_by,
    ]
  );

  const [rows] = await active.query(
    `
      SELECT TOP 1
        d.*,
        u.name AS uploaded_by_name
      FROM lead_documents d
      LEFT JOIN users u ON u.user_id = d.uploaded_by
      WHERE d.company_id = ? AND d.lead_id = ?
      ORDER BY d.id DESC
    `,
    [document.company_id, document.lead_id]
  );

  return rows[0] || null;
}

async function getLeadDocumentById(documentId, leadId, companyId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    `
      SELECT TOP 1 *
      FROM lead_documents
      WHERE id = ? AND lead_id = ? AND company_id = ?
    `,
    [documentId, leadId, companyId]
  );

  return rows[0] || null;
}

async function deleteLeadDocument(documentId, leadId, companyId, executor) {
  const active = getExecutor(executor);
  await active.query(
    "DELETE FROM lead_documents WHERE id = ? AND lead_id = ? AND company_id = ?",
    [documentId, leadId, companyId]
  );
}

module.exports = {
  createLeadDocument,
  deleteLeadDocument,
  getLeadDocumentById,
  listLeadDocumentsByLead,
};
