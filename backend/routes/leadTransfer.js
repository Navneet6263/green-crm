// backend/routes/leadTransfer.js
const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const db = require("../db/connection");
const { createPrefixedId } = require("../utils/ids");

const router = express.Router();

router.use(asyncHandler(authenticate));

// POST /api/leads/:id/transfer
router.post("/leads/:id/transfer", asyncHandler(async (req, res) => {
  const { toUserId, note } = req.body;
  const leadIdentifier = req.params.id;

  if (!toUserId) {
    return res.status(400).json({ success: false, error: "toUserId is required" });
  }

  // Get lead details
  const [leadRows] = await db.query(
    "SELECT id, lead_id, company_name, contact_person, company_id FROM leads WHERE id = ? OR lead_id = ?",
    [leadIdentifier, leadIdentifier]
  );
  const lead = leadRows[0];
  if (!lead) {
    return res.status(404).json({ success: false, error: "Lead not found" });
  }

  const leadName = lead.company_name || lead.contact_person || "Unnamed Lead";
  const fromUserName = req.auth.name || req.auth.email || "Unknown User";

  // Get target user details
  const [toUserRows] = await db.query(
    "SELECT id, user_id, name FROM users WHERE id = ?",
    [toUserId]
  );
  const toUser = toUserRows[0];
  if (!toUser) {
    return res.status(404).json({ success: false, error: "Target recipient user not found" });
  }

  const toUserName = toUser.name || "Unknown User";

  // INSERT into lead_transfers
  await db.query(
    `INSERT INTO lead_transfers (lead_id, lead_name, from_user_id, from_user_name, to_user_id, transfer_note, is_acknowledged)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [lead.id, leadName, req.auth.id, fromUserName, toUserId, note || ""]
  );

  // INSERT into lead_notes
  const activityNote = `Lead shared with ${toUserName} by ${fromUserName} — Note: ${note || ""}`;
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
  const [transfers] = await db.query(
    `SELECT * FROM lead_transfers
     WHERE to_user_id = ? AND is_acknowledged = 0
     ORDER BY created_at ASC`,
    [req.auth.id]
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

  // UPDATE lead_transfers SET is_acknowledged = 1, ack_note = :note, acknowledged_at = GETDATE()
  await db.query(
    `UPDATE lead_transfers
     SET is_acknowledged = 1,
         ack_note = ?,
         acknowledged_at = SYSUTCDATETIME()
     WHERE id = ?`,
    [note || "", transferId]
  );

  // Fetch lead details to obtain company_id and lead_id (string)
  const [leadRows] = await db.query(
    "SELECT lead_id, company_id FROM leads WHERE id = ?",
    [transfer.lead_id]
  );
  const lead = leadRows[0];

  if (lead) {
    const toUserName = req.auth.name || req.auth.email || "Unknown User";
    const ackNoteText = `Reviewed by ${toUserName} — Response: ${note || ""}`;
    await db.query(
      `INSERT INTO lead_notes (company_id, lead_id, content, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, SYSUTCDATETIME(), SYSUTCDATETIME())`,
      [lead.company_id, lead.lead_id, ackNoteText, req.auth.userId]
    );
  }

  res.json({ success: true });
}));

module.exports = router;
