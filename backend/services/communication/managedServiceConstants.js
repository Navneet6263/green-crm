const MANAGED_SERVICE_DISABLED_MESSAGE =
  "This service is not enabled for your company. Contact administrator.";

const MANAGED_SERVICE_PERMISSION_META = [
  { key: "can_use_platform_email", label: "platform_email" },
  { key: "can_use_platform_call", label: "platform_call" },
  { key: "can_use_platform_whatsapp", label: "platform_whatsapp" },
  { key: "can_use_platform_sms", label: "platform_sms" },
];

module.exports = {
  MANAGED_SERVICE_DISABLED_MESSAGE,
  MANAGED_SERVICE_PERMISSION_META,
};
