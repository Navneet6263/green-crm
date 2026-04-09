const db = require("../db/connection");
const companyRepository = require("../repositories/companyRepository");
const customerRepository = require("../repositories/customerRepository");
const leadRepository = require("../repositories/leadRepository");
const auditRepository = require("../repositories/auditRepository");
const customerService = require("./customerService");
const emailService = require("./emailService");
const leadService = require("./leadService");
const { PLATFORM_COMPANY_ID } = require("../db/schema");
const { ROLES } = require("../constants/roles");
const { createPrefixedId } = require("../utils/ids");
const AppError = require("../utils/appError");
const { assertCompanyAccess, getAccessibleCompanyIds } = require("../utils/tenant");

async function getPlatformCompany() {
  return companyRepository.getCompanyWithSettings(PLATFORM_COMPANY_ID);
}

function appendCustomerEmailNote(existingNotes, auth, subject, body, sentAt) {
  const noteLines = [
    `[${sentAt.toISOString()}] ${auth.name || auth.email || "GreenCRM"}: Email sent | ${subject}`,
    body,
  ].filter(Boolean);
  const entry = noteLines.join("\n");

  return existingNotes ? `${existingNotes}\n${entry}` : entry;
}

async function sendLeadEmail(auth, payload, platformCompany) {
  const lead = await leadService.getLead(auth, payload.entity_id);
  const company = await companyRepository.getCompanyWithSettings(lead.company_id);
  const sentAt = new Date();
  const delivery = await emailService.sendCustomEmail({
    company,
    platformCompany,
    to: payload.to,
    subject: payload.subject,
    body: payload.body,
    heading: company?.name ? `${company.name} Lead Outreach` : "Lead Outreach",
  });

  const updatedLead = await db.withTransaction(async (transaction) => {
    await leadRepository.createActivity(
      {
        activity_id: await createPrefixedId("act"),
        company_id: lead.company_id,
        lead_id: lead.lead_id,
        type: "email",
        description: `Email sent to ${payload.to}: ${payload.subject}`,
        created_by: auth.userId,
      },
      transaction
    );

    const nextLead = await leadRepository.updateLead(
      lead.lead_id,
      lead.company_id,
      {
        emails_sent: Number(lead.emails_sent || 0) + 1,
        last_contacted_at: sentAt,
      },
      transaction
    );

    await auditRepository.createLog(
      {
        audit_id: await createPrefixedId("aud"),
        company_id: lead.company_id,
        action: "lead.email_sent",
        performed_by: auth.userId,
        target_user: lead.assigned_to || lead.created_by || null,
        user_email: auth.email,
        user_role: auth.role,
        details: {
          lead_id: lead.lead_id,
          to: payload.to,
          subject: payload.subject,
          delivery: delivery.delivery,
          provider: delivery.provider,
        },
      },
      transaction
    );

    return nextLead;
  });

  return {
    entity_type: "lead",
    entity: updatedLead,
    delivery,
  };
}

async function sendCustomerEmail(auth, payload, platformCompany) {
  const customer = await customerService.getCustomer(auth, payload.entity_id);
  const company = await companyRepository.getCompanyWithSettings(customer.company_id);
  const sentAt = new Date();
  const delivery = await emailService.sendCustomEmail({
    company,
    platformCompany,
    to: payload.to,
    subject: payload.subject,
    body: payload.body,
    heading: company?.name ? `${company.name} Customer Outreach` : "Customer Outreach",
  });

  const updatedCustomer = await db.withTransaction(async (transaction) => {
    const nextCustomer = await customerRepository.updateCustomer(
      customer.customer_id,
      customer.company_id,
      {
        notes: appendCustomerEmailNote(customer.notes, auth, payload.subject, payload.body, sentAt),
        last_interaction: sentAt,
      },
      transaction
    );

    await auditRepository.createLog(
      {
        audit_id: await createPrefixedId("aud"),
        company_id: customer.company_id,
        action: "customer.email_sent",
        performed_by: auth.userId,
        target_user: customer.assigned_to || null,
        user_email: auth.email,
        user_role: auth.role,
        details: {
          customer_id: customer.customer_id,
          to: payload.to,
          subject: payload.subject,
          delivery: delivery.delivery,
          provider: delivery.provider,
        },
      },
      transaction
    );

    return nextCustomer;
  });

  return {
    entity_type: "customer",
    entity: updatedCustomer,
    delivery,
  };
}

async function sendEntityEmail(auth, payload) {
  const entityType = String(payload.entity_type || "").trim().toLowerCase();
  const entityId = String(payload.entity_id || "").trim();
  const to = String(payload.to || "").trim();
  const subject = String(payload.subject || "").trim();
  const body = String(payload.body || "").trim();

  if (!["lead", "customer"].includes(entityType)) {
    throw new AppError("entity_type must be either lead or customer.", 400);
  }

  if (!entityId || !to || !subject || !body) {
    throw new AppError("Entity, recipient, subject, and body are required.", 400);
  }

  const platformCompany = await getPlatformCompany();

  if (entityType === "lead") {
    return sendLeadEmail(auth, { entity_id: entityId, to, subject, body }, platformCompany);
  }

  return sendCustomerEmail(auth, { entity_id: entityId, to, subject, body }, platformCompany);
}

async function resolveTestEmailCompany(auth, requestedCompanyId) {
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

  if (auth.role === ROLES.PLATFORM_ADMIN) {
    const managedCompanyIds = getAccessibleCompanyIds(auth);

    if (managedCompanyIds.length === 1) {
      return companyRepository.getCompanyWithSettings(managedCompanyIds[0]);
    }

    throw new AppError("Select a company before sending a test email.", 400);
  }

  return null;
}

async function sendTestEmail(auth, payload) {
  if (![ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.ADMIN].includes(auth.role)) {
    throw new AppError("Only super admins, platform admins, and company admins can send SMTP test emails.", 403);
  }

  const to = String(payload.to || "").trim();
  if (!to) {
    throw new AppError("Recipient email is required.", 400);
  }

  const company = await resolveTestEmailCompany(auth, payload.company_id || null);
  const platformCompany = await getPlatformCompany();
  const delivery = await emailService.sendSmtpTestEmail({
    company,
    platformCompany,
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
    details: {
      company_id: company?.company_id || null,
      to,
      delivery: delivery.delivery,
      provider: delivery.provider,
    },
  });

  return {
    company_id: company?.company_id || null,
    delivery,
  };
}

module.exports = {
  sendEntityEmail,
  sendTestEmail,
};
