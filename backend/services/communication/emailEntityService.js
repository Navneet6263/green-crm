const db = require("../../db/connection");
const auditRepository = require("../../repositories/auditRepository");
const companyRepository = require("../../repositories/companyRepository");
const customerRepository = require("../../repositories/customerRepository");
const leadRepository = require("../../repositories/leadRepository");
const { PLATFORM_COMPANY_ID } = require("../../db/schema");
const { createPrefixedId } = require("../../utils/ids");
const AppError = require("../../utils/appError");
const { parseRecipientList } = require("../../utils/emailRecipients");
const customerService = require("../customerService");
const emailService = require("../emailService");
const leadService = require("../leadService");

function appendCustomerEmailNote(existingNotes, auth, subject, body, sentAt, ccRecipients = []) {
  const ccNote = ccRecipients.length ? ` | CC: ${ccRecipients.join(", ")}` : "";
  const entry = `[${sentAt.toISOString()}] ${auth.name || auth.email || "GreenCRM"}: Email sent | ${subject}${ccNote}\n${body}`;
  return existingNotes ? `${existingNotes}\n${entry}` : entry;
}

async function getPlatformCompany() {
  return companyRepository.getCompanyWithSettings(PLATFORM_COMPANY_ID);
}

async function sendLeadEmail(auth, payload, platformCompany) {
  const lead = await leadService.getLead(auth, payload.entity_id);
  const company = await companyRepository.getCompanyWithSettings(lead.company_id);
  const sentAt = new Date();
  const ccRecipients = parseRecipientList(payload.cc);
  const delivery = await emailService.sendCustomEmail({
    company,
    platformCompany,
    to: payload.to,
    cc: ccRecipients,
    subject: payload.subject,
    body: payload.body,
    heading: company?.name ? `${company.name} Lead Outreach` : "Lead Outreach",
  });

  const entity = await db.withTransaction(async (transaction) => {
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

    const updatedLead = await leadRepository.updateLead(
      lead.lead_id,
      lead.company_id,
      {
        emails_sent: Number(lead.emails_sent || 0) + 1,
        total_interactions: Number(lead.total_interactions || 0) + 1,
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
          cc: ccRecipients,
          subject: payload.subject,
          provider: delivery.provider,
        },
      },
      transaction
    );

    return updatedLead;
  });

  return { entity_type: "lead", entity, delivery };
}

async function sendCustomerEmail(auth, payload, platformCompany) {
  const customer = await customerService.getCustomer(auth, payload.entity_id);
  const company = await companyRepository.getCompanyWithSettings(customer.company_id);
  const sentAt = new Date();
  const ccRecipients = parseRecipientList(payload.cc);
  const delivery = await emailService.sendCustomEmail({
    company,
    platformCompany,
    to: payload.to,
    cc: ccRecipients,
    subject: payload.subject,
    body: payload.body,
    heading: company?.name ? `${company.name} Customer Outreach` : "Customer Outreach",
  });

  const entity = await db.withTransaction(async (transaction) => {
    const updatedCustomer = await customerRepository.updateCustomer(
      customer.customer_id,
      customer.company_id,
      {
        notes: appendCustomerEmailNote(customer.notes, auth, payload.subject, payload.body, sentAt, ccRecipients),
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
          cc: ccRecipients,
          subject: payload.subject,
          provider: delivery.provider,
        },
      },
      transaction
    );

    return updatedCustomer;
  });

  return { entity_type: "customer", entity, delivery };
}

async function sendEntityEmail(auth, payload) {
  const entityType = String(payload.entity_type || "").trim().toLowerCase();
  if (!["lead", "customer"].includes(entityType)) {
    throw new AppError("entity_type must be either lead or customer.", 400);
  }

  if (!payload.entity_id || !payload.to || !payload.subject || !payload.body) {
    throw new AppError("Entity, recipient, subject, and body are required.", 400);
  }

  const platformCompany = await getPlatformCompany();
  return entityType === "lead"
    ? sendLeadEmail(auth, payload, platformCompany)
    : sendCustomerEmail(auth, payload, platformCompany);
}

module.exports = {
  sendEntityEmail,
};
