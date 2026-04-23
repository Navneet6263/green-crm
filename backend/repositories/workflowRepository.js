const db = require("../db/connection");
const { buildLeadUserAccessPredicate } = require("./leadAssignmentRepository");

const SQL_NOW = "SYSUTCDATETIME()";

function getExecutor(executor) {
  return executor || db;
}

const WORKFLOW_OWNER_SQL = `
  COALESCE(
    NULLIF(LTRIM(RTRIM(assignee.name)), ''),
    NULLIF(LTRIM(RTRIM(legal_user.name)), ''),
    NULLIF(LTRIM(RTRIM(finance_user.name)), ''),
    'Unassigned'
  )
`;

const WORKFLOW_SOURCE_SQL = "COALESCE(NULLIF(LTRIM(RTRIM(l.lead_source)), ''), 'unknown')";
const WORKFLOW_DOC_COUNT_SQL = `
  (
    SELECT COUNT(*)
    FROM lead_legal_documents d
    WHERE d.company_id = l.company_id AND d.lead_id = l.lead_id
  ) +
  (
    SELECT COUNT(*)
    FROM lead_finance_documents d
    WHERE d.company_id = l.company_id AND d.lead_id = l.lead_id
  )
`;

function buildWorkflowTrackerQuery({
  assignedUserId = null,
  companyId = null,
  companyIds = null,
  leadSource = null,
  ownerName = null,
  priority = null,
  search = "",
  stage = null,
  status = null,
  teamIds = null,
} = {}) {
  const conditions = ["l.is_active = 1"];
  const params = [];
  const joinsClause = `
    LEFT JOIN products p ON p.product_id = l.product_id
    LEFT JOIN users creator ON creator.user_id = l.created_by
    LEFT JOIN users assignee ON assignee.user_id = l.assigned_to
    LEFT JOIN users legal_user ON legal_user.user_id = l.assigned_to_legal
    LEFT JOIN users finance_user ON finance_user.user_id = l.assigned_to_finance
  `;

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

  if (teamIds) {
    if (!teamIds.length) {
      conditions.push("1 = 0");
    } else {
      conditions.push(`l.team_id IN (${teamIds.map(() => "?").join(", ")})`);
      params.push(...teamIds);
    }
  }

  if (assignedUserId) {
    const accessColumns =
      stage === "legal"
        ? ["assigned_to_legal", "assigned_to"]
        : stage === "finance"
          ? ["assigned_to_finance", "assigned_to"]
          : ["assigned_to"];
    const viewerPredicate = buildLeadUserAccessPredicate({
      leadAlias: "l",
      primaryColumns: accessColumns,
      userId: assignedUserId,
    });
    conditions.push(viewerPredicate.clause);
    params.push(...viewerPredicate.params);
  }

  if (status) {
    conditions.push("l.status = ?");
    params.push(status);
  }

  if (priority) {
    conditions.push("l.priority = ?");
    params.push(priority);
  }

  if (leadSource) {
    conditions.push(`${WORKFLOW_SOURCE_SQL} = ?`);
    params.push(leadSource);
  }

  if (ownerName) {
    conditions.push(`${WORKFLOW_OWNER_SQL} = ?`);
    params.push(ownerName);
  }

  if (search) {
    const searchValue = `%${String(search).trim()}%`;
    conditions.push(`
      (
        l.company_name LIKE ?
        OR l.contact_person LIKE ?
        OR l.email LIKE ?
        OR l.phone LIKE ?
        OR ${WORKFLOW_OWNER_SQL} LIKE ?
        OR ${WORKFLOW_SOURCE_SQL} LIKE ?
        OR COALESCE(p.name, '') LIKE ?
        OR COALESCE(l.priority, '') LIKE ?
        OR COALESCE(l.status, '') LIKE ?
        OR COALESCE(l.workflow_stage, '') LIKE ?
      )
    `);
    params.push(
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue
    );
  }

  return {
    joinsClause,
    params,
    whereClause: `WHERE ${conditions.join(" AND ")}`,
  };
}

