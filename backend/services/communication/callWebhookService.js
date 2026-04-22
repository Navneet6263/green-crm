const AppError = require("../../utils/appError");
const callLogRepository = require("../../repositories/callLogRepository");
const { resolveChannel } = require("./integrationResolver");
const { getProvider } = require("./providerFactory");
const { syncLeadCallState } = require("./callLogService");
const { verifyCallWebhookToken } = require("./webhookUrlService");

function isTerminalStatus(status) {
  return ["completed", "complete", "finished", "answered", "failed", "busy", "no_answer", "canceled"].includes(String(status || ""));
}

async function findCallLog(providerName, query = {}, body = {}) {
  const requestedId = String(query.call_log_id || body.call_log_id || "").trim();
  if (requestedId) {
    return callLogRepository.getByCallLogId(requestedId);
  }

  const referenceId = String(body.reference_id || body.custom_field || body.CustomField || "").trim();
  if (referenceId) {
    return callLogRepository.getByProviderReference(providerName, referenceId);
  }

  const callSid = String(body.call_sid || body.CallSid || body.sid || body.Sid || "").trim();
  return callSid ? callLogRepository.getByProviderCallSid(providerName, callSid) : null;
}

function buildUpdates(callLog, event) {
  const nextStatus = String(event.status || callLog.status || "initiated").trim().toLowerCase();
  return {
    call_sid: event.call_sid || callLog.call_sid || null,
    reference_id: event.reference_id || callLog.reference_id || null,
    status: nextStatus,
    duration_seconds: event.duration_seconds ?? callLog.duration_seconds ?? null,
    recording_url: event.recording_url || callLog.recording_url || null,
    from_number: event.from_number || callLog.from_number || null,
    to_number: event.to_number || callLog.to_number,
    started_at: event.started_at || callLog.started_at || null,
    ended_at: event.ended_at || (isTerminalStatus(nextStatus) ? new Date() : callLog.ended_at || null),
    provider_payload: event.raw || {},
  };
}

async function handleCallWebhook(providerName, req) {
  const callLog = await findCallLog(providerName, req.query, req.body || {});
  if (!callLog) {
    throw new AppError("Call log not found for webhook.", 404);
  }
  if (callLog.provider !== providerName) {
    throw new AppError("Webhook provider does not match the stored call log.", 400);
  }

  const token = String(req.query.token || req.body?.token || "").trim();
  if (!verifyCallWebhookToken(callLog.call_log_id, token)) {
    throw new AppError("Webhook token verification failed.", 401);
  }

  const capability = await resolveChannel(callLog.company_id, "call").catch(() => ({}));
  const provider = getProvider("call", providerName);
  const verification = provider.verifyWebhook(
    { headers: req.headers || {}, rawBody: req.rawBody || "", body: req.body || {}, query: req.query || {} },
    capability.config || {}
  );

  if (verification?.valid === false) {
    throw new AppError("Webhook signature verification failed.", 401);
  }

  const event = provider.parseWebhookEvent({ body: req.body || {}, headers: req.headers || {}, rawBody: req.rawBody || "", query: req.query || {} });
  const updatedCallLog = await callLogRepository.updateCallLog(callLog.call_log_id, buildUpdates(callLog, event));
  await syncLeadCallState(updatedCallLog);
  return updatedCallLog;
}

module.exports = {
  handleCallWebhook,
};
