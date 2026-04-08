const userService = require("../services/userService");

async function list(req, res) {
  const data = await userService.listUsers(req.auth, req.query);
  res.json(data);
}

async function create(req, res) {
  const data = await userService.createUser(req.auth, req.body);
  res.status(201).json({ data });
}

async function update(req, res) {
  const data = await userService.updateUser(req.auth, req.params.userId, req.body);
  res.json({ data });
}

async function toggle(req, res) {
  const data = await userService.toggleUser(req.auth, req.params.userId, req.body);
  res.json({ data });
}

async function remove(req, res) {
  const data = await userService.deleteUser(req.auth, req.params.userId);
  res.json({ data });
}

module.exports = {
  create,
  list,
  remove,
  toggle,
  update,
};