async function listWorkflowLeads(
  {
    companyId,
    companyIds = null,
    stage,
    assignedUserId,
    teamIds = null,
    status = null,
    priority = null,
    leadSource = null,
    search = "",
    ownerName = null,
    pagination,
  },
  executor
) {
  const active = getExecutor(executor);
  const { joinsClause, whereClause, params } = buildWorkflowTrackerQuery({
    assignedUserId,
    companyId,
    companyIds,
    leadSource,
    ownerName,
    priority,
    search,
    stage,
    status,
    teamIds,
  });
  const [countRows] = await active.query(
    `SELECT COUNT(*) AS total FROM leads l ${joinsClause} ${whereClause}`,
    params
  );
  const [rows] = await active.query(
    `
      SELECT
        l.*,
        p.name AS product_name,
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
      ${joinsClause}
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

async function getWorkflowTrackerSummary(
  {
    companyId,
    companyIds = null,
    stage = null,
    assignedUserId = null,
    teamIds = null,
    status = null,
    priority = null,
    leadSource = null,
    search = "",
    ownerName = null,
  },
  executor
) {
  const active = getExecutor(executor);
  const { joinsClause, whereClause, params } = buildWorkflowTrackerQuery({
    assignedUserId,
    companyId,
    companyIds,
    leadSource,
    ownerName,
    priority,
    search,
    stage,
    status,
    teamIds,
  });

  const [rows] = await active.query(
    `
      SELECT
        COUNT(*) AS filtered_count,
        COALESCE(SUM(COALESCE(l.invoice_amount, l.estimated_value, 0)), 0) AS total_value,
        SUM(CASE WHEN l.follow_up_date IS NOT NULL AND l.follow_up_date < ${SQL_NOW} THEN 1 ELSE 0 END) AS overdue,
        SUM(CASE WHEN l.status = 'closed-won' AND COALESCE(l.workflow_stage, 'sales') = 'sales' THEN 1 ELSE 0 END) AS ready_for_legal,
        SUM(CASE WHEN l.workflow_stage = 'legal' THEN 1 ELSE 0 END) AS legal_queue,
        SUM(CASE WHEN l.workflow_stage = 'finance' THEN 1 ELSE 0 END) AS finance_queue,
        SUM(CASE WHEN (l.assigned_to IS NULL AND l.assigned_to_legal IS NULL AND l.assigned_to_finance IS NULL) THEN 1 ELSE 0 END) AS no_owner,
        SUM(
          CASE
            WHEN l.workflow_stage IN ('legal', 'finance') AND (${WORKFLOW_DOC_COUNT_SQL}) = 0
              THEN 1
            ELSE 0
          END
        ) AS doc_gap
      FROM leads l
      ${joinsClause}
      ${whereClause}
    `,
    params
  );

  return rows[0] || {
    filtered_count: 0,
    total_value: 0,
    overdue: 0,
    ready_for_legal: 0,
    legal_queue: 0,
    finance_queue: 0,
    no_owner: 0,
    doc_gap: 0,
  };
}

async function listWorkflowTrackerFilterOptions(
  {
    companyId = null,
    companyIds = null,
    teamIds = null,
  },
  executor
) {
  const active = getExecutor(executor);
  const { joinsClause, whereClause, params } = buildWorkflowTrackerQuery({
    companyId,
    companyIds,
    teamIds,
  });

  const [ownerRows, sourceRows] = await Promise.all([
    active.query(
      `
        SELECT DISTINCT ${WORKFLOW_OWNER_SQL} AS value
        FROM leads l
        ${joinsClause}
        ${whereClause}
        ORDER BY value ASC
      `,
      params
    ),
    active.query(
      `
        SELECT DISTINCT ${WORKFLOW_SOURCE_SQL} AS value
        FROM leads l
        ${joinsClause}
        ${whereClause}
        ORDER BY value ASC
      `,
      params
    ),
  ]);

  return {
    owners: (ownerRows[0] || []).map((row) => row.value).filter(Boolean),
    sources: (sourceRows[0] || []).map((row) => row.value).filter(Boolean),
  };
}

async function listTransferHistory({ companyId, userId, teamIds = null, pagination }, executor) {
  const active = getExecutor(executor);
  const teamClause = teamIds
    ? teamIds.length
      ? ` AND l.team_id IN (${teamIds.map(() => "?").join(", ")})`
      : " AND 1 = 0"
    : "";
  const [countRows] = await active.query(
    `
      SELECT COUNT(*) AS total
      FROM lead_transfer_history h
      INNER JOIN leads l ON l.lead_id = h.lead_id AND l.company_id = h.company_id
      WHERE h.company_id = ? AND (h.transferred_by = ? OR h.transferred_to = ?)${teamClause}
    `,
    [companyId, userId, userId, ...(teamIds || [])]
  );
  const [rows] = await active.query(
    `
      SELECT
        h.*,
        l.company_name,
        l.contact_person
      FROM lead_transfer_history h
      INNER JOIN leads l ON l.lead_id = h.lead_id AND l.company_id = h.company_id
      WHERE h.company_id = ? AND (h.transferred_by = ? OR h.transferred_to = ?)${teamClause}
      ORDER BY h.transferred_at DESC
      OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `,
    [companyId, userId, userId, ...(teamIds || []), pagination.offset, pagination.limit]
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
        exited_at = ${SQL_NOW},
        duration = DATEDIFF(MINUTE, entered_at, ${SQL_NOW})
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
      VALUES (?, ?, ?, ${SQL_NOW})
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
  getWorkflowTrackerSummary,
  listFinanceDocumentsByLead,
  listLegalDocumentsByLead,
  listStageHistoryByLead,
  listTransferHistory,
  listTransferHistoryByLead,
  listWorkflowLeads,
  listWorkflowTrackerFilterOptions,
};
