const db = require("../db/connection");
const userRepository = require("../repositories/userRepository");
const auditRepository = require("../repositories/auditRepository");
const userService = require("./userService");
const { MAX_SUPER_ADMINS, PLATFORM_OPERATOR_ROLES, ROLES } = require("../constants/roles");
const { PLATFORM_COMPANY_ID } = require("../db/schema");
const { createPrefixedId } = require("../utils/ids");
const { hashPassword } = require("../utils/auth");
const AppError = require("../utils/appError");
const { assertCompanyAccess, getAccessibleCompanyIds } = require("../utils/tenant");

function assertPlatformUserAccess(auth) {
  if (![ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN].includes(auth.role)) {
    throw new AppError("Only super admins and platform admins can access this route.", 403);
  }
}

async function listAdminUsers(auth, query) {
  assertPlatformUserAccess(auth);
  return userService.listUsers(auth, query);
}

async function createSuperAdmin(auth, payload) {
  if (auth.role !== ROLES.SUPER_ADMIN) {
    throw new AppError("Only super admins can access this route.", 403);
  }

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
  assertPlatformUserAccess(auth);
  const user = await userRepository.getUserById(userId);
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  if (auth.role === ROLES.PLATFORM_ADMIN) {
    assertCompanyAccess(auth, user.company_id);
    if ([ROLES.SUPER_ADMIN, ...PLATFORM_OPERATOR_ROLES].includes(user.role)) {
      throw new AppError("Platform admins can manage tenant users only.", 403);
    }
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
  assertPlatformUserAccess(auth);
  const user = await userRepository.getUserById(userId);
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  if (auth.role === ROLES.PLATFORM_ADMIN) {
    assertCompanyAccess(auth, user.company_id);
    if ([ROLES.SUPER_ADMIN, ...PLATFORM_OPERATOR_ROLES].includes(user.role)) {
      throw new AppError("Platform admins can manage tenant users only.", 403);
    }
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
  assertPlatformUserAccess(auth);
  const total = await userRepository.countSuperAdmins();
  const managedCompanyIds = auth.role === ROLES.SUPER_ADMIN ? null : getAccessibleCompanyIds(auth);
  const companyFilter =
    managedCompanyIds === null
      ? { clause: "", params: [] }
      : managedCompanyIds.length
        ? {
            clause: ` AND company_id IN (${managedCompanyIds.map(() => "?").join(", ")})`,
            params: managedCompanyIds,
          }
        : { clause: " AND 1 = 0", params: [] };
  const [inactiveAdminsResult, suspendedCompaniesResult] = await Promise.all([
    db.query(
      `SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND is_active = 0${companyFilter.clause}`,
      companyFilter.params
    ),
    db.query(
      `SELECT COUNT(*) AS total FROM companies WHERE status = 'suspended'${companyFilter.clause}`,
      companyFilter.params
    ),
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
