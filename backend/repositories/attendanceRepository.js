const db = require("../db/connection");

function getExecutor(executor) {
  return executor || db;
}

async function createAttendanceEvent(event, executor) {
  const active = getExecutor(executor);

  await active.query(
    `
      INSERT INTO attendance_events (
        attendance_event_id,
        company_id,
        user_id,
        event_type,
        ip_address
      ) VALUES (?, ?, ?, ?, ?)
    `,
    [
      event.attendance_event_id,
      event.company_id,
      event.user_id,
      event.event_type,
      event.ip_address,
    ]
  );

  return getAttendanceEvent(event.attendance_event_id, active);
}

async function getAttendanceEvent(eventId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    "SELECT TOP 1 * FROM attendance_events WHERE attendance_event_id = ?",
    [eventId]
  );

  return rows[0] || null;
}

async function getLatestEvent(companyId, userId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    `
      SELECT TOP 1 *
      FROM attendance_events
      WHERE company_id = ? AND user_id = ?
      ORDER BY created_at DESC, id DESC
    `,
    [companyId, userId]
  );

  return rows[0] || null;
}

async function listUserEvents(companyId, userId, pagination, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    `
      SELECT *
      FROM attendance_events
      WHERE company_id = ? AND user_id = ?
      ORDER BY created_at DESC, id DESC
      OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `,
    [companyId, userId, pagination.offset, pagination.limit]
  );
  const [countRows] = await active.query(
    `
      SELECT COUNT(*) AS total
      FROM attendance_events
      WHERE company_id = ? AND user_id = ?
    `,
    [companyId, userId]
  );

  return {
    rows,
    total: Number(countRows[0]?.total || 0),
  };
}

module.exports = {
  createAttendanceEvent,
  getLatestEvent,
  listUserEvents,
};
