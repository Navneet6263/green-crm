// backend/routes/leadTransfer.js
const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const db = require("../db/connection");
const { createPrefixedId } = require("../utils/ids");
const { assertRecordTeamAccess } = require("../services/accessScopeService");
const { listTransferRecipients, resolveTransferTeam } = require("../services/leads/crossTeamTransfer");
const { MANAGER_ROLES } = require("../constants/roles");
const AppError = require("../utils/appError");

const router = express.Router();

router.use(asyncHandler(authenticate));

// GET /api/lead-transfers/recipients?q= : anyone active in the company, so a lead can go to another team.
router.get("/lead-transfers/recipients", asyncHandler(async (req, res) => {
  res.json({ success: true, data: await listTransferRecipients(req.auth, req.query.q) });
}));

// POST /api/leads/:id/transfer
router.post("/leads/:id/transfer", asyncHandler(async (req, res) => {
  const { toUserId, note } = req.body;
  const leadIdentifier = req.params.id;

  if (!toUserId) {
    return res.status(400).json({ success: false, error: "toUserId is required" });
  }

  // Get lead details
  const [leadRows] = await db.query(
    "SELECT id, lead_id, company_name, contact_person, company_id, team_id, assigned_to, product_id, phone FROM leads WHERE is_active = 1 AND (id = TRY_CONVERT(BIGINT, ?) OR lead_id = ?)",
    [leadIdentifier, leadIdentifier]
  );
  const lead = leadRows[0];
  if (!lead) {
    return res.status(404).json({ success: false, error: "Lead not found" });
  }
  await assertRecordTeamAccess(req.auth, lead);
  if (!MANAGER_ROLES.includes(req.auth.role) && lead.assigned_to !== req.auth.userId) {
    throw new AppError("You can only transfer your own leads.", 403);
  }

  const leadName = lead.company_name || lead.contact_person || "Unnamed Lead";
  const fromUserName = req.auth.name || req.auth.email || "Unknown User";

  // Get target user details
  const [toUserRows] = await db.query(
    "SELECT id, user_id, name FROM users WHERE id = ? AND company_id = ? AND is_active = 1",
    [toUserId, lead.company_id]
  );
  const toUser = toUserRows[0];
  if (!toUser) {
    return res.status(404).json({ success: false, error: "Target recipient user not found" });
  }
  // Someone in another team is allowed: the lead moves to their team when they accept.
  const targetTeamId = await resolveTransferTeam(lead, toUser.user_id);

  const toUserName = toUser.name || "Unknown User";

  console.log(`[TRANSFER DEBUG] Transfer initiated for lead ${lead.id} (${leadName}) to user ${toUserId} (${toUserName}) by ${fromUserName}`);

  // INSERT into lead_transfers
  await db.query(
    `INSERT INTO lead_transfers (lead_id, lead_name, from_user_id, from_user_name, to_user_id, transfer_note, is_acknowledged)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [lead.id, leadName, req.auth.id, fromUserName, toUserId, note || ""]
  );

  // INSERT into lead_notes
  const teamNote = targetTeamId ? " (another team: the lead moves to their team when they accept)" : "";
  const activityNote = `Lead shared with ${toUserName} by ${fromUserName}${teamNote} — Note: ${note || ""}`;
  await db.query(
    `INSERT INTO lead_notes (company_id, lead_id, content, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, SYSUTCDATETIME(), SYSUTCDATETIME())`,
    [lead.company_id, lead.lead_id, activityNote, req.auth.userId]
  );

  // Create notification for the recipient
  const notifId = await createPrefixedId("ntf");
  await db.query(
    `INSERT INTO notifications (notif_id, company_id, user_id, title, message, type, lead_id, priority, actionable)
     VALUES (?, ?, ?, ?, ?, 'lead_transfer', ?, 'medium', 1)`,
    [
      notifId,
      lead.company_id,
      toUser.user_id,
      "Lead Transferred to You",
      `Lead "${leadName}" has been transferred to you by ${fromUserName}. Note: ${note || ""}`,
      lead.lead_id
    ]
  );

  res.json({ success: true, message: "Lead transferred successfully" });
}));

// GET /api/lead-transfers/pending
router.get("/lead-transfers/pending", asyncHandler(async (req, res) => {
  // Transfers sent to me show even when the lead sits in another team; accepting moves it to mine.
  const [transfers] = await db.query(
    `SELECT tr.* FROM lead_transfers tr INNER JOIN leads l ON l.id = tr.lead_id
     WHERE tr.to_user_id = ? AND tr.is_acknowledged = 0 AND l.company_id = ? AND l.is_active = 1
     ORDER BY tr.created_at ASC`,
    [req.auth.id, req.auth.companyId]
  );

  res.json({ success: true, data: transfers });
}));

// POST /api/lead-transfers/:id/acknowledge
router.post("/lead-transfers/:id/acknowledge", asyncHandler(async (req, res) => {
  const { note } = req.body;
  const transferId = req.params.id;

  const [transferRows] = await db.query(
    "SELECT * FROM lead_transfers WHERE id = ?",
    [transferId]
  );
  const transfer = transferRows[0];
  if (!transfer) {
    return res.status(404).json({ success: false, error: "Lead transfer not found" });
  }

  // Verify to_user_id matches currentUserId
  if (String(transfer.to_user_id) !== String(req.auth.id)) {
    return res.status(403).json({ success: false, error: "You are not authorized to acknowledge this transfer" });
  }
  // Re-check current ownership scope before assigning. If the recipient can no longer
  // work on this lead (deleted, or team changed since the transfer), the transfer is
  // still acknowledged so it stops reappearing, but the lead keeps its current owner.
  const [currentLeads] = await db.query(
    "SELECT lead_id, company_id, team_id, product_id, phone FROM leads WHERE id = ? AND is_active = 1",
    [transfer.lead_id]
  );
  let blockedReason = "";
  let moveToTeamId = null;
  if (!currentLeads[0] || currentLeads[0].company_id !== req.auth.companyId) {
    blockedReason = "This lead was deleted, so it could not be assigned to you.";
  } else {
    try {
      // null = I am in the lead's team; otherwise the lead moves to my team.
      moveToTeamId = await resolveTransferTeam(currentLeads[0], req.auth.userId);
    } catch (error) {
      if (!(error instanceof AppError) || error.statusCode >= 500) throw error;
      blockedReason = `${error.message} The lead stays with its current owner.`;
    }
  }

  console.log(`[TRANSFER DEBUG] Acknowledging transfer ${transferId} for lead ${transfer.lead_id}. Recipient user DB ID: ${transfer.to_user_id}`);

  // UPDATE lead_transfers SET is_acknowledged = 1, ack_note = :note, acknowledged_at = GETDATE()
  await db.query(
    `UPDATE lead_transfers
     SET is_acknowledged = 1,
         ack_note = ?,
         acknowledged_at = SYSUTCDATETIME()
     WHERE id = ?`,
    [note || "", transferId]
  );

  // Get recipient user's user_id string and role
  const [recipientUserRows] = await db.query(
    "SELECT user_id, role FROM users WHERE id = ?",
    [transfer.to_user_id]
  );
  const recipientUser = recipientUserRows[0];

  if (recipientUser && !blockedReason) {
    let isWorkflow = 0;
    let workflowStatus = null;
    if (recipientUser.role === "expert") {
      isWorkflow = 1;
      workflowStatus = "in_progress";
    }

    console.log(`[TRANSFER DEBUG] Recipient user ID: ${recipientUser.user_id}, role: ${recipientUser.role}. Setting is_workflow = ${isWorkflow}, workflow_status = ${workflowStatus}`);

    // Update the lead's assigned_to and workflow flags
    await db.query(
      `UPDATE leads
       SET assigned_to = ?,
           is_workflow = ?,
           workflow_status = ?${moveToTeamId ? ", team_id = ?" : ""}
       WHERE id = ?`,
      [recipientUser.user_id, isWorkflow, workflowStatus, ...(moveToTeamId ? [moveToTeamId] : []), transfer.lead_id]
    );

    console.log(`[TRANSFER DEBUG] Successfully updated assignment for lead ${transfer.lead_id} in leads table`);
  } else if (!blockedReason) {
    console.warn(`[TRANSFER DEBUG] Recipient user with DB ID ${transfer.to_user_id} not found`);
  }

  // Fetch lead details to obtain company_id and lead_id (string)
  const [leadRows] = await db.query(
    "SELECT lead_id, company_id FROM leads WHERE id = ?",
    [transfer.lead_id]
  );
  const lead = leadRows[0];

  if (lead) {
    const toUserName = req.auth.name || req.auth.email || "Unknown User";
    const outcome = blockedReason ? ` (not reassigned: ${blockedReason})` : moveToTeamId ? " (moved to their team)" : "";
    const ackNoteText = `Reviewed by ${toUserName} — Response: ${note || ""}${outcome}`;
    await db.query(
      `INSERT INTO lead_notes (company_id, lead_id, content, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, SYSUTCDATETIME(), SYSUTCDATETIME())`,
      [lead.company_id, lead.lead_id, ackNoteText, req.auth.userId]
    );
  }

  res.json({ success: true, data: { assigned: !blockedReason, message: blockedReason || "Lead assigned to you." } });
}));

module.exports = router;
