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
  // Check if member already exists (active or inactive)
  const [existing] = await active.query(
    `SELECT TOP 1 id, is_active FROM customer_members WHERE customer_id = ? AND user_id = ?`,
    [data.customer_id, data.user_id]
  );

  if (existing.length) {
    // Re-activate if previously removed
    await active.query(
      `UPDATE customer_members SET is_active = 1, role = ?, added_by = ? WHERE customer_id = ? AND user_id = ?`,
      [data.role || "collaborator", data.added_by || null, data.customer_id, data.user_id]
    );
  } else {
    await active.query(
      `INSERT INTO customer_members (company_id, customer_id, user_id, role, added_by, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [data.company_id, data.customer_id, data.user_id, data.role || "collaborator", data.added_by || null]
    );
  }

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
