const CHANNELS = ["call", "whatsapp", "sms", "attendance"];
const PLATFORM_PERMISSION_KEY = {
  call: "can_use_platform_call",
  whatsapp: "can_use_platform_whatsapp",
  sms: "can_use_platform_sms",
  attendance: "can_use_attendance",
};

const DEFAULT_PROVIDER = {
  call: "exotel",
  whatsapp: "twilio",
  sms: "twilio",
  attendance: "custom",
};

module.exports = {
  CHANNELS,
  DEFAULT_PROVIDER,
  PLATFORM_PERMISSION_KEY,
};
