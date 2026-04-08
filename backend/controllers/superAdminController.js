const superAdminService = require("../services/superAdminService");

async function listUsers(req, res) {
  const data = await superAdminService.listAdminUsers(req.auth, req.query);
  res.json(data);
}

async function createSuperAdmin(req, res) {
  const data = await superAdminService.createSuperAdmin(req.auth, req.body);
  res.status(201).json({ data });
}

async function deactivate(req, res) {
  const data = await superAdminService.setActivation(req.auth, req.params.userId, false);
  res.json({ data });
}

async function activate(req, res) {
  const data = await superAdminService.setActivation(req.auth, req.params.userId, true);
  res.json({ data });
}

async function resetPassword(req, res) {
  const data = await superAdminService.resetPassword(req.auth, req.params.userId, req.body);
  res.json({ data });
}

async function safetyStatus(req, res) {
  const data = await superAdminService.getSafetyStatus(req.auth);
  res.json({ data });
}

module.exports = {
  activate,
  createSuperAdmin,
  deactivate,
  listUsers,
  resetPassword,
  safetyStatus,
};
