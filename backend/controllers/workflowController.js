const workflowService = require("../services/workflowService");

async function myAssigned(req, res) {
  const data = await workflowService.listMyAssigned(req.auth, req.query);
  res.json(data);
}

async function tracker(req, res) {
  const data = await workflowService.getTracker(req.auth, req.query);
  res.json(data);
}

async function myHistory(req, res) {
  const data = await workflowService.getMyHistory(req.auth, req.query);
  res.json(data);
}

async function usersByRole(req, res) {
  const data = await workflowService.listUsersByRole(req.auth, req.params.role);
  res.json({ data });
}

async function transferToLegal(req, res) {
  const data = await workflowService.transferToLegal(req.auth, req.params.leadId, req.body);
  res.json({ data });
}

async function transferToFinance(req, res) {
  const data = await workflowService.transferToFinance(req.auth, req.params.leadId, req.body);
  res.json({ data });
}

async function complete(req, res) {
  const data = await workflowService.completeWorkflow(req.auth, req.params.leadId, req.body);
  res.json({ data });
}

async function uploadLegal(req, res) {
  const data = await workflowService.uploadLegalDocument(req.auth, req.params.leadId, req.body);
  res.status(201).json({ data });
}

async function uploadFinance(req, res) {
  const data = await workflowService.uploadFinanceDocument(req.auth, req.params.leadId, req.body);
  res.status(201).json({ data });
}

async function deleteLegal(req, res) {
  const data = await workflowService.deleteLegalDocument(req.auth, req.params.leadId, req.params.docId);
  res.json({ data });
}

async function deleteFinance(req, res) {
  const data = await workflowService.deleteFinanceDocument(req.auth, req.params.leadId, req.params.docId);
  res.json({ data });
}

async function sendDocumentEmail(req, res) {
  const data = await workflowService.sendDocumentEmail(req.auth, req.body);
  res.json({ data });
}

module.exports = {
  complete,
  deleteFinance,
  deleteLegal,
  myAssigned,
  myHistory,
  sendDocumentEmail,
  tracker,
  transferToFinance,
  transferToLegal,
  uploadFinance,
  uploadLegal,
  usersByRole,
};
