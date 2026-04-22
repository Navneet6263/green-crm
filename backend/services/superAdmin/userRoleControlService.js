const userRepository = require("../../repositories/userRepository");
const userService = require("../userService");
const { ROLES } = require("../../constants/roles");
const AppError = require("../../utils/appError");

const TENANT_ROLE_OPTIONS = [
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.SALES,
  ROLES.MARKETING,
  ROLES.SUPPORT,
  ROLES.LEGAL_TEAM,
  ROLES.FINANCE_TEAM,
  ROLES.VIEWER,
];

async function updateTenantUserRole(auth, userId, payload) {
  if (auth.role !== ROLES.SUPER_ADMIN) {
    throw new AppError("Only super admins can change tenant user roles from the platform control room.", 403);
  }

  const targetUser = await userRepository.getUserById(userId);
  if (!targetUser) {
    throw new AppError("User not found.", 404);
  }

  if (!TENANT_ROLE_OPTIONS.includes(targetUser.role)) {
    throw new AppError("Platform-root roles cannot be reassigned from tenant role control.", 400);
  }

  const nextRole = String(payload.role || "").trim().toLowerCase();
  if (!TENANT_ROLE_OPTIONS.includes(nextRole)) {
    throw new AppError("Tenant role is invalid for this control surface.", 400);
  }

  return userService.updateUser(auth, userId, { role: nextRole });
}

module.exports = {
  TENANT_ROLE_OPTIONS,
  updateTenantUserRole,
};
