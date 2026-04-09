const communicationsService = require("../services/communicationsService");

async function send(req, res) {
  const data = await communicationsService.sendEntityEmail(req.auth, req.body);
  res.status(201).json({ data });
}

async function sendTestEmail(req, res) {
  const data = await communicationsService.sendTestEmail(req.auth, req.body);
  res.json({ data });
}

module.exports = {
  send,
  sendTestEmail,
};
