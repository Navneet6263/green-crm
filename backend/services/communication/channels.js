const CHANNELS = ["call", "whatsapp", "sms", "attendance"];
const MANAGED_SERVICE_CHANNELS = ["call", "whatsapp", "sms"];
const PLATFORM_PERMISSION_KEY = {
  email: "can_use_platform_email",
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
  MANAGED_SERVICE_CHANNELS,
  PLATFORM_PERMISSION_KEY,
};
