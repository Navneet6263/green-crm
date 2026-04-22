const { createProviderBase } = require("../shared/createProviderBase");
const { requestPostJson } = require("../shared/http");
const { normalizeDate, normalizeDuration, normalizeStatus, pickValue, verifyHmacSignature } = require("../shared/webhook");

const provider = createProviderBase("custom");

function normalizeConfig(config = {}) {
  return {
    api_url: String(config.api_url || "").trim(),
    api_key: String(config.api_key || "").trim(),
    caller_id: String(config.caller_id || "").trim(),
    webhook_secret: String(config.webhook_secret || "").trim(),
    webhook_signature_header: String(config.webhook_signature_header || "").trim(),
  };
}

function parseEvent(context) {
  return {
    provider: "custom",
    call_sid: pickValue(context.body, ["call_sid", "call_id", "id"]),
    reference_id: pickValue(context.body, ["reference_id", "call_log_id", "custom_field"]),
    status: normalizeStatus(pickValue(context.body, ["status", "call_status", "event_type"])),
    duration_seconds: normalizeDuration(pickValue(context.body, ["duration_seconds", "duration"])),
    recording_url: pickValue(context.body, ["recording_url", "recording.file_url"]),
    from_number: pickValue(context.body, ["from_number", "from"]),
    to_number: pickValue(context.body, ["to_number", "to"]),
    started_at: normalizeDate(pickValue(context.body, ["started_at", "start_time"])),
    ended_at: normalizeDate(pickValue(context.body, ["ended_at", "end_time", "completed_at"])),
    raw: context.body || {},
  };
}

module.exports = {
  ...provider,
  validateConfig(rawConfig) {
    const config = normalizeConfig(rawConfig);
    return { valid: Boolean(config.api_url), errors: config.api_url ? [] : ["Custom call provider requires api_url."] };
  },
  async initiateCall(payload, rawConfig) {
    const config = normalizeConfig(rawConfig);
    const response = await requestPostJson(
      config.api_url,
      {
        from_number: payload.from_number || config.caller_id || null,
        to: payload.to,
        entity_id: payload.entity_id,
        entity_type: payload.entity_type,
        reference_id: payload.reference_id || null,
        status_callback_url: payload.status_callback_url || null,
      },
      config.api_key ? { Authorization: `Bearer ${config.api_key}` } : {}
    );

    return { provider: "custom", status: response.status || "queued", provider_message_id: response.call_id || response.id || null, raw: response };
  },
  verifyWebhook(context, rawConfig) {
    const config = normalizeConfig(rawConfig);
    return verifyHmacSignature(context, {
      secret: config.webhook_secret,
      headerName: config.webhook_signature_header || "x-webhook-signature",
    });
  },
  parseWebhookEvent(context) {
    return parseEvent(context);
  },
  handleWebhook(payload = {}) {
    return parseEvent({ body: payload });
  },
};
