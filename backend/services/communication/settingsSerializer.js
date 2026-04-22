const { decryptJson } = require("../../utils/secureConfig");
const { CHANNELS, DEFAULT_PROVIDER } = require("./channels");

const SECRET_MASK = "********";

function isSecretKey(key) {
  return /token|password|secret|api_key/i.test(String(key || ""));
}

function maskValue(key, value) {
  return isSecretKey(key) && value ? SECRET_MASK : value;
}

function maskConfig(config = {}) {
  return Object.entries(config).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: Array.isArray(value) ? value : maskValue(key, value),
    }),
    {}
  );
}

function parseAllowedIps(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergeConfig(channel, inputConfig = {}, storedConfig = {}) {
  const merged = { ...storedConfig, ...(inputConfig || {}) };

  Object.keys(merged).forEach((key) => {
    if (isSecretKey(key) && merged[key] === SECRET_MASK) {
      merged[key] = storedConfig[key] || "";
    }
  });

  if (channel === "attendance") {
    merged.allowed_ips = parseAllowedIps(merged.allowed_ips);
  }

  return merged;
}

function normalizeIntegrationInput(channel, input = {}, storedConfig = {}) {
  return {
    channel,
    enabled: Boolean(input.enabled),
    provider: String(input.provider || DEFAULT_PROVIDER[channel]).trim(),
    mode: String(input.mode || "own_credentials").trim(),
    config: mergeConfig(channel, input.config, storedConfig),
  };
}

function serializeIntegration(row, channel) {
  const config = decryptJson(row?.config_json);

  return {
    channel,
    enabled: Boolean(row?.enabled),
    provider: row?.provider || DEFAULT_PROVIDER[channel],
    mode: row?.mode || "own_credentials",
    has_config: Boolean(row?.config_json),
    config: maskConfig(config),
  };
}

function serializeIntegrations(rows = []) {
  const mapped = rows.reduce((acc, row) => ({ ...acc, [row.channel]: row }), {});
  return CHANNELS.map((channel) => serializeIntegration(mapped[channel], channel));
}

module.exports = {
  SECRET_MASK,
  isSecretKey,
  normalizeIntegrationInput,
  parseAllowedIps,
  serializeIntegrations,
};
