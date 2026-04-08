const notificationService = require("../services/notificationService");

async function list(req, res) {
  const data = await notificationService.listNotifications(req.auth, req.query);
  res.json(data);
}

async function markRead(req, res) {
  const data = await notificationService.markRead(req.auth, req.params.notifId);
  res.json({ data });
}

module.exports = {
  list,
  markRead,
};
