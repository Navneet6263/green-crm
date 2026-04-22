const { createProviderBase } = require("../shared/createProviderBase");
const { requestForm } = require("../shared/http");
const { normalizeDate, normalizeDuration, normalizeStatus, pickValue, verifyHmacSignature } = require("../shared/webhook");

const provider = createProviderBase("exotel");

function normalizeConfig(config = {}) {
  return {
    api_key: String(config.api_key || "").trim(),
    api_token: String(config.api_token || "").trim(),
    sid: String(config.sid || "").trim(),
    subdomain: String(config.subdomain || "api.in.exotel.com").trim(),
    caller_id: String(config.caller_id || "").trim(),
    from_number: String(config.from_number || "").trim(),
    status_callback_url: String(config.status_callback_url || "").trim(),
    webhook_secret: String(config.webhook_secret || "").trim(),
    webhook_signature_header: String(config.webhook_signature_header || "").trim(),
  };
}

function parseEvent(context) {
  return {
    provider: "exotel",
    call_sid: pickValue(context.body, ["Call.Sid", "CallSid", "Sid", "sid"]),
    reference_id: pickValue(context.body, ["Call.CustomField", "CustomField", "custom_field", "call_log_id"]),
    status: normalizeStatus(pickValue(context.body, ["Call.Status", "Status", "CallStatus", "status"])),
    duration_seconds: normalizeDuration(pickValue(context.body, ["Call.Duration", "Duration", "DialCallDuration", "duration"])),
    recording_url: pickValue(context.body, ["Call.RecordingUrl", "RecordingUrl", "recording_url"]),
    from_number: pickValue(context.body, ["Call.From", "From", "from", "from_number"]),
    to_number: pickValue(context.body, ["Call.To", "To", "to", "to_number"]),
    started_at: normalizeDate(pickValue(context.body, ["Call.StartTime", "StartTime", "start_time", "started_at"])),
    ended_at: normalizeDate(pickValue(context.body, ["Call.EndTime", "EndTime", "end_time", "ended_at"])),
    raw: context.body || {},
  };
}

module.exports = {
  ...provider,
  validateConfig(rawConfig) {
    const config = normalizeConfig(rawConfig);
    const valid = Boolean(config.api_key && config.api_token && config.sid && config.subdomain && config.caller_id);
    return { valid, errors: valid ? [] : ["Exotel requires api_key, api_token, sid, subdomain, and caller_id."] };
  },
  async initiateCall(payload, rawConfig) {
    const config = normalizeConfig(rawConfig);
    const from = String(payload.from_number || config.from_number || "").trim();
    const response = await requestForm(
      `https://${config.subdomain}/v1/Accounts/${config.sid}/Calls/connect`,
      {
        From: from,
        To: String(payload.to || "").trim(),
        CallerId: config.caller_id,
        StatusCallback: payload.status_callback_url || config.status_callback_url || undefined,
        CustomField: payload.reference_id || payload.entity_id || undefined,
      },
      { username: config.api_key, password: config.api_token }
    );

    return { provider: "exotel", status: "queued", provider_message_id: response.Call?.Sid || response.Call?.sid || response.sid || null, raw: response };
  },
  verifyWebhook(context, rawConfig) {
    const config = normalizeConfig(rawConfig);
    return verifyHmacSignature(context, {
      secret: config.webhook_secret,
      headerName: config.webhook_signature_header || "x-exotel-signature",
    });
  },
  parseWebhookEvent(context) {
    return parseEvent(context);
  },
  handleWebhook(payload = {}) {
    return parseEvent({ body: payload });
  },
};
