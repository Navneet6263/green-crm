const { decryptJson } = require("../../utils/secureConfig");
const { CHANNELS, DEFAULT_PROVIDER, PLATFORM_PERMISSION_KEY } = require("./channels");
const { loadIntegrationSnapshot } = require("./integrationSnapshotService");
const { getProvider } = require("./providerFactory");
const { parseAllowedIps } = require("./settingsSerializer");

function normalizeIntegration(row, channel) {
  return {
    channel,
    enabled: Boolean(row?.enabled),
    provider: row?.provider || DEFAULT_PROVIDER[channel],
    mode: row?.mode || "own_credentials",
    config: decryptJson(row?.config_json),
  };
}

function buildDisabledCapability(channel, integration, reason, source = "tenant") {
  return { channel, enabled: false, provider: integration.provider, mode: integration.mode, source, reason };
}

function validateAttendanceConfig(config = {}) {
  return parseAllowedIps(config.allowed_ips).length > 0;
}

function resolveChannelFromSnapshot(snapshot, channel) {
  const integration = normalizeIntegration(snapshot.integrations[channel], channel);
  const platformIntegration = normalizeIntegration(snapshot.platform_integrations[channel], channel);
  const hasPlatformAccess = Boolean(snapshot.permissions?.[PLATFORM_PERMISSION_KEY[channel]]);

  if (!integration.enabled) return buildDisabledCapability(channel, integration, "disabled");
  if (channel === "attendance" && !hasPlatformAccess) return buildDisabledCapability(channel, integration, "attendance_not_approved");

  if (integration.mode === "platform_credentials") {
    if (!hasPlatformAccess) return buildDisabledCapability(channel, integration, "platform_access_not_approved", "platform");
    if (!platformIntegration.enabled) return buildDisabledCapability(channel, integration, "platform_provider_disabled", "platform");

    const validation = channel === "attendance"
      ? { valid: validateAttendanceConfig(platformIntegration.config) }
      : getProvider(channel, platformIntegration.provider).validateConfig(platformIntegration.config);

    return validation.valid
      ? { channel, enabled: true, provider: platformIntegration.provider, mode: integration.mode, source: "platform", config: platformIntegration.config }
      : buildDisabledCapability(channel, integration, "invalid_platform_config", "platform");
  }

  if (channel === "attendance") {
    return validateAttendanceConfig(integration.config)
      ? { channel, enabled: true, provider: integration.provider, mode: integration.mode, source: "tenant", config: integration.config }
      : buildDisabledCapability(channel, integration, "invalid_tenant_config");
  }

  const validation = getProvider(channel, integration.provider).validateConfig(integration.config);
  return validation.valid
    ? { channel, enabled: true, provider: integration.provider, mode: integration.mode, source: "tenant", config: integration.config }
    : buildDisabledCapability(channel, integration, "invalid_tenant_config");
}

async function resolveChannel(companyId, channel, options = {}) {
  const snapshot = await loadIntegrationSnapshot(companyId, options);
  return resolveChannelFromSnapshot(snapshot, channel);
}

async function resolveCapabilities(companyId, options = {}) {
  const snapshot = await loadIntegrationSnapshot(companyId, options);
  return CHANNELS.reduce((acc, channel) => {
    const entry = resolveChannelFromSnapshot(snapshot, channel);
    acc[entry.channel] = {
      enabled: entry.enabled,
      provider: entry.provider,
      mode: entry.mode,
      source: entry.source,
      reason: entry.reason || null,
    };
    return acc;
  }, {});
}

module.exports = {
  resolveCapabilities,
  resolveChannel,
};
