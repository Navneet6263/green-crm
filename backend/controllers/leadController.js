const leadService = require("../services/leadService");

async function list(req, res) {
  const data = await leadService.listLeads(req.auth, req.query);
  res.json(data);
}

async function listMyLeads(req, res) {
  const data = await leadService.listMyLeads(req.auth, req.query);
  res.json(data);
}

async function listByProduct(req, res) {
  const data = await leadService.listLeads(req.auth, {
    ...req.query,
    product_id: req.params.productId,
  });
  res.json(data);
}

async function getOne(req, res) {
  const data = await leadService.getLead(req.auth, req.params.leadId);
  res.json({ data });
}

async function create(req, res) {
  const data = await leadService.createLead(req.auth, req.body);
  res.status(201).json({ success: true, document: data });
}

async function update(req, res) {
  const data = await leadService.updateLead(req.auth, req.params.leadId, req.body);
  res.json({ data });
}

async function remove(req, res) {
  const data = await leadService.deleteLead(req.auth, req.params.leadId, req.body);
  res.json({ data });
}

async function assign(req, res) {
  if (Array.isArray(req.body?.lead_ids)) {
    const data = await leadService.bulkAssignLeads(req.auth, req.body);
    res.json({ data });
    return;
  }

  const leadId = req.params.leadId || req.body.lead_id || req.body.id;
  const data = await leadService.assignLead(req.auth, leadId, req.body);
  res.json({ data });
}

async function assignments(req, res) {
  const data = await leadService.getLeadAssignments(req.auth, req.params.leadId);
  res.json({ data });
}

async function updateAssignments(req, res) {
  const data = await leadService.updateLeadAssignments(req.auth, req.params.leadId, req.body);
  res.json({ data });
}

async function removeAssignment(req, res) {
  const data = await leadService.removeLeadAssignment(
    req.auth,
    req.params.leadId,
    req.params.userId
  );
  res.json({ data });
}

async function activities(req, res) {
  const data = await leadService.listLeadActivities(req.auth, req.params.leadId, req.query);
  res.json(data);
}

async function addActivity(req, res) {
  const data = await leadService.addLeadActivity(req.auth, req.params.leadId, req.body);
  res.status(201).json({ data });
}

async function notes(req, res) {
  const data = await leadService.listLeadNotes(req.auth, req.params.leadId, req.query);
  res.json(data);
}

async function documents(req, res) {
  const data = await leadService.listLeadDocuments(req.auth, req.params.leadId);
  res.json({ data });
}

async function uploadDocument(req, res) {
  const data = await leadService.uploadLeadDocument(
    req.auth,
    req.params.leadId,
    {
      contentType: req.headers["content-type"],
      fileName: req.headers["x-file-name"],
    },
    req.body
  );
  res.status(201).json({ data });
}

async function addNote(req, res) {
  const data = await leadService.addLeadNote(req.auth, req.params.leadId, req.body);
  res.status(201).json({ data });
}

async function reminders(req, res) {
  const data = await leadService.listReminders(req.auth, req.query);
  res.json(data);
}

async function productStats(req, res) {
  const data = await leadService.getProductStats(req.auth, req.query);
  res.json({ data });
}

async function productHistory(req, res) {
  const data = await leadService.getUserProductHistory(req.auth, req.query);
  res.json({ data });
}

async function bulkUpload(req, res) {
  const data = await leadService.bulkUpload(req.auth, req.body);
  res.status(201).json({ data });
}

module.exports = {
  activities,
  addActivity,
  addNote,
  assign,
  assignments,
  bulkUpload,
  create,
  documents,
  getOne,
  list,
  listByProduct,
  listMyLeads,
  notes,
  productHistory,
  productStats,
  reminders,
  removeAssignment,
  remove,
  update,
  updateAssignments,
  uploadDocument,
};
