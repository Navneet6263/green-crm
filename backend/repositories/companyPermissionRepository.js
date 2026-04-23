const db = require("../db/connection");

const DEFAULT_PERMISSIONS = {
  can_use_platform_email: false,
  can_use_platform_call: false,
  can_use_platform_whatsapp: false,
  can_use_platform_sms: false,
  can_use_attendance: false,
};

function getExecutor(executor) {
  return executor || db;
}

async function getPermissions(companyId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    "SELECT TOP 1 * FROM company_permissions WHERE company_id = ?",
    [companyId]
  );

  return rows[0] || null;
}

async function ensurePermissions(companyId, executor) {
  const active = getExecutor(executor);

  await active.query(
    `
      IF NOT EXISTS (SELECT 1 FROM company_permissions WHERE company_id = ?)
      BEGIN
        INSERT INTO company_permissions (
          company_id,
          can_use_platform_email,
          can_use_platform_call,
          can_use_platform_whatsapp,
          can_use_platform_sms,
          can_use_attendance
        ) VALUES (?, 0, 0, 0, 0, 0)
      END
    `,
    [companyId, companyId]
  );

  return getPermissions(companyId, active);
}

async function upsertPermissions(companyId, permissions, executor) {
  const active = getExecutor(executor);
  const nextPermissions = { ...DEFAULT_PERMISSIONS, ...(permissions || {}) };

  await active.query(
    `
      IF EXISTS (SELECT 1 FROM company_permissions WHERE company_id = ?)
      BEGIN
        UPDATE company_permissions
        SET can_use_platform_email = ?,
            can_use_platform_call = ?,
            can_use_platform_whatsapp = ?,
            can_use_platform_sms = ?,
            can_use_attendance = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE company_id = ?
      END
      ELSE
      BEGIN
        INSERT INTO company_permissions (
          company_id,
          can_use_platform_email,
          can_use_platform_call,
          can_use_platform_whatsapp,
          can_use_platform_sms,
          can_use_attendance
        ) VALUES (?, ?, ?, ?, ?, ?)
      END
    `,
    [
      companyId,
      nextPermissions.can_use_platform_email ? 1 : 0,
      nextPermissions.can_use_platform_call ? 1 : 0,
      nextPermissions.can_use_platform_whatsapp ? 1 : 0,
      nextPermissions.can_use_platform_sms ? 1 : 0,
      nextPermissions.can_use_attendance ? 1 : 0,
      companyId,
      companyId,
      nextPermissions.can_use_platform_email ? 1 : 0,
      nextPermissions.can_use_platform_call ? 1 : 0,
      nextPermissions.can_use_platform_whatsapp ? 1 : 0,
      nextPermissions.can_use_platform_sms ? 1 : 0,
      nextPermissions.can_use_attendance ? 1 : 0,
    ]
  );

  return getPermissions(companyId, active);
}

module.exports = {
  DEFAULT_PERMISSIONS,
  ensurePermissions,
  getPermissions,
  upsertPermissions,
};
