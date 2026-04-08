const db = require("../db/connection");

function getExecutor(executor) {
  return executor || db;
}

async function listNotifications({ companyId, userId, unreadOnly, pagination }, executor) {
  const active = getExecutor(executor);
  const conditions = ["company_id = ?"];
  const params = [companyId];

  if (userId) {
    conditions.push("user_id = ?");
    params.push(userId);
  }

  if (unreadOnly) {
    conditions.push("is_read = 0");
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const [countRows] = await active.query(
    `SELECT COUNT(*) AS total FROM notifications ${whereClause}`,
    params
  );
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

  return {
    rows,
    total: countRows[0].total,
  };
}

async function getNotificationById(notifId, companyId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    "SELECT TOP 1 * FROM notifications WHERE notif_id = ? AND company_id = ?",
    [notifId, companyId]
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
