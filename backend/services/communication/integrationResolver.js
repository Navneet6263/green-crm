const { decryptJson } = require("../../utils/secureConfig");
const { CHANNELS, DEFAULT_PROVIDER, MANAGED_SERVICE_CHANNELS, PLATFORM_PERMISSION_KEY } = require("./channels");
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
  return true;
}

function validateIntegration(channel, integration) {
  if (!integration.enabled) {
    return { valid: false, reason: "disabled" };
  }

  if (channel === "attendance") {
    return validateAttendanceConfig(integration.config)
      ? { valid: true }
      : { valid: false, reason: "invalid_tenant_config" };
  }

  return getProvider(channel, integration.provider).validateConfig(integration.config);
}

function buildEnabledCapability(channel, integration, source, mode, config) {
  return {
    channel,
    enabled: true,
    provider: integration.provider,
    mode,
    source,
    config,
  };
}

function resolveManagedServiceCapability(snapshot, channel) {
  const integration = normalizeIntegration(snapshot.integrations[channel], channel);
  const platformIntegration = normalizeIntegration(snapshot.platform_integrations[channel], channel);
  const hasPlatformAccess = Boolean(snapshot.permissions?.[PLATFORM_PERMISSION_KEY[channel]]);
  const tenantValidation = validateIntegration(channel, integration);

  if (tenantValidation.valid) {
    return buildEnabledCapability(channel, integration, "tenant", "own_credentials", integration.config);
  }

  if (hasPlatformAccess) {
    const platformValidation = validateIntegration(channel, platformIntegration);
    if (platformValidation.valid) {
      return buildEnabledCapability(channel, platformIntegration, "platform", "platform_managed", platformIntegration.config);
    }

    return buildDisabledCapability(
      channel,
      platformIntegration,
      platformIntegration.enabled
        ? platformValidation.reason || "invalid_platform_config"
        : "platform_provider_disabled",
      "platform"
    );
  }

  return buildDisabledCapability(
    channel,
    integration,
    integration.enabled && !tenantValidation.valid ? "invalid_tenant_config" : "platform_access_not_enabled"
  );
}

function resolveChannelFromSnapshot(snapshot, channel) {
  const integration = normalizeIntegration(snapshot.integrations[channel], channel);
  const platformIntegration = normalizeIntegration(snapshot.platform_integrations[channel], channel);
  const hasPlatformAccess = Boolean(snapshot.permissions?.[PLATFORM_PERMISSION_KEY[channel]]);

  if (MANAGED_SERVICE_CHANNELS.includes(channel)) {
    return resolveManagedServiceCapability(snapshot, channel);
  }

  if (!integration.enabled) {
    return buildDisabledCapability(channel, integration, "disabled");
  }

  if (channel === "attendance") {
    if (!hasPlatformAccess) {
      return buildDisabledCapability(channel, integration, "attendance_not_approved");
    }

    if (integration.mode === "platform_credentials") {
      const validation = validateIntegration(channel, platformIntegration);
      return validation.valid
        ? buildEnabledCapability(channel, platformIntegration, "platform", integration.mode, platformIntegration.config)
        : buildDisabledCapability(channel, integration, "invalid_platform_config", "platform");
    }

    return validateIntegration(channel, integration).valid
      ? buildEnabledCapability(channel, integration, "tenant", integration.mode, integration.config)
      : buildDisabledCapability(channel, integration, "invalid_tenant_config");
  }

  return validateIntegration(channel, integration).valid
    ? buildEnabledCapability(channel, integration, integration.mode === "platform_credentials" ? "platform" : "tenant", integration.mode, integration.config)
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
