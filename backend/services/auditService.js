const auditRepository = require("../repositories/auditRepository");
const { ROLES } = require("../constants/roles");
const { buildPaginatedResult, parsePagination } = require("../utils/pagination");
const AppError = require("../utils/appError");
const { assertCompanyAccess } = require("../utils/tenant");

async function listAuditLogs(auth, query) {
  if (![ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(auth.role)) {
    throw new AppError("Only admins can access audit logs.", 403);
  }

  const pagination = parsePagination(query);
  const companyId = auth.role === ROLES.SUPER_ADMIN ? query.company_id || null : auth.companyId;

  if (companyId) {
    assertCompanyAccess(auth, companyId);
  }

  const { rows, total } = await auditRepository.listLogs({
    companyId,
    search: query.search || "",
    action: query.action || null,
    pagination,
  });

  return buildPaginatedResult(rows, total, pagination);
}

module.exports = {
  listAuditLogs,
};
