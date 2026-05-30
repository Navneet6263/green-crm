const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const workflowController = require("../controllers/workflowController");

const router = express.Router();
const multipartUpload = express.raw({
  limit: "10mb",
  type: (req) => String(req.headers["content-type"] || "").toLowerCase().includes("multipart/form-data"),
});

router.use(asyncHandler(authenticate));

router.get("/my-assigned", asyncHandler(workflowController.myAssigned));
router.get("/tracker", asyncHandler(workflowController.tracker));
router.get("/my-history", asyncHandler(workflowController.myHistory));
router.get("/users/:role", asyncHandler(workflowController.usersByRole));
router.post("/:leadId/transfer-to-legal", asyncHandler(workflowController.transferToLegal));
router.post("/:leadId/transfer-to-finance", asyncHandler(workflowController.transferToFinance));
router.post("/:leadId/complete", asyncHandler(workflowController.complete));
router.post("/:leadId/legal/upload", multipartUpload, asyncHandler(workflowController.uploadLegal));
router.post("/:leadId/finance/upload", multipartUpload, asyncHandler(workflowController.uploadFinance));
router.delete("/:leadId/legal/delete/:docId", asyncHandler(workflowController.deleteLegal));
router.delete("/:leadId/finance/delete/:docId", asyncHandler(workflowController.deleteFinance));
router.post("/send-document-email", asyncHandler(workflowController.sendDocumentEmail));

// Workflow task action endpoints
const db = require("../db/connection");
const { createPrefixedId } = require("../utils/ids");

router.post(
  "/:leadId/upload",
  express.raw({ type: () => true, limit: "10mb" }),
  asyncHandler(async (req, res) => {
    const [leads] = await db.query(
      "SELECT * FROM leads WHERE lead_id = ? AND company_id = ?",
      [req.params.leadId, req.auth.companyId]
    );
    const lead = leads[0];
    if (!lead) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }

    if (lead.assigned_to !== req.auth.userId && !["admin", "manager", "super-admin", "platform-admin"].includes(req.auth.role)) {
      return res.status(403).json({ success: false, error: "Not authorized to upload files for this workflow" });
    }

    const contentType = req.headers["content-type"];
    const fileName = req.headers["x-file-name"] ? decodeURIComponent(req.headers["x-file-name"]) : "document";

    const { storeLeadDocument } = require("../services/leadDocumentStorageService");
    const storedDocument = await storeLeadDocument({
      buffer: req.body,
      companyId: lead.company_id,
      contentType: String(contentType || "application/octet-stream").trim().toLowerCase(),
      documentType: "general",
      fileName: fileName,
      leadId: lead.lead_id,
    });

    res.status(201).json({
      success: true,
      data: {
        file_name: storedDocument.fileName,
        file_url: storedDocument.fileUrl,
        file_size: storedDocument.fileSize,
        content_type: storedDocument.contentType
      }
    });
  })
);

router.post("/:leadId/submit", asyncHandler(async (req, res) => {
  const [leads] = await db.query(
    "SELECT * FROM leads WHERE lead_id = ? AND company_id = ?",
    [req.params.leadId, req.auth.companyId]
  );
  const lead = leads[0];
  if (!lead) {
    return res.status(404).json({ success: false, error: "Lead not found" });
  }

  if (lead.assigned_to !== req.auth.userId) {
    return res.status(403).json({ success: false, error: "You are not the assigned expert for this lead" });
  }

  if (lead.workflow_status !== "in_progress" && lead.workflow_status !== "revisions_needed") {
    return res.status(400).json({ success: false, error: "Lead workflow is not in a submittable state" });
  }

  const { completedFiles, quality, expertNotes, expertLink } = req.body;
  const completedFilesStr = completedFiles && typeof completedFiles === "object" ? JSON.stringify(completedFiles) : (completedFiles || null);

  await db.query(
    `UPDATE leads 
     SET workflow_status = 'pending_qa',
         completed_files = ?,
         quality = ?,
         expert_notes = ?,
         expert_link = ?,
         updated_at = SYSUTCDATETIME()
     WHERE lead_id = ? AND company_id = ?`,
    [completedFilesStr, quality || null, expertNotes || null, expertLink || null, lead.lead_id, req.auth.companyId]
  );

  const [admins] = await db.query(
    "SELECT user_id FROM users WHERE company_id = ? AND role = 'admin'",
    [req.auth.companyId]
  );
  for (const adm of admins) {
    const notifId = await createPrefixedId("ntf");
    await db.query(
      `INSERT INTO notifications (notif_id, company_id, user_id, title, message, type, lead_id, priority, actionable, created_at)
       VALUES (?, ?, ?, 'Expert Work Submitted', ?, 'workflow_submit', ?, 'medium', 1, SYSUTCDATETIME())`,
      [notifId, req.auth.companyId, adm.user_id, `Expert "${req.auth.name}" has submitted work for lead "${lead.company_name}". Quality: ${quality || 'Basic'}.`, lead.lead_id]
    );
  }

  const activityId = await createPrefixedId("act");
  await db.query(
    `INSERT INTO lead_activities (activity_id, company_id, lead_id, type, description, created_by, created_at)
     VALUES (?, ?, ?, 'updated', ?, ?, SYSUTCDATETIME())`,
    [activityId, lead.company_id, lead.lead_id, `Expert submitted work for review. Quality: ${quality || 'Basic'}.`, req.auth.userId]
  );

  const [updatedLeads] = await db.query(
    "SELECT * FROM leads WHERE lead_id = ? AND company_id = ?",
    [lead.lead_id, req.auth.companyId]
  );
  const updated = updatedLeads[0];
  const masked = {
    ...updated,
    phone: null,
    email: null,
    whatsapp: null,
    customer_phone: null,
    customer_email: null,
    customer_whatsapp: null,
    total_lead_value: null,
    advance_received: null,
    remaining_payment: null,
  };

  res.json({ success: true, lead: masked });
}));

