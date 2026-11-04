const db = require("../db/connection");
const { MONEY_APPLY, MONEY_COLUMNS, SUMMARY_COLUMNS, moneyConditions } = require("./customerMoneySql");

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

  // User-specific filter: Include customers where user is assigned OR is a member
  if (filters.assignedTo) {
    conditions.push("(c.assigned_to = ? OR EXISTS (SELECT 1 FROM customer_members cm WHERE cm.customer_id = c.customer_id AND cm.company_id = c.company_id AND cm.is_active = 1 AND cm.user_id = ?))");
    params.push(filters.assignedTo, filters.assignedTo);
  }

  if (filters.teamIds) {
    if (!filters.teamIds.length) {
      conditions.push("1 = 0");
    } else {
      conditions.push(`c.team_id IN (${filters.teamIds.map(() => "?").join(", ")})`);
      params.push(...filters.teamIds);
    }
  }

  if (filters.status) {
    conditions.push("c.status = ?");
    params.push(filters.status);
  }

  if (filters.createdBy) {
    conditions.push("c.created_by = ?");
    params.push(filters.createdBy);
  }
  const followUpConditions = {
    scheduled: "c.next_follow_up IS NOT NULL",
    upcoming: "c.next_follow_up >= SYSUTCDATETIME()",
    overdue: "c.next_follow_up < SYSUTCDATETIME()",
    none: "c.next_follow_up IS NULL",
  };
  if (Object.hasOwn(followUpConditions, filters.followUp)) conditions.push(followUpConditions[filters.followUp]);

  if (filters.search) {
    conditions.push("(c.name LIKE ? OR c.company_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }

  // Money, onboarding and renewal filters; they read the pay/onb/ren joins (MONEY_APPLY).
  conditions.push(...moneyConditions(filters));

  return {
    whereClause: `WHERE ${conditions.join(" AND ")}`,
    params,
  };
}

async function listCustomers(filters, pagination, executor) {
  const active = getExecutor(executor);
  const sortColumns = {
    name: "c.company_name ASC", value: "c.total_value DESC", "follow-up": "CASE WHEN c.next_follow_up IS NULL THEN 1 ELSE 0 END, c.next_follow_up ASC",
    pending: "(COALESCE(c.total_value, 0) - pay.paid_amount) DESC",
    "payment-date": "CASE WHEN c.next_payment_date IS NULL THEN 1 ELSE 0 END, c.next_payment_date ASC",
    renewal: "CASE WHEN ren.next_renewal IS NULL THEN 1 ELSE 0 END, ren.next_renewal ASC",
  };
  const orderBy = Object.hasOwn(sortColumns, filters.sort) ? sortColumns[filters.sort] : "COALESCE(c.updated_at, c.created_at) DESC";
  const { whereClause, params } = buildWhere(filters);
  const summarySql = `,
        COALESCE(SUM(CASE WHEN c.status = 'active' THEN 1 ELSE 0 END), 0) AS active,
        COALESCE(SUM(CASE WHEN c.next_follow_up IS NOT NULL THEN 1 ELSE 0 END), 0) AS scheduled,
        COALESCE(SUM(CASE WHEN c.next_follow_up < SYSUTCDATETIME() THEN 1 ELSE 0 END), 0) AS overdue,
        COALESCE(SUM(c.total_value), 0) AS value ${SUMMARY_COLUMNS}`;
  // The tiles show the whole scope; with a quick money/onboarding/renewal filter on they need their own query.
  const quickFilter = moneyConditions(filters).length > 0;
  const [countRows] = await active.query(
    `SELECT COUNT(*) AS total ${filters.includeSummary && !quickFilter ? summarySql : ""} FROM customers c ${MONEY_APPLY} ${whereClause}`,
    params
  );
  let summary = filters.includeSummary && !quickFilter ? countRows[0] : undefined;
  const [rows] = await active.query(
    `
      SELECT
        c.*,
        u.name AS assigned_to_name,
        creator.name AS created_by_name,
        t.name AS team_name,
        t.code AS team_code,
        p.name AS product_name,
        (SELECT TOP 1 cn.content FROM customer_notes cn
         WHERE cn.customer_id = c.customer_id AND cn.company_id = c.company_id
         ORDER BY cn.created_at DESC, cn.id DESC) AS latest_note${MONEY_COLUMNS}
      FROM customers c
      LEFT JOIN users u ON u.user_id = c.assigned_to
      LEFT JOIN users creator ON creator.user_id = c.created_by
      LEFT JOIN teams t ON t.team_id = c.team_id
      LEFT JOIN products p ON p.product_id = c.product_id
      ${MONEY_APPLY}
      ${whereClause}
      ORDER BY ${orderBy}, c.customer_id DESC
      OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `,
    [...params, pagination.offset, pagination.limit]
  );

  let creators;
  if (filters.includeSummary) {
    const scope = buildWhere({ ...filters, search: "", status: null, createdBy: null, followUp: null, payment: null, onboarding: null, renewal: null, attention: null });
    [creators] = await active.query(`SELECT DISTINCT c.created_by AS user_id, creator.name
      FROM customers c INNER JOIN users creator ON creator.user_id = c.created_by
      ${scope.whereClause} ORDER BY creator.name, c.created_by`, scope.params);
  }
  if (filters.includeSummary && quickFilter) {
    const scope = buildWhere({ ...filters, payment: null, onboarding: null, renewal: null, attention: null });
    const [summaryRows] = await active.query(`SELECT COUNT(*) AS total ${summarySql} FROM customers c ${MONEY_APPLY} ${scope.whereClause}`, scope.params);
    summary = summaryRows[0];
  }
  return {
    rows,
    total: countRows[0].total,
    summary,
    creators,
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
        u.name AS assigned_to_name,
        creator.name AS created_by_name,
        t.name AS team_name,
        t.code AS team_code,
        p.name AS product_name${MONEY_COLUMNS}
      FROM customers c
      LEFT JOIN users u ON u.user_id = c.assigned_to
      LEFT JOIN users creator ON creator.user_id = c.created_by
      LEFT JOIN teams t ON t.team_id = c.team_id
      LEFT JOIN products p ON p.product_id = c.product_id
      ${MONEY_APPLY}
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
        (customer_id, company_id, name, company_name, email, phone, converted_from_lead_id,
         total_value, status, team_id, assigned_to, last_interaction, next_follow_up,
         onboarding_date, onboarding_status, product_id, notes, created_by, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
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
      customer.team_id || null,
      customer.assigned_to || null,
      customer.last_interaction || null,
      customer.next_follow_up || null,
      customer.onboarding_date || null,
      customer.onboarding_status || "pending",
      customer.product_id || null,
      customer.notes || null,
      customer.created_by || null,
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
    "team_id",
    "assigned_to",
    "last_interaction",
    "next_follow_up",
    "onboarding_date",
    "onboarding_status",
    "product_id",
    "notes",
    "is_active",
    "next_payment_date",
    "billing_cycle",
    "onboarding_completed_at",
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

async function findDuplicateCustomer(companyId, email, companyName, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    `
      SELECT TOP 1
        c.customer_id,
        c.company_name,
        c.email,
        u.name AS assigned_to_name,
        u.email AS assigned_to_email
      FROM customers c
      LEFT JOIN users u ON u.user_id = c.assigned_to
      WHERE c.company_id = ? 
        AND c.is_active = 1
        AND (LOWER(c.email) = LOWER(?) OR LOWER(c.company_name) = LOWER(?))
      ORDER BY c.created_at DESC
    `,
    [companyId, email, companyName]
  );
  return rows[0] || null;
}

module.exports = {
  createCustomer,
  getCustomerById,
  listCustomers,
  updateCustomer,
  findDuplicateCustomer,
};
