const companyPermissionRepository = require("../../repositories/companyPermissionRepository");

async function initializeCompanyCommunicationControls(companyId, executor) {
  await companyPermissionRepository.ensurePermissions(companyId, executor);
}

module.exports = {
  initializeCompanyCommunicationControls,
};
