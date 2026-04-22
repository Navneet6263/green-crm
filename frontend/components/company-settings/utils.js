export function parseJson(rawValue) {
  if (!rawValue) return {};
  if (typeof rawValue === "string") {
    try {
      return JSON.parse(rawValue);
    } catch (_error) {
      return {};
    }
  }
  return typeof rawValue === "object" ? rawValue : {};
}

export function buildDraft(company) {
  const settings = parseJson(company?.service_settings);
  const authDelivery = parseJson(settings.auth_delivery);
  const smtpProfile = parseJson(settings.smtp_profile);

  return {
    name: company?.name || "",
    contact_email: company?.contact_email || "",
    admin_email: company?.admin_email || "",
    contact_phone: company?.contact_phone || "",
    industry: company?.industry || "",
    website: company?.website || "",
    country: company?.country || "India",
    settings_currency: company?.settings_currency || "INR",
    settings_timezone: company?.settings_timezone || "Asia/Kolkata",
    smtp_host: company?.smtp_host || "",
    smtp_port: company?.smtp_port ? String(company.smtp_port) : "",
    smtp_user: company?.smtp_user || "",
    smtp_password: "",
    smtp_from_email: smtpProfile.from_email || "",
    smtp_from_name: smtpProfile.from_name || "",
    smtp_reply_to: smtpProfile.reply_to || "",
    login_url: authDelivery.login_url || "",
    credentials_subject: authDelivery.credentials_subject || "",
    credentials_heading: authDelivery.credentials_heading || "",
    credentials_note: authDelivery.credentials_note || "",
    reset_subject: authDelivery.reset_subject || "",
    test_email_to: company?.contact_email || company?.admin_email || "",
  };
}
