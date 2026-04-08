const taskService = require("../services/taskService");

async function list(req, res) {
  const data = await taskService.listTasks(req.auth, req.query);
  res.json(data);
}

async function getOne(req, res) {
  const data = await taskService.getTask(req.auth, req.params.taskId);
  res.json({ data });
}

async function create(req, res) {
  const data = await taskService.createTask(req.auth, req.body);
  res.status(201).json({ data });
}

async function update(req, res) {
  const data = await taskService.updateTask(req.auth, req.params.taskId, req.body);
  res.json({ data });
}

async function remove(req, res) {
  const data = await taskService.deleteTask(req.auth, req.params.taskId);
  res.json({ data });
}

module.exports = {
  create,
  getOne,
  list,
  remove,
  update,
};
