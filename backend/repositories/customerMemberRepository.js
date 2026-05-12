const db = require("../db/connection");

function getExecutor(executor) {
  return executor || db;
}

async function listMembers(customerId, companyId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    `SELECT cm.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
     FROM customer_members cm
     LEFT JOIN users u ON u.user_id = cm.user_id
     WHERE cm.customer_id = ? AND cm.company_id = ? AND cm.is_active = 1
     ORDER BY cm.created_at ASC`,
    [customerId, companyId]
  );
  return rows;
}

async function addMember(data, executor) {
  const active = getExecutor(executor);
  await active.query(
    `MERGE INTO customer_members AS target
     USING (SELECT ? AS customer_id, ? AS user_id) AS source
     ON target.customer_id = source.customer_id AND target.user_id = source.user_id
     WHEN MATCHED THEN UPDATE SET is_active = 1, role = ?
     WHEN NOT MATCHED THEN INSERT (company_id, customer_id, user_id, role, added_by)
       VALUES (?, ?, ?, ?, ?);`,
    [data.customer_id, data.user_id, data.role || "collaborator", data.company_id, data.customer_id, data.user_id, data.role || "collaborator", data.added_by || null]
  );
  return { added: true };
}

async function removeMember(customerId, userId, executor) {
  const active = getExecutor(executor);
  await active.query(
    `UPDATE customer_members SET is_active = 0 WHERE customer_id = ? AND user_id = ?`,
    [customerId, userId]
  );
  return { removed: true };
}

module.exports = { listMembers, addMember, removeMember };
