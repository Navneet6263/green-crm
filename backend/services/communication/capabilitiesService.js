const { readCapabilityCache, writeCapabilityCache } = require("./capabilityCache");
const { resolveEmailCapability } = require("./managedEmailService");
const { resolveCapabilities } = require("./integrationResolver");

async function getCapabilities(companyId, options = {}) {
  if (!options.refresh) {
    const cached = await readCapabilityCache(companyId);
    if (cached) {
      return cached;
    }
  }

  const [channelCapabilities, emailCapability] = await Promise.all([
    resolveCapabilities(companyId),
    resolveEmailCapability(companyId),
  ]);

  return writeCapabilityCache(companyId, {
    email: emailCapability,
    ...channelCapabilities,
  });
}

module.exports = {
  getCapabilities,
};
