const AppError = require("../../utils/appError");

function unsupported(method, provider) {
  throw new AppError(`${provider} does not support ${method}.`, 400);
}

function createProviderBase(provider) {
  return {
    provider,
    validateConfig() {
      return { valid: true };
    },
    initiateCall() {
      unsupported("initiateCall", provider);
    },
    sendMessage() {
      unsupported("sendMessage", provider);
    },
    sendSMS() {
      unsupported("sendSMS", provider);
    },
    handleWebhook(payload = {}) {
      return {
        provider,
        received: true,
        payload,
      };
    },
    verifyWebhook() {
      return { valid: true };
    },
    parseWebhookEvent(context = {}) {
      return {
        provider,
        raw: context.body || {},
      };
    },
  };
}

module.exports = {
  createProviderBase,
};
