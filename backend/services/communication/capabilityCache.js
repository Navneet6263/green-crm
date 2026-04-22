const { deleteKey, deletePrefix, getJson, setJson } = require("../cache/cacheStore");
const { capabilitiesKey } = require("./cacheKeys");

function getTtlSeconds() {
  const parsed = Number(process.env.COMMUNICATION_CAPABILITY_CACHE_TTL_SECONDS || process.env.COMMUNICATION_CACHE_TTL_SECONDS || 30);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 30;
}

async function readCapabilityCache(companyId) {
  return getJson(capabilitiesKey(companyId));
}

async function writeCapabilityCache(companyId, value) {
  return setJson(capabilitiesKey(companyId), value, getTtlSeconds());
}

async function clearCapabilityCache(companyId) {
  if (!companyId) {
    await deletePrefix("communications:capabilities:");
    return;
  }

  await deleteKey(capabilitiesKey(companyId));
}

module.exports = {
  clearCapabilityCache,
  readCapabilityCache,
  writeCapabilityCache,
};
