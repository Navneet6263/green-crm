const companyIntegrationRepository = require("../../repositories/companyIntegrationRepository");
const companyPermissionRepository = require("../../repositories/companyPermissionRepository");
const { PLATFORM_COMPANY_ID } = require("../../db/schema");
const { deleteKey, deletePrefix, getJson, setJson } = require("../cache/cacheStore");
const { integrationSnapshotKey } = require("./cacheKeys");

function mapIntegrations(rows = []) {
  return rows.reduce((acc, row) => ({ ...acc, [row.channel]: row }), {});
}

function getTtlSeconds() {
  const parsed = Number(process.env.COMMUNICATION_CONFIG_CACHE_TTL_SECONDS || process.env.COMMUNICATION_CACHE_TTL_SECONDS || 30);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 30;
}

async function loadIntegrationSnapshot(companyId, options = {}) {
  const cacheKey = integrationSnapshotKey(companyId);
  if (!options.refresh) {
    const cached = await getJson(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const [permissions, integrations, platformIntegrations] = await Promise.all([
    companyPermissionRepository.ensurePermissions(companyId),
    companyIntegrationRepository.listIntegrations(companyId),
    companyId === PLATFORM_COMPANY_ID ? [] : companyIntegrationRepository.listIntegrations(PLATFORM_COMPANY_ID),
  ]);

  return setJson(
    cacheKey,
    {
      company_id: companyId,
      permissions,
      integrations: mapIntegrations(integrations),
      platform_integrations: mapIntegrations(platformIntegrations),
    },
    getTtlSeconds()
  );
}

async function invalidateIntegrationSnapshot(companyId) {
  if (!companyId || companyId === PLATFORM_COMPANY_ID) {
    await deletePrefix("communications:config:");
    return;
  }

  await deleteKey(integrationSnapshotKey(companyId));
}

module.exports = {
  invalidateIntegrationSnapshot,
  loadIntegrationSnapshot,
};
