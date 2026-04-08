const customerService = require("../services/customerService");

async function list(req, res) {
  const data = await customerService.listCustomers(req.auth, req.query);
  res.json(data);
}

async function getOne(req, res) {
  const data = await customerService.getCustomer(req.auth, req.params.customerId);
  res.json({ data });
}

async function create(req, res) {
  const data = await customerService.createCustomer(req.auth, req.body);
  res.status(201).json({ data });
}

async function update(req, res) {
  const data = await customerService.updateCustomer(req.auth, req.params.customerId, req.body);
  res.json({ data });
}

async function remove(req, res) {
  const data = await customerService.deleteCustomer(req.auth, req.params.customerId);
  res.json({ data });
}

async function addNote(req, res) {
  const data = await customerService.addCustomerNote(req.auth, req.params.customerId, req.body);
  res.json({ data });
}

async function addFollowUp(req, res) {
  const data = await customerService.addCustomerFollowUp(req.auth, req.params.customerId, req.body);
  res.json({ data });
}

module.exports = {
  addFollowUp,
  addNote,
  create,
  getOne,
  list,
  remove,
  update,
};
