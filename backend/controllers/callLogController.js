const callLogService = require("../services/communication/callLogService");

async function listLeadCalls(req, res) {
  const data = await callLogService.listLeadCalls(req.auth, req.params.leadId, req.query);
  res.json(data);
}

module.exports = {
  listLeadCalls,
};
