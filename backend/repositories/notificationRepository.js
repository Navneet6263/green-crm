const db = require("../db/connection");

function getExecutor(executor) {
  return executor || db;
}

function inferTotalFromPage(rows, pagination) {
  if (pagination.page === 1 && rows.length < pagination.limit) {
    return rows.length;
  }

  return null;
}

async function listNotifications({ companyId, companyIds = null, userId, unreadOnly, pagination }, executor) {
  const active = getExecutor(executor);
  const conditions = [];
  const params = [];

  if (companyId) {
    conditions.push("company_id = ?");
    params.push(companyId);
  } else if (Array.isArray(companyIds)) {
    if (!companyIds.length) {
      conditions.push("1 = 0");
    } else {
      conditions.push(`company_id IN (${companyIds.map(() => "?").join(", ")})`);
      params.push(...companyIds);
    }
  }

  if (userId) {
    conditions.push("user_id = ?");
    params.push(userId);
  }

  if (unreadOnly) {
    conditions.push("is_read = 0");
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await active.query(
    `
      SELECT *
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `,
    [...params, pagination.offset, pagination.limit]
  );

  const inferredTotal = inferTotalFromPage(rows, pagination);
  if (inferredTotal !== null) {
    return {
      rows,
      total: inferredTotal,
    };
  }

  const [countRows] = await active.query(
    `SELECT COUNT(*) AS total FROM notifications ${whereClause}`,
    params
  );

  return {
    rows,
    total: countRows[0].total,
  };
}

async function getNotificationById(notifId, companyId = null, companyIds = null, executor) {
  const active = getExecutor(executor);
  const conditions = ["notif_id = ?"];
  const params = [notifId];

  if (companyId) {
    conditions.push("company_id = ?");
    params.push(companyId);
  } else if (Array.isArray(companyIds)) {
    if (!companyIds.length) {
      conditions.push("1 = 0");
    } else {
      conditions.push(`company_id IN (${companyIds.map(() => "?").join(", ")})`);
      params.push(...companyIds);
    }
  }

  const [rows] = await active.query(
    `SELECT TOP 1 * FROM notifications WHERE ${conditions.join(" AND ")}`,
    params
  );
  return rows[0] || null;
}

async function markNotificationRead(notifId, companyId, executor) {
  const active = getExecutor(executor);
  await active.query(
    "UPDATE notifications SET is_read = 1 WHERE notif_id = ? AND company_id = ?",
    [notifId, companyId]
  );
  return getNotificationById(notifId, companyId, active);
}

module.exports = {
  getNotificationById,
  listNotifications,
  markNotificationRead,
};
