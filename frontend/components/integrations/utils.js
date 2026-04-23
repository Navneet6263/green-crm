import { CHANNEL_ORDER, CONFIG_FIELDS, PROVIDER_OPTIONS } from "./config";

function findIntegration(data, channel) {
  return data?.integrations?.find((item) => item.channel === channel) || null;
}

function getDefaultProvider(channel) {
  return PROVIDER_OPTIONS[channel]?.[0]?.value || "custom";
}

function buildChannelDraft(data, channel) {
  const item = findIntegration(data, channel);

  return {
    channel,
    enabled: Boolean(item?.enabled),
    provider: item?.provider || getDefaultProvider(channel),
    mode: item?.mode || "own_credentials",
    has_config: Boolean(item?.has_config),
    config: { ...(item?.config || {}) },
  };
}

export function buildCommunicationDraft(data) {
  return {
    company_id: data?.company_id || "",
    capabilities: data?.capabilities || {},
    permissions: data?.permissions ?? null,
    integrations: CHANNEL_ORDER.reduce((acc, channel) => {
      acc[channel] = buildChannelDraft(data, channel);
      return acc;
    }, {}),
  };
}

export function buildCommunicationPayload(draft, includePermissions) {
  return {
    integrations: CHANNEL_ORDER.map((channel) => ({
      channel,
      enabled: Boolean(draft.integrations[channel]?.enabled),
      provider: draft.integrations[channel]?.provider || getDefaultProvider(channel),
      mode: draft.integrations[channel]?.mode || "own_credentials",
      config: draft.integrations[channel]?.config || {},
    })),
    ...(includePermissions ? { permissions: draft.permissions || {} } : {}),
  };
}

export function getConfigFields(channel, provider) {
  return CONFIG_FIELDS[channel]?.[provider] || [];
}

export function getCapabilityTone(capability) {
  return capability?.enabled
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-200 bg-white text-slate-500";
}

export function formatReason(reason) {
  return String(reason || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
