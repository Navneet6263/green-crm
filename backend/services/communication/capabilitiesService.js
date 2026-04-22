const { readCapabilityCache, writeCapabilityCache } = require("./capabilityCache");
const { resolveCapabilities } = require("./integrationResolver");

async function getCapabilities(companyId, options = {}) {
  if (!options.refresh) {
    const cached = await readCapabilityCache(companyId);
    if (cached) {
      return cached;
    }
  }

  return writeCapabilityCache(companyId, await resolveCapabilities(companyId));
}

module.exports = {
  getCapabilities,
};
