const { createProviderBase } = require("../shared/createProviderBase");
const { requestForm } = require("../shared/http");
const { verifyHmacSignature } = require("../shared/webhook");

const provider = createProviderBase("twilio");

function normalizeConfig(config = {}) {
  return {
    account_sid: String(config.account_sid || "").trim(),
    auth_token: String(config.auth_token || "").trim(),
    from_number: String(config.from_number || "").trim(),
    status_callback_url: String(config.status_callback_url || "").trim(),
    webhook_secret: String(config.webhook_secret || "").trim(),
    webhook_signature_header: String(config.webhook_signature_header || "").trim(),
  };
}

module.exports = {
  ...provider,
  validateConfig(rawConfig) {
    const config = normalizeConfig(rawConfig);
    const valid = Boolean(config.account_sid && config.auth_token && config.from_number);

    return {
      valid,
      errors: valid ? [] : ["Twilio SMS requires account_sid, auth_token, and from_number."],
    };
  },
  async sendSMS(payload, rawConfig) {
    const config = normalizeConfig(rawConfig);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.account_sid}/Messages.json`;
    const response = await requestForm(
      url,
      {
        From: config.from_number,
        To: payload.to,
        Body: payload.body,
        StatusCallback: config.status_callback_url || undefined,
      },
      { username: config.account_sid, password: config.auth_token }
    );

    return {
      provider: "twilio",
      status: response.status || "queued",
      provider_message_id: response.sid || null,
      raw: response,
    };
  },
  verifyWebhook(context, rawConfig) {
    const config = normalizeConfig(rawConfig);
    return verifyHmacSignature(context, {
      secret: config.webhook_secret,
      headerName: config.webhook_signature_header || "x-twilio-signature",
    });
  },
};
