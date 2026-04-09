const { MANAGER_ROLES, PLATFORM_CONSOLE_ROLES, PLATFORM_OPERATOR_ROLES, ROLES } = require("../constants/roles");
const AppError = require("./appError");

function isManagerRole(role) {
  return MANAGER_ROLES.includes(role);
}

function isPlatformOperatorRole(role) {
  return PLATFORM_OPERATOR_ROLES.includes(role);
}

function isPlatformConsoleRole(role) {
  return PLATFORM_CONSOLE_ROLES.includes(role);
}

function getAccessibleCompanyIds(auth) {
  if (auth.role === ROLES.SUPER_ADMIN) {
    return null;
  }

  if (isPlatformOperatorRole(auth.role)) {
    return Array.isArray(auth.managedCompanyIds) ? auth.managedCompanyIds : [];
  }

  return auth.companyId ? [auth.companyId] : [];
}

function canAccessCompany(auth, companyId) {
  if (auth.role === ROLES.SUPER_ADMIN) {
    return true;
  }

  if (isPlatformOperatorRole(auth.role)) {
    if (!companyId) {
      return true;
    }

    return getAccessibleCompanyIds(auth).includes(companyId);
  }

  return auth.companyId === companyId;
}

function assertCompanyAccess(auth, companyId) {
  if (!canAccessCompany(auth, companyId)) {
    throw new AppError("Cross-company access denied", 403);
  }
}

function assertPlatformConsoleAccess(auth) {
  if (!isPlatformConsoleRole(auth.role)) {
    throw new AppError("Platform access denied", 403);
  }
}

module.exports = {
  assertCompanyAccess,
  assertPlatformConsoleAccess,
  canAccessCompany,
  getAccessibleCompanyIds,
  isManagerRole,
  isPlatformConsoleRole,
  isPlatformOperatorRole,
};
