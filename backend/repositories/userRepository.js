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

async function getUserByEmail(email, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query("SELECT TOP 1 * FROM users WHERE email = ?", [email]);
  return rows[0] || null;
}

async function getUserById(userId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query("SELECT TOP 1 * FROM users WHERE user_id = ?", [userId]);
  return rows[0] || null;
}

async function getUserInCompany(userId, companyId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    "SELECT TOP 1 * FROM users WHERE user_id = ? AND company_id = ?",
    [userId, companyId]
  );
  return rows[0] || null;
}

async function listUsers({ companyId, companyIds = null, role, search, pagination }, executor) {
  const active = getExecutor(executor);
  const conditions = [];
  const params = [];
  const normalizedCompanyIds = [...new Set((Array.isArray(companyIds) ? companyIds : []).map((value) => String(value || "").trim()).filter(Boolean))];

  if (companyIds) {
    if (!normalizedCompanyIds.length) {
      return { rows: [], total: 0 };
    }

    conditions.push(`u.company_id IN (${normalizedCompanyIds.map(() => "?").join(", ")})`);
    params.push(...normalizedCompanyIds);
  } else if (companyId) {
    conditions.push("u.company_id = ?");
    params.push(companyId);
  }

  if (role) {
    conditions.push("u.role = ?");
    params.push(role);
  }

  if (search) {
    conditions.push("(u.name LIKE ? OR u.email LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await active.query(
    `
      SELECT
        u.user_id,
        u.company_id,
        u.role,
        u.name,
        u.email,
        u.phone,
        u.department,
        u.is_active,
        u.last_login_at,
        u.created_at,
        c.name AS company_name
      FROM users u
      INNER JOIN companies c ON c.company_id = u.company_id
      ${whereClause}
      ORDER BY u.created_at DESC
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
    `
      SELECT COUNT(*) AS total
      FROM users u
      ${whereClause}
    `,
    params
  );

  return {
    rows,
    total: countRows[0].total,
  };
}

async function listUsersByRole(companyId, role, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    `
      SELECT
        u.user_id,
        u.company_id,
        u.role,
        u.name,
        u.email,
        u.phone,
        u.department,
        u.is_active,
        u.last_login_at,
        u.created_at
      FROM users u
      WHERE u.company_id = ? AND u.role = ? AND u.is_active = 1
      ORDER BY u.name ASC
    `,
    [companyId, role]
  );
  return rows;
}

async function createUser(user, executor) {
  const active = getExecutor(executor);

  await active.query(
    `INSERT INTO users
      (user_id, company_id, role, name, email, phone, department, password, is_active, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      user.user_id,
      user.company_id,
      user.role,
      user.name || user.full_name,
      user.email,
      user.phone || null,
      user.department || null,
      user.password || user.password_hash,
      user.created_by || null,
    ]
  );

  return getUserById(user.user_id, active);
}

async function updateLastLogin(userId, executor) {
  const active = getExecutor(executor);
  await active.query("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = ?", [userId]);
}

async function updateUser(userId, companyId, updates, executor) {
  const active = getExecutor(executor);
  const fields = [];
  const params = [];

  [
    "name",
    "email",
    "phone",
    "department",
    "role",
    "password",
    "is_active",
    "deactivated_at",
    "deactivated_by",
    "is_super_admin",
    "super_admin_level",
    "can_manage_super_admins",
    "is_temporary_password",
    "app_preferences",
    "notification_prefs",
  ].forEach((column) => {
    if (!Object.prototype.hasOwnProperty.call(updates, column)) {
      return;
    }

    fields.push(`${column} = ?`);
    const value = ["app_preferences", "notification_prefs"].includes(column) && updates[column]
      ? typeof updates[column] === "string"
        ? updates[column]
        : JSON.stringify(updates[column])
      : updates[column];
    params.push(value);
  });

  if (fields.length) {
    await active.query(
      `UPDATE users SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND company_id = ?`,
      [...params, userId, companyId]
    );
  }

  return getUserInCompany(userId, companyId, active);
}

async function setUserActive(userId, companyId, isActive, actorUserId, executor) {
  const active = getExecutor(executor);
  await active.query(
    `
      UPDATE users
      SET
        is_active = ?,
        deactivated_at = ?,
        deactivated_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND company_id = ?
    `,
    [
      isActive ? 1 : 0,
      isActive ? null : new Date(),
      isActive ? null : actorUserId || null,
      userId,
      companyId,
    ]
  );

  return getUserInCompany(userId, companyId, active);
}

async function countSuperAdmins(executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    "SELECT COUNT(*) AS total FROM users WHERE is_super_admin = 1 AND is_active = 1"
  );
  return rows[0].total;
}

async function countActiveUsersByRole(companyId, role, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    `
      SELECT COUNT(*) AS total
      FROM users
      WHERE company_id = ? AND role = ? AND is_active = 1
    `,
    [companyId, role]
  );
  return rows[0]?.total || 0;
}

module.exports = {
  countActiveUsersByRole,
  countSuperAdmins,
  createUser,
  getUserByEmail,
  getUserById,
  getUserInCompany,
  listUsersByRole,
  listUsers,
  setUserActive,
  updateUser,
  updateLastLogin,
};
