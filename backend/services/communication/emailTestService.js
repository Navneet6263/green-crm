const auditRepository = require("../../repositories/auditRepository");
const companyRepository = require("../../repositories/companyRepository");
const { ROLES } = require("../../constants/roles");
const { PLATFORM_COMPANY_ID } = require("../../db/schema");
const { createPrefixedId } = require("../../utils/ids");
const AppError = require("../../utils/appError");
const { assertCompanyAccess, getAccessibleCompanyIds } = require("../../utils/tenant");
const emailService = require("../emailService");

async function getPlatformCompany() {
  return companyRepository.getCompanyWithSettings(PLATFORM_COMPANY_ID);
}

async function resolveCompany(auth, requestedCompanyId) {
  if (auth.role === ROLES.ADMIN) {
    return companyRepository.getCompanyWithSettings(auth.companyId);
  }

  if (requestedCompanyId) {
    assertCompanyAccess(auth, requestedCompanyId);
    const company = await companyRepository.getCompanyWithSettings(requestedCompanyId);
    if (!company) {
      throw new AppError("Company not found.", 404);
    }
    return company;
  }

  if (auth.role === ROLES.PLATFORM_ADMIN && getAccessibleCompanyIds(auth).length === 1) {
    return companyRepository.getCompanyWithSettings(getAccessibleCompanyIds(auth)[0]);
  }

  throw new AppError("Select a company before sending a test email.", 400);
}

async function sendTestEmail(auth, payload) {
  if (![ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.ADMIN].includes(auth.role)) {
    throw new AppError("Only super admins, platform admins, and company admins can send SMTP test emails.", 403);
  }

  const to = String(payload.to || "").trim();
  if (!to) {
    throw new AppError("Recipient email is required.", 400);
  }

  const company = await resolveCompany(auth, payload.company_id || null);
  const delivery = await emailService.sendSmtpTestEmail({
    company,
    platformCompany: await getPlatformCompany(),
    to,
    requestedByName: auth.name || auth.email || "GreenCRM",
  });

  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: company?.company_id || PLATFORM_COMPANY_ID,
    action: "company.smtp_test_email_sent",
    performed_by: auth.userId,
    target_user: null,
    user_email: auth.email,
    user_role: auth.role,
    details: { company_id: company?.company_id || null, to, provider: delivery.provider },
  });

  return { company_id: company?.company_id || null, delivery };
}

module.exports = {
  sendTestEmail,
};
