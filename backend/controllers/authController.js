const authService = require("../services/authService");
const userService = require("../services/userService");

async function register(req, res) {
  const data = await authService.registerCompany(req.body);
  res.status(201).json({ data });
}

async function login(req, res) {
  const data = await authService.login(req.body);
  res.json({ data });
}

async function checkAuth(req, res) {
  const data = await authService.checkAuth(req.auth);
  res.json({ data });
}

async function logout(req, res) {
  const data = await authService.logout(req.auth, req.tokenPayload);
  res.json({ data });
}

async function forgotPassword(req, res) {
  const data = await authService.forgotPassword(req.body);
  res.json({ data });
}

async function resetPassword(req, res) {
  const data = await authService.resetPassword(req.body);
  res.json({ data });
}

async function verify(req, res) {
  const data = await authService.verify(req.auth);
  res.json({ data });
}

async function me(req, res) {
  const data = await authService.getProfile(req.auth);
  res.json({ data });
}

async function updateProfile(req, res) {
  const data = await authService.updateProfile(req.auth, req.body);
  res.json({ data });
}

async function changePassword(req, res) {
  const data = await authService.changePassword(req.auth, req.body);
  res.json({ data });
}

async function listUsers(req, res) {
  const data = await userService.listUsers(req.auth, req.query);
  res.json(data);
}

async function createEmployee(req, res) {
  const data = await userService.createUser(req.auth, req.body);
  res.status(201).json({ data });
}

async function toggleUser(req, res) {
  const data = await userService.toggleUser(req.auth, req.params.id, req.body);
  res.json({ data });
}

async function updateUser(req, res) {
  const data = await userService.updateUser(req.auth, req.params.id, req.body);
  res.json({ data });
}

async function deleteUser(req, res) {
  const data = await userService.deleteUser(req.auth, req.params.id);
  res.json({ data });
}

async function superAdminStatus(req, res) {
  const data = await authService.getSuperAdminStatus();
  res.json({ data });
}

module.exports = {
  changePassword,
  checkAuth,
  createEmployee,
  deleteUser,
  forgotPassword,
  listUsers,
  login,
  logout,
  me,
  register,
  resetPassword,
  superAdminStatus,
  toggleUser,
  updateProfile,
  updateUser,
  verify,
};
