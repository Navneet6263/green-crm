const companyCommunicationService = require("../../services/communication/companyCommunicationService");

async function getSettings(req, res) {
  const data = await companyCommunicationService.getCompanyCommunicationSettings(
    req.auth,
    req.params.companyId
  );

  res.json({ data });
}

async function updateSettings(req, res) {
  const data = await companyCommunicationService.updateCompanyCommunicationSettings(
    req.auth,
    req.params.companyId,
    req.body
  );

  res.json({ data });
}

module.exports = {
  getSettings,
  updateSettings,
};
