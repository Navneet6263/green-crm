import { ACCESS_FEATURES, CREATE_COMPANY_INITIAL_STATE, ROLE_LIMIT_FIELDS, STATUS_STYLES } from "./company-config";

export function cn(...values) {
  return values.filter(Boolean).join(" ");
}

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

export function parseServiceSettings(rawValue) {
  const parsed = parseJson(rawValue);
  return {
    ...parsed,
    auth_delivery: parseJson(parsed.auth_delivery),
    smtp_profile: parseJson(parsed.smtp_profile),
    staff_limits: parseJson(parsed.staff_limits),
  };
}

export function createCompanyForm() {
  return { ...CREATE_COMPANY_INITIAL_STATE };
}

export function buildAccessState(rawValue) {
  const parsed = parseJson(rawValue);

  return ACCESS_FEATURES.reduce(
    (acc, feature) => ({
      ...acc,
      [feature.key]: feature.mandatory ? true : parsed[feature.key] !== false,
    }),
    {}
  );
}

export function buildSettingsDraft(company) {
  const settings = company?.settings || parseServiceSettings(company?.service_settings);
  const staffLimits = ROLE_LIMIT_FIELDS.reduce((acc, field) => {
    acc[field.key] = settings.staff_limits?.[field.key] ?? "";
    return acc;
  }, {});

  return {
    name: company?.name || "",
    contact_email: company?.contact_email || "",
    admin_email: company?.admin_email || "",
    contact_phone: company?.contact_phone || "",
    industry: company?.industry || "",
    website: company?.website || "",
    country: company?.country || "India",
    status: company?.status || "trial",
    settings_currency: company?.settings_currency || "INR",
    settings_timezone: company?.settings_timezone || "Asia/Kolkata",
    smtp_host: company?.smtp_host || "",
    smtp_port: company?.smtp_port ? String(company.smtp_port) : "",
    smtp_user: company?.smtp_user || "",
    smtp_password: "",
    smtp_from_email: settings.smtp_profile?.from_email || "",
    smtp_from_name: settings.smtp_profile?.from_name || "",
    smtp_reply_to: settings.smtp_profile?.reply_to || "",
    login_url: settings.auth_delivery?.login_url || "",
    credentials_subject: settings.auth_delivery?.credentials_subject || "",
    credentials_heading: settings.auth_delivery?.credentials_heading || "",
    credentials_note: settings.auth_delivery?.credentials_note || "",
    reset_subject: settings.auth_delivery?.reset_subject || "",
    test_email_to: company?.contact_email || company?.admin_email || "",
    staff_limits: staffLimits,
  };
}

export function normalizeCompanies(companies = []) {
  return companies.map((company) => ({
    ...company,
    access: buildAccessState(company.service_access),
    settings: parseServiceSettings(company.service_settings),
  }));
}

export function getEnabledFeatureCount(access = {}) {
  return ACCESS_FEATURES.filter((feature) => access[feature.key] !== false).length;
}

export function countLimitRoles(staffLimits = {}) {
  return ROLE_LIMIT_FIELDS.filter(
    (field) => staffLimits[field.key] !== "" && staffLimits[field.key] !== null && staffLimits[field.key] !== undefined
  ).length;
}

function getSmtpProfile(source = {}) {
  if (source.settings?.smtp_profile) {
    return source.settings.smtp_profile;
  }

  if (source.smtp_profile) {
    return parseJson(source.smtp_profile);
  }

  return {};
}

export function hasTenantSmtp(source = {}) {
  const smtpProfile = getSmtpProfile(source);
  return Boolean(
    source.smtp_host ||
      source.smtp_user ||
      source.smtp_from_email ||
      source.smtp_from_name ||
      smtpProfile.from_email ||
      smtpProfile.from_name
  );
}

export function describeSmtp(source = {}) {
  return hasTenantSmtp(source) ? "Tenant SMTP" : "Platform SMTP";
}

export function getStatusClasses(status) {
  return STATUS_STYLES[status] || STATUS_STYLES.trial;
}

export function titleize(value = "") {
  return String(value)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function avatar(value = "T") {
  return (
    String(value)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "T"
  );
}

export function buildCreateCompanyPayload(form) {
  return {
    ...form,
    smtp_port: form.smtp_port ? Number(form.smtp_port) : null,
    smtp_from_email: form.smtp_from_email || null,
    smtp_from_name: form.smtp_from_name || null,
    login_url: form.login_url || null,
  };
}

export function buildSettingsPayload(settingsDraft) {
  const body = {
    name: settingsDraft.name,
    contact_email: settingsDraft.contact_email,
    admin_email: settingsDraft.admin_email,
    contact_phone: settingsDraft.contact_phone,
    industry: settingsDraft.industry,
    website: settingsDraft.website,
    country: settingsDraft.country,
    status: settingsDraft.status,
    settings_currency: settingsDraft.settings_currency,
    settings_timezone: settingsDraft.settings_timezone,
    smtp_host: settingsDraft.smtp_host || null,
    smtp_port: settingsDraft.smtp_port ? Number(settingsDraft.smtp_port) : null,
    smtp_user: settingsDraft.smtp_user || null,
    smtp_from_email: settingsDraft.smtp_from_email || null,
    smtp_from_name: settingsDraft.smtp_from_name || null,
    smtp_reply_to: settingsDraft.smtp_reply_to || null,
    login_url: settingsDraft.login_url || null,
    credentials_subject: settingsDraft.credentials_subject || null,
    credentials_heading: settingsDraft.credentials_heading || null,
    credentials_note: settingsDraft.credentials_note || null,
    reset_subject: settingsDraft.reset_subject || null,
    staff_limits: ROLE_LIMIT_FIELDS.reduce(
      (acc, field) => ({
        ...acc,
        [field.key]: settingsDraft.staff_limits[field.key] === "" ? null : Number(settingsDraft.staff_limits[field.key]),
      }),
      {}
    ),
  };

  if (settingsDraft.smtp_password.trim()) {
    body.smtp_password = settingsDraft.smtp_password.trim();
  }

  return body;
}

export function getCompanyMetrics(companies = []) {
  return {
    total: companies.length,
    smtpReady: companies.filter((company) => hasTenantSmtp(company)).length,
    customLogin: companies.filter((company) => Boolean(company.settings?.auth_delivery?.login_url || company.settings?.login_url)).length,
    seatPolicies: companies.filter((company) => countLimitRoles(company.settings?.staff_limits)).length,
  };
}
