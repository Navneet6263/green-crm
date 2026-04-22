const db = require("../db/connection");

function getExecutor(executor) {
  return executor || db;
}

async function getByCallLogId(callLogId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query("SELECT TOP 1 * FROM call_logs WHERE call_log_id = ?", [callLogId]);
  return rows[0] || null;
}

async function getByProviderCallSid(provider, callSid, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query("SELECT TOP 1 * FROM call_logs WHERE provider = ? AND call_sid = ?", [provider, callSid]);
  return rows[0] || null;
}

async function getByProviderReference(provider, referenceId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query("SELECT TOP 1 * FROM call_logs WHERE provider = ? AND reference_id = ?", [provider, referenceId]);
  return rows[0] || null;
}

async function createCallLog(callLog, executor) {
  const active = getExecutor(executor);
  await active.query(
    `INSERT INTO call_logs (
      call_log_id, company_id, entity_type, entity_id, lead_id, customer_id, provider,
      call_sid, reference_id, from_number, to_number, duration_seconds, status,
      recording_url, provider_payload, started_at, ended_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      callLog.call_log_id, callLog.company_id, callLog.entity_type, callLog.entity_id,
      callLog.lead_id || null, callLog.customer_id || null, callLog.provider,
      callLog.call_sid || null, callLog.reference_id || null, callLog.from_number || null,
      callLog.to_number, callLog.duration_seconds ?? null, callLog.status || "initiated",
      callLog.recording_url || null, callLog.provider_payload || null, callLog.started_at || null,
      callLog.ended_at || null, callLog.created_by || null,
    ]
  );

  return getByCallLogId(callLog.call_log_id, active);
}

async function updateCallLog(callLogId, updates, executor) {
  const active = getExecutor(executor);
  const fields = [];
  const params = [];

  Object.entries(updates || {}).forEach(([column, value]) => {
    fields.push(`${column} = ?`);
    params.push(value ?? null);
  });

  if (fields.length) {
    await active.query(
      `UPDATE call_logs SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE call_log_id = ?`,
      [...params, callLogId]
    );
  }

  return getByCallLogId(callLogId, active);
}

async function listLeadCalls(leadId, companyId, pagination, executor) {
  const active = getExecutor(executor);
  const [countRows] = await active.query(
    "SELECT COUNT(*) AS total FROM call_logs WHERE lead_id = ? AND company_id = ?",
    [leadId, companyId]
  );
  const [rows] = await active.query(
    `SELECT * FROM call_logs WHERE lead_id = ? AND company_id = ? ORDER BY created_at DESC, id DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`,
    [leadId, companyId, pagination.offset, pagination.limit]
  );

  return {
    rows,
    total: countRows[0]?.total || 0,
  };
}

module.exports = {
  createCallLog,
  getByCallLogId,
  getByProviderCallSid,
  getByProviderReference,
  listLeadCalls,
  updateCallLog,
};
