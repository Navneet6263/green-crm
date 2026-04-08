const auditService = require("../services/auditService");

async function list(req, res) {
  const data = await auditService.listAuditLogs(req.auth, req.query);
  res.json(data);
}

module.exports = {
  list,
};