router.post("/:leadId/review", asyncHandler(async (req, res) => {
  if (!["admin", "manager", "super-admin", "platform-admin"].includes(req.auth.role)) {
    return res.status(403).json({ success: false, error: "Only admins and managers can review work" });
  }

  const [leads] = await db.query(
    "SELECT * FROM leads WHERE lead_id = ? AND company_id = ?",
    [req.params.leadId, req.auth.companyId]
  );
  const lead = leads[0];
  if (!lead) {
    return res.status(404).json({ success: false, error: "Lead not found" });
  }

  if (lead.workflow_status !== "pending_qa") {
    return res.status(400).json({ success: false, error: "Work is not pending review" });
  }

  const { action, comments } = req.body;
  const newStatus = action === "approve" ? "approved" : "revisions_needed";

  await db.query(
    `UPDATE leads 
     SET workflow_status = ?,
         admin_comments = ?,
         updated_at = SYSUTCDATETIME()
     WHERE lead_id = ? AND company_id = ?`,
    [newStatus, comments || null, lead.lead_id, req.auth.companyId]
  );

  if (lead.assigned_to) {
    const notifId = await createPrefixedId("ntf");
    await db.query(
      `INSERT INTO notifications (notif_id, company_id, user_id, title, message, type, lead_id, priority, actionable, created_at)
       VALUES (?, ?, ?, ?, ?, 'workflow_review', ?, 'medium', 1, SYSUTCDATETIME())`,
      [
        notifId,
        req.auth.companyId,
        lead.assigned_to,
        action === "approve" ? "Work Approved" : "Revisions Requested",
        `Your submission for "${lead.company_name}" has been ${action === "approve" ? "approved" : "rejected"}. Comments: ${comments || ""}`,
        lead.lead_id
      ]
    );
  }

  const activityId = await createPrefixedId("act");
  await db.query(
    `INSERT INTO lead_activities (activity_id, company_id, lead_id, type, description, created_by, created_at)
     VALUES (?, ?, ?, 'updated', ?, ?, SYSUTCDATETIME())`,
    [activityId, lead.company_id, lead.lead_id, `Admin/Manager reviewed work: ${newStatus}. Comments: ${comments || ""}`, req.auth.userId]
  );

  const [updatedLeads] = await db.query(
    "SELECT * FROM leads WHERE lead_id = ? AND company_id = ?",
    [lead.lead_id, req.auth.companyId]
  );
  res.json({ success: true, lead: updatedLeads[0] });
}));

router.post("/:leadId/deliver", asyncHandler(async (req, res) => {
  if (!["sales", "admin", "manager", "super-admin"].includes(req.auth.role)) {
    return res.status(403).json({ success: false, error: "Not authorized to deliver work" });
  }

  const [leads] = await db.query(
    "SELECT * FROM leads WHERE lead_id = ? AND company_id = ?",
    [req.params.leadId, req.auth.companyId]
  );
  const lead = leads[0];
  if (!lead) {
    return res.status(404).json({ success: false, error: "Lead not found" });
  }

  await db.query(
    `UPDATE leads 
     SET workflow_status = 'completed',
         updated_at = SYSUTCDATETIME()
     WHERE lead_id = ? AND company_id = ?`,
    [lead.lead_id, req.auth.companyId]
  );

  const activityId = await createPrefixedId("act");
  await db.query(
    `INSERT INTO lead_activities (activity_id, company_id, lead_id, type, description, created_by, created_at)
     VALUES (?, ?, ?, 'updated', 'Work delivered to customer.', ?, SYSUTCDATETIME())`,
    [activityId, lead.company_id, lead.lead_id, req.auth.userId]
  );

  const [updatedLeads] = await db.query(
    "SELECT * FROM leads WHERE lead_id = ? AND company_id = ?",
    [lead.lead_id, req.auth.companyId]
  );
  res.json({ success: true, lead: updatedLeads[0] });
}));

module.exports = router;
