const companyService = require("../services/companyService");
const { publicCompany } = require("../utils/publicCompany");

async function list(req, res) {
  const data = await companyService.listCompanies(req.auth, req.query);
  res.json({ ...data, items: (data.items || []).map(publicCompany) });
}

async function getOne(req, res) {
  const data = await companyService.getCompany(req.auth, req.params.companyId);
  res.json({ data: publicCompany(data) });
}

async function create(req, res) {
  const data = await companyService.createCompany(req.auth, req.body);
  res.status(201).json({ data: { ...data, company: publicCompany(data.company) } });
}

async function update(req, res) {
  const data = await companyService.updateCompany(req.auth, req.params.companyId, req.body);
  res.json({ data: publicCompany(data) });
}

async function remove(req, res) {
  const data = await companyService.deleteCompany(req.auth, req.params.companyId);
  res.json({ data });
}

async function stats(req, res) {
  const data = await companyService.getCompanyStats(req.auth, req.params.companyId);
  res.json({ data });
}

module.exports = {
  create,
  getOne,
  list,
  remove,
  stats,
  update,
};
