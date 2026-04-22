const AppError = require("../../utils/appError");

const REGISTRY = {
  call: {
    exotel: () => require("../../providers/call/ExotelProvider"),
    custom: () => require("../../providers/call/CustomProvider"),
  },
  whatsapp: {
    twilio: () => require("../../providers/whatsapp/TwilioWhatsAppProvider"),
    custom: () => require("../../providers/whatsapp/CustomWhatsAppProvider"),
  },
  sms: {
    twilio: () => require("../../providers/sms/TwilioSmsProvider"),
    custom: () => require("../../providers/sms/CustomSmsProvider"),
  },
};

function getProvider(channel, providerName) {
  const providerLoader = REGISTRY[channel]?.[providerName];

  if (!providerLoader) {
    throw new AppError(`Unsupported provider ${providerName} for ${channel}.`, 400);
  }

  return providerLoader();
}

module.exports = {
  getProvider,
};
