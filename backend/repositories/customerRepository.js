const db = require("../db/connection");

function getExecutor(executor) {
  return executor || db;
}

function buildWhere(filters) {
  const conditions = ["c.is_active = 1"];
  const params = [];

  if (filters.companyId) {
    conditions.push("c.company_id = ?");
    params.push(filters.companyId);
  } else if (Array.isArray(filters.companyIds)) {
    if (!filters.companyIds.length) {
      conditions.push("1 = 0");
    } else {
      conditions.push(`c.company_id IN (${filters.companyIds.map(() => "?").join(", ")})`);
      params.push(...filters.companyIds);
    }
  }

  if (filters.assignedTo) {
    conditions.push("c.assigned_to = ?");
    params.push(filters.assignedTo);
  }

  if (filters.status) {
    conditions.push("c.status = ?");
    params.push(filters.status);
  }

  if (filters.search) {
    conditions.push("(c.name LIKE ? OR c.company_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }

  return {
    whereClause: `WHERE ${conditions.join(" AND ")}`,
    params,
  };
}

async function listCustomers(filters, pagination, executor) {
  const active = getExecutor(executor);
  const { whereClause, params } = buildWhere(filters);
  const [countRows] = await active.query(
    `SELECT COUNT(*) AS total FROM customers c ${whereClause}`,
    params
  );
  const [rows] = await active.query(
    `
      SELECT
        c.*,
        u.name AS assigned_to_name
      FROM customers c
      LEFT JOIN users u ON u.user_id = c.assigned_to
      ${whereClause}
      ORDER BY c.created_at DESC
      OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `,
    [...params, pagination.offset, pagination.limit]
  );

  return {
    rows,
    total: countRows[0].total,
  };
}

async function getCustomerById(customerId, companyId = null, executor) {
  const active = getExecutor(executor);
  const conditions = ["c.customer_id = ?", "c.is_active = 1"];
  const params = [customerId];

  if (companyId) {
    conditions.push("c.company_id = ?");
    params.push(companyId);
  }

  const [rows] = await active.query(
    `
      SELECT TOP 1
        c.*,
        u.name AS assigned_to_name
      FROM customers c
      LEFT JOIN users u ON u.user_id = c.assigned_to
      WHERE ${conditions.join(" AND ")}
    `,
    params
  );
  return rows[0] || null;
}

async function createCustomer(customer, executor) {
  const active = getExecutor(executor);
  await active.query(
    `
      INSERT INTO customers
        (customer_id, company_id, name, company_name, email, phone, converted_from_lead_id, total_value, status, assigned_to, last_interaction, next_follow_up, notes, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `,
    [
      customer.customer_id,
      customer.company_id,
      customer.name,
      customer.company_name,
      customer.email,
      customer.phone,
      customer.converted_from_lead_id || null,
      customer.total_value || 0,
      customer.status || "active",
      customer.assigned_to || null,
      customer.last_interaction || null,
      customer.next_follow_up || null,
      customer.notes || null,
    ]
  );

  return getCustomerById(customer.customer_id, customer.company_id, active);
}

async function updateCustomer(customerId, companyId, updates, executor) {
  const active = getExecutor(executor);
  const fields = [];
  const params = [];

  [
    "name",
    "company_name",
    "email",
    "phone",
    "converted_from_lead_id",
    "total_value",
    "status",
    "assigned_to",
    "last_interaction",
    "next_follow_up",
    "notes",
    "is_active",
  ].forEach((column) => {
    if (!Object.prototype.hasOwnProperty.call(updates, column)) {
      return;
    }
    fields.push(`${column} = ?`);
    params.push(updates[column]);
  });

  if (fields.length) {
    await active.query(
      `UPDATE customers SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE customer_id = ? AND company_id = ?`,
      [...params, customerId, companyId]
    );
  }

  return getCustomerById(customerId, companyId, active);
}

module.exports = {
  createCustomer,
  getCustomerById,
  listCustomers,
  updateCustomer,
};
