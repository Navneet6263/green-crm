const teamService = require("../services/teamService");

async function list(req, res) {
  const data = await teamService.listTeams(req.auth, req.query);
  res.json(data);
}

async function getOne(req, res) {
  const data = await teamService.getTeam(req.auth, req.params.teamId, req.query);
  res.json({ data });
}

async function listAssignableUsers(req, res) {
  const data = await teamService.listAssignableUsers(req.auth, req.params.teamId, req.query);
  res.json({ data });
}

async function create(req, res) {
  const data = await teamService.createTeam(req.auth, req.body);
  res.status(201).json({ data });
}

async function update(req, res) {
  const data = await teamService.updateTeam(req.auth, req.params.teamId, req.body);
  res.json({ data });
}

async function addMember(req, res) {
  const data = await teamService.addTeamMember(req.auth, req.params.teamId, req.body);
  res.json({ data });
}

async function removeMember(req, res) {
  const data = await teamService.removeTeamMember(req.auth, req.params.teamId, req.params.userId, req.query);
  res.json({ data });
}

async function addManager(req, res) {
  const data = await teamService.addTeamManager(req.auth, req.params.teamId, req.body);
  res.json({ data });
}

async function removeManager(req, res) {
  const data = await teamService.removeTeamManager(req.auth, req.params.teamId, req.params.userId, req.query);
  res.json({ data });
}

module.exports = {
  addManager,
  addMember,
  create,
  getOne,
  listAssignableUsers,
  list,
  removeManager,
  removeMember,
  update,
};
