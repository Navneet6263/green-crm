/**
 * Customer Activity Repository
 *
 * Proper activity/timeline table for customers — same pattern as lead_activities.
 * Every note, edit, member add/remove, follow-up, and status change gets logged here.
 */

const db = require("../db/connection");

const SQL_NOW = "SYSUTCDATETIME()";

function getExecutor(executor) {
  return executor || db;
}

/**
 * Log a new activity entry for a customer.
 * @param {object} activity
 * @param {string} activity.company_id
 * @param {string} activity.customer_id
 * @param {string} activity.type        - "note" | "updated" | "member_added" | "member_removed" | "follow_up" | "status_changed" | "created"
 * @param {string} activity.description - Human-readable summary
 * @param {string} activity.created_by  - user_id of actor
 */
async function createActivity(activity, executor) {
  const active = getExecutor(executor);
  await active.query(
    `INSERT INTO customer_activities
       (company_id, customer_id, type, description, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ${SQL_NOW})`,
    [
      activity.company_id,
      activity.customer_id,
      activity.type || "updated",
      activity.description || null,
      activity.created_by || null,
    ]
  );
}

/**
 * List activities for a customer, newest first, with pagination.
 */
async function listActivities(customerId, companyId, pagination, executor) {
  const active = getExecutor(executor);

  const [countRows] = await active.query(
    `SELECT COUNT(*) AS total FROM customer_activities WHERE customer_id = ? AND company_id = ?`,
    [customerId, companyId]
  );

  const [rows] = await active.query(
    `SELECT ca.*, u.name AS created_by_name
     FROM customer_activities ca
     LEFT JOIN users u ON u.user_id = ca.created_by
     WHERE ca.customer_id = ? AND ca.company_id = ?
     ORDER BY ca.created_at DESC, ca.id DESC
     OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`,
    [customerId, companyId, pagination.offset, pagination.limit]
  );

  return { rows, total: countRows[0].total };
}

module.exports = { createActivity, listActivities };
