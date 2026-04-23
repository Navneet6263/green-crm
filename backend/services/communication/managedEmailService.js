const companyPermissionRepository = require("../../repositories/companyPermissionRepository");
const companyRepository = require("../../repositories/companyRepository");
const { PLATFORM_COMPANY_ID } = require("../../db/schema");
const AppError = require("../../utils/appError");
const emailService = require("../emailService");
const { MANAGED_SERVICE_DISABLED_MESSAGE } = require("./managedServiceConstants");

function buildCapability({ enabled, source, reason = null }) {
  return {
    channel: "email",
    enabled,
    provider: "smtp",
    mode: source === "platform" ? "platform_managed" : "own_credentials",
    source,
    reason,
  };
}

async function loadEmailContext(companyId) {
  const [company, permissions, platformCompany] = await Promise.all([
    companyRepository.getCompanyWithSettings(companyId),
    companyPermissionRepository.ensurePermissions(companyId),
    companyId === PLATFORM_COMPANY_ID
      ? Promise.resolve(null)
      : companyRepository.getCompanyWithSettings(PLATFORM_COMPANY_ID),
  ]);

  return { company, permissions, platformCompany };
}

function resolveEmailCapabilityFromContext({ company, permissions, platformCompany }) {
  if (emailService.hasTenantSmtpTransport(company)) {
    return buildCapability({ enabled: true, source: "tenant" });
  }

  if (company?.company_id === PLATFORM_COMPANY_ID) {
    return emailService.hasPlatformSmtpTransport(company)
      ? buildCapability({ enabled: true, source: "platform" })
      : buildCapability({ enabled: false, source: "platform", reason: "platform_email_unavailable" });
  }

  if (!permissions?.can_use_platform_email) {
    return buildCapability({ enabled: false, source: "platform", reason: "platform_access_not_enabled" });
  }

  return emailService.hasPlatformSmtpTransport(platformCompany)
    ? buildCapability({ enabled: true, source: "platform" })
    : buildCapability({ enabled: false, source: "platform", reason: "platform_email_unavailable" });
}

async function resolveEmailCapability(companyId) {
  const context = await loadEmailContext(companyId);
  return resolveEmailCapabilityFromContext(context);
}

async function sendManagedCustomEmail(companyId, payload) {
  const context = await loadEmailContext(companyId);
  const capability = resolveEmailCapabilityFromContext(context);
  const platformRoute = context.platformCompany || context.company;

  if (!capability.enabled) {
    throw new AppError(MANAGED_SERVICE_DISABLED_MESSAGE, 403);
  }

  return capability.source === "tenant"
    ? emailService.sendCustomEmail({ ...payload, company: context.company, platformCompany: null })
    : emailService.sendCustomEmail({ ...payload, company: null, platformCompany: platformRoute });
}

async function sendManagedTestEmail(companyId, payload) {
  const context = await loadEmailContext(companyId);
  const capability = resolveEmailCapabilityFromContext(context);
  const platformRoute = context.platformCompany || context.company;

  if (!capability.enabled) {
    throw new AppError(MANAGED_SERVICE_DISABLED_MESSAGE, 403);
  }

  return capability.source === "tenant"
    ? emailService.sendSmtpTestEmail({ ...payload, company: context.company, platformCompany: null })
    : emailService.sendSmtpTestEmail({ ...payload, company: null, platformCompany: platformRoute });
}

module.exports = {
  resolveEmailCapability,
  sendManagedCustomEmail,
  sendManagedTestEmail,
};
