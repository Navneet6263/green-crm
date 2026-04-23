const db = require("../db/connection");

const SHARED_ACCESS_TYPE = "shared";
const SQL_NOW = "SYSUTCDATETIME()";

function getExecutor(executor) {
  return executor || db;
}

function normalizeUserIds(userIds = []) {
  return [...new Set((Array.isArray(userIds) ? userIds : [userIds]).map((value) => String(value || "").trim()).filter(Boolean))];
}

function buildLeadUserAccessPredicate({
  companyColumn = "l.company_id",
  leadColumn = "l.lead_id",
  leadAlias = "l",
  primaryColumns = ["assigned_to"],
  userId = null,
} = {}) {
  if (!userId) {
    return {
      clause: "",
      params: [],
    };
  }

  const normalizedPrimaryColumns = [...new Set((Array.isArray(primaryColumns) ? primaryColumns : [primaryColumns]).map((value) => String(value || "").trim()).filter(Boolean))];
  const primaryPredicates = normalizedPrimaryColumns.map((column) => `${leadAlias}.${column} = ?`);
  const predicates = [
    ...primaryPredicates,
    `EXISTS (
      SELECT 1
      FROM lead_assignments la
      WHERE la.company_id = ${companyColumn}
        AND la.lead_id = ${leadColumn}
        AND la.user_id = ?
        AND la.access_type = ?
    )`,
  ];

  return {
    clause: `(${predicates.join(" OR ")})`,
    params: [
      ...normalizedPrimaryColumns.map(() => userId),
      userId,
      SHARED_ACCESS_TYPE,
    ],
  };
}

async function listSharedUsersByLead(leadId, companyId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    `
      SELECT
        la.user_id,
        la.access_type,
        la.created_at,
        la.updated_at,
        u.name,
        u.email,
        u.role,
        u.department,
        u.is_active
      FROM lead_assignments la
      LEFT JOIN users u
        ON u.company_id = la.company_id
       AND u.user_id = la.user_id
      WHERE la.lead_id = ?
        AND la.company_id = ?
        AND la.access_type = ?
      ORDER BY COALESCE(u.name, la.user_id) ASC, la.created_at ASC
    `,
    [leadId, companyId, SHARED_ACCESS_TYPE]
  );

  return rows;
}

async function hasSharedUserAccess(leadId, companyId, userId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    `
      SELECT TOP 1 1 AS allowed
      FROM lead_assignments
      WHERE lead_id = ?
        AND company_id = ?
        AND user_id = ?
        AND access_type = ?
    `,
    [leadId, companyId, userId, SHARED_ACCESS_TYPE]
  );

  return Boolean(rows[0]?.allowed);
}

async function removeSharedUserAccess(leadId, companyId, userId, executor) {
  const active = getExecutor(executor);
  await active.query(
    `
      DELETE FROM lead_assignments
      WHERE lead_id = ?
        AND company_id = ?
        AND user_id = ?
        AND access_type = ?
    `,
    [leadId, companyId, userId, SHARED_ACCESS_TYPE]
  );
}

async function replaceSharedUsers(leadId, companyId, userIds, actorUserId, executor) {
  const active = getExecutor(executor);
  const nextUserIds = normalizeUserIds(userIds);
  const currentRows = await listSharedUsersByLead(leadId, companyId, active);
  const currentUserIds = currentRows.map((row) => row.user_id);
  const toDelete = currentUserIds.filter((userId) => !nextUserIds.includes(userId));
  const toInsert = nextUserIds.filter((userId) => !currentUserIds.includes(userId));

  if (toDelete.length) {
    await active.query(
      `
        DELETE FROM lead_assignments
        WHERE lead_id = ?
          AND company_id = ?
          AND access_type = ?
          AND user_id IN (${toDelete.map(() => "?").join(", ")})
      `,
      [leadId, companyId, SHARED_ACCESS_TYPE, ...toDelete]
    );
  }

  for (const userId of toInsert) {
    await active.query(
      `
        INSERT INTO lead_assignments (
          lead_id,
          company_id,
          user_id,
          access_type,
          created_by,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ${SQL_NOW}, ${SQL_NOW})
      `,
      [leadId, companyId, userId, SHARED_ACCESS_TYPE, actorUserId || null]
    );
  }

  return {
    addedUserIds: toInsert,
    removedUserIds: toDelete,
    rows: await listSharedUsersByLead(leadId, companyId, active),
  };
}

module.exports = {
  SHARED_ACCESS_TYPE,
  buildLeadUserAccessPredicate,
  hasSharedUserAccess,
  listSharedUsersByLead,
  removeSharedUserAccess,
  replaceSharedUsers,
};
