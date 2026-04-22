const callLogRepository = require("../../repositories/callLogRepository");
const leadRepository = require("../../repositories/leadRepository");
const { buildPaginatedResult, parsePagination } = require("../../utils/pagination");
const { createPrefixedId } = require("../../utils/ids");
const leadService = require("../leadService");

async function createCallLog(auth, entityType, entity, provider, payload) {
  const callLogId = await createPrefixedId("clg");
  return callLogRepository.createCallLog({
    call_log_id: callLogId,
    company_id: entity.company_id,
    entity_type: entityType,
    entity_id: entityType === "lead" ? entity.lead_id : entity.customer_id,
    lead_id: entityType === "lead" ? entity.lead_id : null,
    customer_id: entityType === "customer" ? entity.customer_id : null,
    provider,
    reference_id: callLogId,
    from_number: payload.from_number || null,
    to_number: payload.to,
    status: "initiated",
    created_by: auth.userId,
  });
}

async function attachProviderResponse(callLogId, delivery, executor) {
  return callLogRepository.updateCallLog(
    callLogId,
    {
      call_sid: delivery.provider_message_id || null,
      status: delivery.status || "queued",
      provider_payload: delivery.raw || null,
      started_at: new Date(),
    },
    executor
  );
}

async function markCallFailed(callLogId, error, executor) {
  return callLogRepository.updateCallLog(
    callLogId,
    {
      status: "failed",
      ended_at: new Date(),
      provider_payload: { error: error.message || "Provider request failed." },
    },
    executor
  );
}

async function listLeadCalls(auth, leadId, query = {}) {
  const lead = await leadService.getLead(auth, leadId);
  const pagination = parsePagination(query);
  const { rows, total } = await callLogRepository.listLeadCalls(lead.lead_id, lead.company_id, pagination);
  return buildPaginatedResult(rows, total, pagination);
}

async function syncLeadCallState(callLog, executor) {
  if (!callLog?.lead_id) {
    return null;
  }

  const currentLead = await leadRepository.getLeadById(callLog.lead_id, callLog.company_id, executor);
  if (!currentLead) {
    return null;
  }

  return leadRepository.updateLead(
    callLog.lead_id,
    callLog.company_id,
    { last_contacted_at: callLog.ended_at || callLog.started_at || new Date() },
    executor
  );
}

module.exports = {
  attachProviderResponse,
  createCallLog,
  listLeadCalls,
  markCallFailed,
  syncLeadCallState,
};
