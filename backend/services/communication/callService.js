const AppError = require("../../utils/appError");
const { loadEntity } = require("./entityResolver");
const { resolveChannel } = require("./integrationResolver");
const { getProvider } = require("./providerFactory");
const { recordEntityCommunication } = require("./entitySyncService");
const { attachProviderResponse, createCallLog, markCallFailed } = require("./callLogService");
const { buildCallWebhookUrl } = require("./webhookUrlService");

async function initiateCall(auth, payload, req) {
  const entityType = String(payload.entity_type || "").trim().toLowerCase();
  const entityId = String(payload.entity_id || "").trim();
  const to = String(payload.to || "").trim();

  if (!entityId || !to) {
    throw new AppError("entity_id and recipient are required.", 400);
  }

  const [entity, capability] = await Promise.all([
    loadEntity(auth, entityType, entityId),
    resolveChannel(auth.companyId, "call"),
  ]);

  if (!capability.enabled) {
    throw new AppError("call is not enabled for this company.", 403);
  }

  const provider = getProvider("call", capability.provider);
  const initialLog = await createCallLog(auth, entityType, entity, capability.provider, {
    from_number: payload.from_number || auth.phone || null,
    to,
  });

  try {
    const delivery = await provider.initiateCall(
      {
        ...payload,
        to,
        entity_id: entityId,
        entity_type: entityType,
        from_number: payload.from_number || auth.phone || null,
        reference_id: initialLog.call_log_id,
        status_callback_url: buildCallWebhookUrl(req, capability.provider, initialLog.call_log_id),
      },
      capability.config
    );

    const callLog = await attachProviderResponse(initialLog.call_log_id, delivery);
    const response = await recordEntityCommunication(auth, entityType, entity, "call", { to, body: "" }, delivery);
    return { ...response, call_log: callLog };
  } catch (error) {
    await markCallFailed(initialLog.call_log_id, error).catch(() => null);
    throw error;
  }
}

module.exports = {
  initiateCall,
};
