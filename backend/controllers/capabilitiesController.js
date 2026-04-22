const capabilitiesService = require("../services/communication/capabilitiesService");

async function getCapabilities(req, res) {
  const data = await capabilitiesService.getCapabilities(req.auth.companyId, {
    refresh: ["1", "true", "yes"].includes(String(req.query.refresh || "").toLowerCase()),
  });

  res.json({ data });
}

module.exports = {
  getCapabilities,
};
