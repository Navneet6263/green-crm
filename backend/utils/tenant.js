const { MANAGER_ROLES, ROLES } = require("../constants/roles");
const AppError = require("./appError");

function isManagerRole(role) {
  return MANAGER_ROLES.includes(role);
}

function canAccessCompany(auth, companyId) {
  return auth.role === ROLES.SUPER_ADMIN || auth.companyId === companyId;
}

function assertCompanyAccess(auth, companyId) {
  if (!canAccessCompany(auth, companyId)) {
    throw new AppError("Cross-company access denied", 403);
  }
}

module.exports = {
  assertCompanyAccess,
  canAccessCompany,
  isManagerRole,
};
