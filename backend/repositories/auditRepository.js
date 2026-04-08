const db = require("../db/connection");

function getExecutor(executor) {
  return executor || db;
}

async function createLog(log, executor) {
  const active = getExecutor(executor);

  await active.query(
    `
      INSERT INTO audit_logs (
        audit_id,
        company_id,
        action,
        performed_by,
        target_user,
        user_email,
        user_role,
        details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      log.audit_id,
      log.company_id || null,
      log.action,
      log.performed_by || log.actor_user_id || null,
      log.target_user || log.entity_id || null,
      log.user_email || null,
      log.user_role || null,
      log.details ? JSON.stringify(log.details) : null,
    ]
  );
}

async function listLogs({ companyId, search, action, pagination }, executor) {
  const active = getExecutor(executor);
  const conditions = [];
  const params = [];

  if (companyId) {
    conditions.push("company_id = ?");
    params.push(companyId);
  }

  if (action) {
    conditions.push("action = ?");
    params.push(action);
  }

  if (search) {
    conditions.push("(action LIKE ? OR user_email LIKE ? OR user_role LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [countRows] = await active.query(
    `SELECT COUNT(*) AS total FROM audit_logs ${whereClause}`,
    params
  );
  const [rows] = await active.query(
    `
      SELECT *
      FROM audit_logs
      ${whereClause}
      ORDER BY logged_at DESC
      OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `,
    [...params, pagination.offset, pagination.limit]
  );

  return {
    rows,
    total: countRows[0].total,
  };
}

module.exports = {
  createLog,
  listLogs,
};
