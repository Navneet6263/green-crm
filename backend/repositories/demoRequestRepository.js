const db = require("../db/connection");

function getExecutor(executor) {
  return executor || db;
}

async function createDemoRequest(request, executor) {
  const active = getExecutor(executor);
  const [result] = await active.query(
    `
      INSERT INTO demo_requests
        (name, email, phone, company, message, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      request.name,
      request.email,
      request.phone || null,
      request.company || null,
      request.message || null,
      request.status || "pending",
    ]
  );

  const [rows] = await active.query("SELECT TOP 1 * FROM demo_requests WHERE id = ?", [result.insertId]);
  return rows[0] || null;
}

async function listDemoRequests({ status, search, pagination }, executor) {
  const active = getExecutor(executor);
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }

  if (search) {
    conditions.push("(name LIKE ? OR email LIKE ? OR company LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [countRows] = await active.query(
    `SELECT COUNT(*) AS total FROM demo_requests ${whereClause}`,
    params
  );
  const [rows] = await active.query(
    `
      SELECT *
      FROM demo_requests
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

async function updateDemoRequest(id, updates, executor) {
  const active = getExecutor(executor);
  if (Object.prototype.hasOwnProperty.call(updates, "status")) {
    await active.query("UPDATE demo_requests SET status = ? WHERE id = ?", [updates.status, id]);
  }
  const [rows] = await active.query("SELECT TOP 1 * FROM demo_requests WHERE id = ?", [id]);
  return rows[0] || null;
}

module.exports = {
  createDemoRequest,
  listDemoRequests,
  updateDemoRequest,
};
