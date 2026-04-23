const auditRepository = require("../../repositories/auditRepository");
const { createPrefixedId } = require("../../utils/ids");
const { MANAGED_SERVICE_PERMISSION_META } = require("./managedServiceConstants");

async function logManagedServiceChanges({ auth, companyId, previousPermissions, nextPermissions }) {
  const changes = MANAGED_SERVICE_PERMISSION_META.filter(
    ({ key }) => Boolean(previousPermissions?.[key]) !== Boolean(nextPermissions?.[key])
  );

  for (const change of changes) {
    await auditRepository.createLog({
      audit_id: await createPrefixedId("aud"),
      company_id: companyId,
      action: "company.managed_service.updated",
      performed_by: auth.userId,
      user_email: auth.email,
      user_role: auth.role,
      details: {
        service: change.label,
        enabled: Boolean(nextPermissions?.[change.key]),
        previous_value: Boolean(previousPermissions?.[change.key]),
      },
    });
  }

  return changes;
}

module.exports = {
  logManagedServiceChanges,
};
