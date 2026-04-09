const { ROLES } = require("../constants/roles");

const STAFF_LIMIT_ROLES = [
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.SALES,
  ROLES.MARKETING,
  ROLES.SUPPORT,
  ROLES.LEGAL_TEAM,
  ROLES.FINANCE_TEAM,
  ROLES.VIEWER,
];

function normalizeString(value) {
  return String(value ?? "").trim();
}

function readOptionalString(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function parseJsonObject(rawValue) {
  if (!rawValue) {
    return {};
  }

  if (typeof rawValue === "string") {
    try {
      const parsed = JSON.parse(rawValue);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (_error) {
      return {};
    }
  }

  return rawValue && typeof rawValue === "object" && !Array.isArray(rawValue) ? rawValue : {};
}

function normalizeNullableInteger(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.floor(parsed);
}

function mergeDeep(baseValue, patchValue) {
  const base = parseJsonObject(baseValue);
  const patch = parseJsonObject(patchValue);
  const merged = { ...base };

  Object.entries(patch).forEach(([key, value]) => {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === "object" &&
      !Array.isArray(base[key])
    ) {
      merged[key] = mergeDeep(base[key], value);
      return;
    }

    merged[key] = value;
  });

  return merged;
}

function normalizeStaffLimits(rawValue) {
  const source = parseJsonObject(rawValue);
  const limits = {};

  STAFF_LIMIT_ROLES.forEach((role) => {
    limits[role] = normalizeNullableInteger(source[role]);
  });

  return limits;
}

function normalizeAuthDelivery(rawValue) {
  const source = parseJsonObject(rawValue);

  return {
    login_url: readOptionalString(source.login_url),
    credentials_subject: readOptionalString(source.credentials_subject),
    credentials_heading: readOptionalString(source.credentials_heading),
    credentials_note: readOptionalString(source.credentials_note),
    reset_subject: readOptionalString(source.reset_subject),
  };
}

function normalizeSmtpProfile(rawValue) {
  const source = parseJsonObject(rawValue);

  return {
    from_email: readOptionalString(source.from_email),
    from_name: readOptionalString(source.from_name),
    reply_to: readOptionalString(source.reply_to),
  };
}

function parseCompanySettings(rawValue) {
  const settings = parseJsonObject(rawValue);
  const normalized = { ...settings };

  if (settings.staff_limits !== undefined) {
    normalized.staff_limits = normalizeStaffLimits(settings.staff_limits);
  }

  if (settings.auth_delivery !== undefined) {
    normalized.auth_delivery = normalizeAuthDelivery(settings.auth_delivery);
  }

  if (settings.smtp_profile !== undefined) {
    normalized.smtp_profile = normalizeSmtpProfile(settings.smtp_profile);
  }

  return normalized;
}

function buildServiceSettingsPatch(payload = {}) {
  const patch = {};

  if (Object.prototype.hasOwnProperty.call(payload, "service_settings")) {
    Object.assign(patch, parseCompanySettings(payload.service_settings));
  }

  if (Object.prototype.hasOwnProperty.call(payload, "staff_limits")) {
    patch.staff_limits = normalizeStaffLimits(payload.staff_limits);
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, "auth_delivery") ||
    Object.prototype.hasOwnProperty.call(payload, "login_url") ||
    Object.prototype.hasOwnProperty.call(payload, "credentials_subject") ||
    Object.prototype.hasOwnProperty.call(payload, "credentials_heading") ||
    Object.prototype.hasOwnProperty.call(payload, "credentials_note") ||
    Object.prototype.hasOwnProperty.call(payload, "reset_subject")
  ) {
    patch.auth_delivery = normalizeAuthDelivery({
      ...parseJsonObject(payload.auth_delivery),
      login_url: payload.login_url ?? parseJsonObject(payload.auth_delivery).login_url,
      credentials_subject:
        payload.credentials_subject ?? parseJsonObject(payload.auth_delivery).credentials_subject,
      credentials_heading:
        payload.credentials_heading ?? parseJsonObject(payload.auth_delivery).credentials_heading,
      credentials_note:
        payload.credentials_note ?? parseJsonObject(payload.auth_delivery).credentials_note,
      reset_subject: payload.reset_subject ?? parseJsonObject(payload.auth_delivery).reset_subject,
    });
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, "smtp_profile") ||
    Object.prototype.hasOwnProperty.call(payload, "smtp_from_email") ||
    Object.prototype.hasOwnProperty.call(payload, "smtp_from_name") ||
    Object.prototype.hasOwnProperty.call(payload, "smtp_reply_to")
  ) {
    patch.smtp_profile = normalizeSmtpProfile({
      ...parseJsonObject(payload.smtp_profile),
      from_email: payload.smtp_from_email ?? parseJsonObject(payload.smtp_profile).from_email,
      from_name: payload.smtp_from_name ?? parseJsonObject(payload.smtp_profile).from_name,
      reply_to: payload.smtp_reply_to ?? parseJsonObject(payload.smtp_profile).reply_to,
    });
  }

  return patch;
}

function getRoleLimit(rawSettings, role) {
  const settings = parseCompanySettings(rawSettings);
  const limits = settings.staff_limits || {};
  return Object.prototype.hasOwnProperty.call(limits, role) ? limits[role] : null;
}

module.exports = {
  STAFF_LIMIT_ROLES,
  buildServiceSettingsPatch,
  getRoleLimit,
  mergeDeep,
  normalizeAuthDelivery,
  normalizeSmtpProfile,
  normalizeStaffLimits,
  parseCompanySettings,
  parseJsonObject,
  readOptionalString,
};
