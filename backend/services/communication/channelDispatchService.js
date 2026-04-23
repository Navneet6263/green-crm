const AppError = require("../../utils/appError");
const { loadEntity } = require("./entityResolver");
const { resolveChannel } = require("./integrationResolver");
const { getProvider } = require("./providerFactory");
const { recordEntityCommunication } = require("./entitySyncService");
const { MANAGED_SERVICE_DISABLED_MESSAGE } = require("./managedServiceConstants");

async function executeChannelAction(auth, channel, payload, methodName) {
  const entityType = String(payload.entity_type || "").trim().toLowerCase();
  const entityId = String(payload.entity_id || "").trim();
  const to = String(payload.to || "").trim();
  const body = String(payload.body || "").trim();

  if (!entityId || !to) {
    throw new AppError("entity_id and recipient are required.", 400);
  }

  if (["sms", "whatsapp"].includes(channel) && !body) {
    throw new AppError("Message body is required.", 400);
  }

  const entity = await loadEntity(auth, entityType, entityId);
  const capability = await resolveChannel(entity.company_id, channel);

  if (!capability.enabled) {
    throw new AppError(MANAGED_SERVICE_DISABLED_MESSAGE, 403);
  }

  const provider = getProvider(channel, capability.provider);
  const delivery = await provider[methodName](
    {
      ...payload,
      body,
      to,
      entity_id: entityId,
      entity_type: entityType,
    },
    capability.config
  );

  return recordEntityCommunication(auth, entityType, entity, channel, { to, body }, delivery);
}

module.exports = {
  executeChannelAction,
};
