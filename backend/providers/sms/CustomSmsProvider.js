const { createProviderBase } = require("../shared/createProviderBase");
const { requestPostJson } = require("../shared/http");
const { verifyHmacSignature } = require("../shared/webhook");

const provider = createProviderBase("custom");

function normalizeConfig(config = {}) {
  return {
    api_url: String(config.api_url || "").trim(),
    api_key: String(config.api_key || "").trim(),
    sender_id: String(config.sender_id || "").trim(),
    webhook_secret: String(config.webhook_secret || "").trim(),
    webhook_signature_header: String(config.webhook_signature_header || "").trim(),
  };
}

module.exports = {
  ...provider,
  validateConfig(rawConfig) {
    const config = normalizeConfig(rawConfig);
    const valid = Boolean(config.api_url);

    return {
      valid,
      errors: valid ? [] : ["Custom SMS provider requires api_url."],
    };
  },
  async sendSMS(payload, rawConfig) {
    const config = normalizeConfig(rawConfig);
    const response = await requestPostJson(
      config.api_url,
      {
        to: payload.to,
        body: payload.body,
        sender_id: config.sender_id || null,
        reference_id: payload.reference_id || null,
      },
      config.api_key ? { Authorization: `Bearer ${config.api_key}` } : {}
    );

    return {
      provider: "custom",
      status: response.status || "queued",
      provider_message_id: response.message_id || response.id || null,
      raw: response,
    };
  },
  verifyWebhook(context, rawConfig) {
    const config = normalizeConfig(rawConfig);
    return verifyHmacSignature(context, {
      secret: config.webhook_secret,
      headerName: config.webhook_signature_header || "x-webhook-signature",
    });
  },
};
