const db = require("../db/connection");
const userRepository = require("../repositories/userRepository");
const auditRepository = require("../repositories/auditRepository");
const { MAX_SUPER_ADMINS, ROLES } = require("../constants/roles");
const { PLATFORM_COMPANY_ID } = require("../db/schema");
const { createPrefixedId } = require("../utils/ids");
const { hashPassword } = require("../utils/auth");
const { buildPaginatedResult, parsePagination } = require("../utils/pagination");
const AppError = require("../utils/appError");

async function assertSuperAdmin(auth) {
  if (auth.role !== ROLES.SUPER_ADMIN) {
    throw new AppError("Only super admins can access this route.", 403);
  }
}

async function listAdminUsers(auth, query) {
  await assertSuperAdmin(auth);
  const pagination = parsePagination(query);
  const { rows, total } = await userRepository.listUsers({
    companyId: query.company_id || null,
    role: query.role || null,
    search: query.search || "",
    pagination,
  });

  const filteredRows = rows.filter((row) => [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(row.role));
  return buildPaginatedResult(filteredRows, query.role ? total : filteredRows.length, pagination);
}

async function createSuperAdmin(auth, payload) {
  await assertSuperAdmin(auth);

  const total = await userRepository.countSuperAdmins();
  if (total >= MAX_SUPER_ADMINS) {
    throw new AppError("Maximum super admin limit reached.", 403);
  }

  if (!payload.name || !payload.email || !payload.password) {
    throw new AppError("Name, email, and password are required.");
  }

  const existingUser = await userRepository.getUserByEmail(String(payload.email).trim().toLowerCase());
  if (existingUser) {
    throw new AppError("A user with this email already exists.", 409);
  }

  const createdUser = await userRepository.createUser({
    user_id: await createPrefixedId("usr"),
    company_id: PLATFORM_COMPANY_ID,
    role: ROLES.SUPER_ADMIN,
    name: String(payload.name).trim(),
    email: String(payload.email).trim().toLowerCase(),
    password: await hashPassword(String(payload.password)),
    created_by: auth.userId,
  });

  await userRepository.updateUser(createdUser.user_id, createdUser.company_id, {
    is_super_admin: 1,
    super_admin_level: 1,
    can_manage_super_admins: 1,
  });

  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: PLATFORM_COMPANY_ID,
    action: "super_admin.created",
    performed_by: auth.userId,
    target_user: createdUser.user_id,
    user_email: createdUser.email,
    user_role: createdUser.role,
    details: null,
  });

  return userRepository.getUserById(createdUser.user_id);
}

async function setActivation(auth, userId, isActive) {
  await assertSuperAdmin(auth);
  const user = await userRepository.getUserById(userId);
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const updated = await userRepository.setUserActive(user.user_id, user.company_id, isActive, auth.userId);
  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: user.company_id,
    action: isActive ? "super_admin.activated_user" : "super_admin.deactivated_user",
    performed_by: auth.userId,
    target_user: user.user_id,
    user_email: user.email,
    user_role: user.role,
    details: null,
  });

  return updated;
}

async function resetPassword(auth, userId, payload) {
  await assertSuperAdmin(auth);
  const user = await userRepository.getUserById(userId);
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const nextPassword = String(payload.password || payload.new_password || "").trim();
  if (nextPassword.length < 8) {
    throw new AppError("New password must be at least 8 characters.");
  }

  await userRepository.updateUser(user.user_id, user.company_id, {
    password: await hashPassword(nextPassword),
    is_temporary_password: 0,
  });

  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: user.company_id,
    action: "super_admin.reset_password",
    performed_by: auth.userId,
    target_user: user.user_id,
    user_email: user.email,
    user_role: user.role,
    details: null,
  });

  return { reset: true };
}

async function getSafetyStatus(auth) {
  await assertSuperAdmin(auth);
  const total = await userRepository.countSuperAdmins();
  const [inactiveAdminsResult, suspendedCompaniesResult] = await Promise.all([
    db.query("SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND is_active = 0"),
    db.query("SELECT COUNT(*) AS total FROM companies WHERE status = 'suspended'"),
  ]);
  const inactiveAdmins = inactiveAdminsResult[0];
  const suspendedCompanies = suspendedCompaniesResult[0];

  return {
    super_admin_count: total,
    max_super_admins: MAX_SUPER_ADMINS,
    can_create_more: total < MAX_SUPER_ADMINS,
    inactive_admins: inactiveAdmins[0].total,
    suspended_companies: suspendedCompanies[0].total,
  };
}

module.exports = {
  createSuperAdmin,
  getSafetyStatus,
  listAdminUsers,
  resetPassword,
  setActivation,
};
