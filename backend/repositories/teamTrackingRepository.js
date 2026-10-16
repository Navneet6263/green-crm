const db = require("../db/connection");

// Read-only queries behind the manager/admin/sales tracking dashboard.
// `userIds === null` means every sales user of the company. Times are Date objects (bound as UTC).
const MAX_EVENTS = 60000;

function userFilter(userIds, column = "u.user_id") {
  if (userIds === null) return { sql: "", params: [] };
  if (!userIds.length) return { sql: " AND 1=0", params: [] };
  return { sql: ` AND ${column} IN (${userIds.map(() => "?").join(",")})`, params: userIds };
}

async function listTrackableUsers(companyId, userIds) {
  const filter = userFilter(userIds);
  const [rows] = await db.query(
    `SELECT u.user_id, u.name, u.email, u.phone FROM users u
     WHERE u.company_id=? AND u.is_active=1 AND u.role='sales'${filter.sql}
     ORDER BY u.name`,
    [companyId, ...filter.params]
  );
  return rows;
}

// Latest session, latest GPS fix and latest visit for each user, plus today's visit count.
async function listLatestPositions(companyId, userIds, dayStart) {
  const filter = userFilter(userIds);
  const [rows] = await db.query(
    `SELECT u.user_id, u.name, u.phone,
        s.session_id, s.started_at, s.stopped_at,
        e.latitude, e.longitude, e.accuracy, e.captured_at AS last_fix_at, e.mocked,
        v.label AS last_visit_label, v.captured_at AS last_visit_at,
        (SELECT COUNT(*) FROM field_tracking_events c
          WHERE c.company_id=u.company_id AND c.user_id=u.user_id AND c.kind='reach' AND c.captured_at>=?) AS visits_today
     FROM users u
     OUTER APPLY (SELECT TOP 1 session_id, started_at, stopped_at FROM field_tracking_sessions fs
       WHERE fs.company_id=u.company_id AND fs.user_id=u.user_id ORDER BY fs.started_at DESC) s
     OUTER APPLY (SELECT TOP 1 latitude, longitude, accuracy, captured_at, mocked FROM field_tracking_events fe
       WHERE fe.company_id=u.company_id AND fe.user_id=u.user_id AND fe.session_id=s.session_id AND fe.latitude IS NOT NULL
       ORDER BY fe.captured_at DESC) e
     OUTER APPLY (SELECT TOP 1 label, captured_at FROM field_tracking_events fv
       WHERE fv.company_id=u.company_id AND fv.user_id=u.user_id AND fv.session_id=s.session_id AND fv.kind='reach'
       ORDER BY fv.captured_at DESC) v
     WHERE u.company_id=? AND u.is_active=1 AND u.role='sales'${filter.sql}
     ORDER BY u.name`,
    [dayStart, companyId, ...filter.params]
  );
  return rows;
}

// Sessions are capped at 12 hours, so look back that far to catch trips crossing the range start.
async function listSessionsBetween(companyId, userId, from, to) {
  const lookback = new Date(from.getTime() - 12 * 3600 * 1000);
  const [rows] = await db.query(
    `SELECT session_id, started_at, stopped_at FROM field_tracking_sessions
     WHERE company_id=? AND user_id=? AND started_at>=? AND started_at<?
       AND (stopped_at IS NULL OR stopped_at>=?)
     ORDER BY started_at`,
    [companyId, userId, lookback, to, from]
  );
  return rows;
}

async function listEventsForSessions(companyId, userId, sessionIds) {
  if (!sessionIds.length) return { events: [], truncated: false };
  const [rows] = await db.query(
    `SELECT TOP (${MAX_EVENTS + 1}) event_id, session_id, kind, captured_at, latitude, longitude, accuracy, mocked, label
     FROM field_tracking_events
     WHERE company_id=? AND user_id=? AND session_id IN (${sessionIds.map(() => "?").join(",")})
     ORDER BY captured_at, event_id`,
    [companyId, userId, ...sessionIds]
  );
  return { events: rows.slice(0, MAX_EVENTS), truncated: rows.length > MAX_EVENTS };
}

async function listAttendanceBetween(companyId, userId, from, to) {
  const [rows] = await db.query(
    `SELECT event_type, created_at, location, ip_address FROM attendance_events
     WHERE company_id=? AND user_id=? AND created_at>=? AND created_at<? ORDER BY created_at`,
    [companyId, userId, from, to]
  );
  return rows;
}

async function listLeadActivityBetween(companyId, userId, from, to) {
  const [rows] = await db.query(
    `SELECT TOP 2000 la.type, la.description, la.created_at, l.lead_id, l.company_name, l.contact_person, l.status
     FROM lead_activities la
     LEFT JOIN leads l ON l.lead_id=la.lead_id AND l.company_id=la.company_id
     WHERE la.company_id=? AND la.created_by=? AND la.created_at>=? AND la.created_at<?
     ORDER BY la.created_at DESC`,
    [companyId, userId, from, to]
  );
  return rows;
}

async function listCallsBetween(companyId, userId, from, to) {
  const [rows] = await db.query(
    `SELECT TOP 2000 c.to_number, c.status, c.duration_seconds, c.created_at, c.lead_id, l.company_name, l.contact_person
     FROM call_logs c
     LEFT JOIN leads l ON l.lead_id=c.lead_id AND l.company_id=c.company_id
     WHERE c.company_id=? AND c.created_by=? AND c.created_at>=? AND c.created_at<?
     ORDER BY c.created_at DESC`,
    [companyId, userId, from, to]
  );
  return rows;
}

module.exports = {
  listTrackableUsers,
  listLatestPositions,
  listSessionsBetween,
  listEventsForSessions,
  listAttendanceBetween,
  listLeadActivityBetween,
  listCallsBetween,
};
