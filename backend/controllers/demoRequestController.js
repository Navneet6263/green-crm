const demoRequestService = require("../services/demoRequestService");

async function create(req, res) {
  const data = await demoRequestService.createDemoRequest(req.body);
  res.status(201).json({ data });
}

async function list(req, res) {
  const data = await demoRequestService.listDemoRequests(req.auth, req.query);
  res.json(data);
}

async function update(req, res) {
  const data = await demoRequestService.updateDemoRequest(req.auth, req.params.id, req.body);
  res.json({ data });
}

module.exports = {
  create,
  list,
  update,
};
