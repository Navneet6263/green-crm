export const CHANNEL_ORDER = ["call", "whatsapp", "sms", "attendance"];
export const CAPABILITY_ORDER = ["email", ...CHANNEL_ORDER];

export const CHANNEL_META = {
  email: { label: "Email", description: "Outbound email delivery using tenant SMTP first, then superadmin-approved GreenCall SMTP." },
  call: { label: "Calling", description: "Provider routing for outbound calls and click-to-call actions." },
  whatsapp: { label: "WhatsApp", description: "Message delivery for WhatsApp reminders and follow-ups." },
  sms: { label: "SMS", description: "Transactional SMS delivery for reminders and quick updates." },
  attendance: { label: "Attendance", description: "IP-based punch in and punch out control for office attendance." },
};

export const MODE_OPTIONS = [
  { value: "own_credentials", label: "Own credentials" },
  { value: "platform_credentials", label: "Platform credentials" },
];

export const PROVIDER_OPTIONS = {
  call: [
    { value: "exotel", label: "Exotel" },
    { value: "custom", label: "Custom" },
  ],
  whatsapp: [
    { value: "twilio", label: "Twilio" },
    { value: "custom", label: "Custom" },
  ],
  sms: [
    { value: "twilio", label: "Twilio" },
    { value: "custom", label: "Custom" },
  ],
  attendance: [{ value: "custom", label: "IP Rules" }],
};

export const MANAGED_SERVICE_PERMISSION_FIELDS = [
  { key: "can_use_platform_email", label: "Platform email", channel: "email", description: "Allows this company to use GreenCall SMTP when its own SMTP is not configured." },
  { key: "can_use_platform_call", label: "Platform calling", channel: "call", description: "Allows fallback to the shared calling provider when tenant credentials are unavailable." },
  { key: "can_use_platform_whatsapp", label: "Platform WhatsApp", channel: "whatsapp", description: "Allows fallback to the shared WhatsApp provider when tenant credentials are unavailable." },
  { key: "can_use_platform_sms", label: "Platform SMS", channel: "sms", description: "Allows fallback to the shared SMS provider when tenant credentials are unavailable." },
];

export const ADDITIONAL_PERMISSION_FIELDS = [
  { key: "can_use_attendance", label: "Attendance access", channel: "attendance", description: "Controls whether the tenant can use the shared attendance approval setup." },
];

export const CONFIG_FIELDS = {
  call: {
    exotel: [
      { key: "sid", label: "SID" },
      { key: "api_key", label: "API Key", secret: true },
      { key: "api_token", label: "API Token", secret: true },
      { key: "subdomain", label: "Subdomain" },
      { key: "caller_id", label: "Caller ID" },
      { key: "from_number", label: "Default From Number" },
      { key: "status_callback_url", label: "Forward Status Callback URL", full: true },
      { key: "webhook_secret", label: "Webhook Secret", secret: true },
      { key: "webhook_signature_header", label: "Signature Header", full: true },
    ],
    custom: [
      { key: "api_url", label: "API URL", full: true },
      { key: "api_key", label: "API Key", secret: true },
      { key: "caller_id", label: "Caller ID" },
      { key: "webhook_secret", label: "Webhook Secret", secret: true },
      { key: "webhook_signature_header", label: "Signature Header", full: true },
    ],
  },
  whatsapp: {
    twilio: [
      { key: "account_sid", label: "Account SID" },
      { key: "auth_token", label: "Auth Token", secret: true },
      { key: "from_number", label: "WhatsApp From Number" },
      { key: "status_callback_url", label: "Status Callback URL", full: true },
      { key: "webhook_secret", label: "Webhook Secret", secret: true },
      { key: "webhook_signature_header", label: "Signature Header", full: true },
    ],
    custom: [
      { key: "api_url", label: "API URL", full: true },
      { key: "api_key", label: "API Key", secret: true },
      { key: "sender_id", label: "Sender ID" },
      { key: "webhook_secret", label: "Webhook Secret", secret: true },
      { key: "webhook_signature_header", label: "Signature Header", full: true },
    ],
  },
  sms: {
    twilio: [
      { key: "account_sid", label: "Account SID" },
      { key: "auth_token", label: "Auth Token", secret: true },
      { key: "from_number", label: "SMS From Number" },
      { key: "status_callback_url", label: "Status Callback URL", full: true },
      { key: "webhook_secret", label: "Webhook Secret", secret: true },
      { key: "webhook_signature_header", label: "Signature Header", full: true },
    ],
    custom: [
      { key: "api_url", label: "API URL", full: true },
      { key: "api_key", label: "API Key", secret: true },
      { key: "sender_id", label: "Sender ID" },
      { key: "webhook_secret", label: "Webhook Secret", secret: true },
      { key: "webhook_signature_header", label: "Signature Header", full: true },
    ],
  },
  attendance: {
    custom: [{ key: "allowed_ips", label: "Allowed IPs", type: "textarea", rows: 4, full: true }],
  },
};
