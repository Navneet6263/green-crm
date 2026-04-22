const db = require("../../db/connection");
const auditRepository = require("../../repositories/auditRepository");
const customerRepository = require("../../repositories/customerRepository");
const leadRepository = require("../../repositories/leadRepository");
const { createPrefixedId } = require("../../utils/ids");

function buildCustomerEntry(auth, channel, payload, sentAt) {
  return `[${sentAt.toISOString()}] ${auth.name || auth.email || "GreenCRM"}: ${channel.toUpperCase()} -> ${payload.to}${payload.body ? ` | ${payload.body}` : ""}`;
}

async function syncLead(auth, entity, channel, payload, delivery, transaction) {
  await leadRepository.createActivity(
    {
      activity_id: await createPrefixedId("act"),
      company_id: entity.company_id,
      lead_id: entity.lead_id,
      type: channel,
      description: `${channel.toUpperCase()} sent to ${payload.to}`,
      created_by: auth.userId,
    },
    transaction
  );

  const nextUpdates = {
    last_contacted_at: new Date(),
    total_interactions: Number(entity.total_interactions || 0) + 1,
  };

  if (channel === "call") {
    nextUpdates.calls_made = Number(entity.calls_made || 0) + 1;
  }

  return leadRepository.updateLead(entity.lead_id, entity.company_id, nextUpdates, transaction);
}

async function syncCustomer(auth, entity, channel, payload, transaction) {
  const sentAt = new Date();
  const nextNote = buildCustomerEntry(auth, channel, payload, sentAt);

  return customerRepository.updateCustomer(
    entity.customer_id,
    entity.company_id,
    {
      notes: entity.notes ? `${entity.notes}\n${nextNote}` : nextNote,
      last_interaction: sentAt,
    },
    transaction
  );
}

async function recordEntityCommunication(auth, entityType, entity, channel, payload, delivery) {
  const updatedEntity = await db.withTransaction(async (transaction) => {
    const nextEntity =
      entityType === "lead"
        ? await syncLead(auth, entity, channel, payload, delivery, transaction)
        : await syncCustomer(auth, entity, channel, payload, transaction);

    await auditRepository.createLog(
      {
        audit_id: await createPrefixedId("aud"),
        company_id: entity.company_id,
        action: `${entityType}.${channel}_sent`,
        performed_by: auth.userId,
        target_user: entity.assigned_to || entity.created_by || null,
        user_email: auth.email,
        user_role: auth.role,
        details: {
          provider: delivery.provider,
          provider_message_id: delivery.provider_message_id,
          to: payload.to,
        },
      },
      transaction
    );

    return nextEntity;
  });

  return {
    entity_type: entityType,
    entity: updatedEntity,
    delivery,
  };
}

module.exports = {
  recordEntityCommunication,
};
