const companyIntegrationRepository = require("../../repositories/companyIntegrationRepository");
const companyPermissionRepository = require("../../repositories/companyPermissionRepository");
const auditRepository = require("../../repositories/auditRepository");
const { ROLES } = require("../../constants/roles");
const { PLATFORM_COMPANY_ID } = require("../../db/schema");
const AppError = require("../../utils/appError");
const { createPrefixedId } = require("../../utils/ids");
const { assertCompanyAccess } = require("../../utils/tenant");
const { decryptJson, encryptJson } = require("../../utils/secureConfig");
const { clearCapabilityCache } = require("./capabilityCache");
const { CHANNELS } = require("./channels");
const { getCapabilities } = require("./capabilitiesService");
const { invalidateIntegrationSnapshot } = require("./integrationSnapshotService");
const { logManagedServiceChanges } = require("./managedServiceAuditService");
const { getProvider } = require("./providerFactory");
const { normalizeIntegrationInput, parseAllowedIps, serializeIntegrations } = require("./settingsSerializer");

function canViewSettings(auth) {
  return [
    ROLES.SUPER_ADMIN,
    ROLES.PLATFORM_ADMIN,
    ROLES.PLATFORM_MANAGER,
    ROLES.ADMIN,
  ].includes(auth.role);
}

function canManageIntegrations(auth, companyId) {
  if (companyId === PLATFORM_COMPANY_ID) {
    return auth.role === ROLES.SUPER_ADMIN;
  }

  return [ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.ADMIN].includes(auth.role);
}

function canManagePermissions(auth, companyId) {
  return companyId !== PLATFORM_COMPANY_ID && auth.role === ROLES.SUPER_ADMIN;
}

function validateAttendanceConfig(config = {}) {
  const allowedIps = parseAllowedIps(config.allowed_ips);
  const valid = allowedIps.length > 0;

  return {
    valid,
    errors: valid ? [] : ["Attendance requires at least one allowed IP address."],
  };
}

function hasPersistedConfig(config = {}) {
  return Object.values(config).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(String(value || "").trim())
  );
}

async function getCompanyCommunicationSettings(auth, companyId) {
  assertCompanyAccess(auth, companyId);
  if (!canViewSettings(auth)) {
    throw new AppError("You do not have permission to view communication settings.", 403);
  }
  const [permissions, integrations, capabilities] = await Promise.all([
    companyPermissionRepository.ensurePermissions(companyId),
    companyIntegrationRepository.listIntegrations(companyId),
    getCapabilities(companyId),
  ]);

  return {
    company_id: companyId,
    permissions: companyId === PLATFORM_COMPANY_ID ? null : permissions,
    integrations: serializeIntegrations(integrations),
    capabilities,
  };
}

async function saveIntegrations(companyId, inputs) {
  for (const input of inputs) {
    const currentIntegration = await companyIntegrationRepository.getIntegration(companyId, input.channel);
    const storedConfig = decryptJson(currentIntegration?.config_json);
    const nextIntegration = normalizeIntegrationInput(input.channel, input, storedConfig);
    const validation =
      nextIntegration.channel === "attendance"
        ? validateAttendanceConfig(nextIntegration.config)
        : nextIntegration.mode === "platform_credentials" && companyId !== PLATFORM_COMPANY_ID
          ? { valid: true }
          : getProvider(nextIntegration.channel, nextIntegration.provider).validateConfig(nextIntegration.config);

    if (nextIntegration.enabled && !validation.valid) {
      throw new AppError(`Invalid ${nextIntegration.channel} configuration.`, 400);
    }

    await companyIntegrationRepository.upsertIntegration(companyId, {
      ...nextIntegration,
      config_json: hasPersistedConfig(nextIntegration.config)
        ? encryptJson(nextIntegration.config)
        : null,
    });
  }
}

async function updateCompanyCommunicationSettings(auth, companyId, payload) {
  assertCompanyAccess(auth, companyId);

  if (!canManageIntegrations(auth, companyId)) {
    throw new AppError("You do not have permission to update communication settings.", 403);
  }

  if (payload.permissions && !canManagePermissions(auth, companyId)) {
    throw new AppError("Only super-admin can change managed service approvals.", 403);
  }

  const currentPermissions = payload.permissions
    ? await companyPermissionRepository.ensurePermissions(companyId)
    : null;
  let managedServiceChanges = [];

  if (Array.isArray(payload.integrations)) {
    const validChannels = new Set(CHANNELS);
    const filtered = payload.integrations.filter((item) => validChannels.has(item.channel));
    await saveIntegrations(companyId, filtered);
  }

  if (payload.permissions && canManagePermissions(auth, companyId)) {
    const updatedPermissions = await companyPermissionRepository.upsertPermissions(companyId, payload.permissions);
    managedServiceChanges = await logManagedServiceChanges({
      auth,
      companyId,
      previousPermissions: currentPermissions,
      nextPermissions: updatedPermissions,
    });
  }

  await invalidateIntegrationSnapshot(companyId);
  await clearCapabilityCache(companyId);
  if (companyId === PLATFORM_COMPANY_ID) {
    await invalidateIntegrationSnapshot();
    await clearCapabilityCache();
  }

  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: companyId,
    action: "company.communication_settings.updated",
    performed_by: auth.userId,
    user_email: auth.email,
    user_role: auth.role,
    details: {
      updated_channels: Array.isArray(payload.integrations)
        ? payload.integrations.map((item) => item.channel)
        : [],
      permissions_updated: Boolean(payload.permissions),
      managed_services_updated: managedServiceChanges.map((item) => item.label),
    },
  });

  return getCompanyCommunicationSettings(auth, companyId);
}

module.exports = {
  getCompanyCommunicationSettings,
  updateCompanyCommunicationSettings,
};
