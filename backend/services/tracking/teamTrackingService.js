const AppError = require("../../utils/appError");
const { ROLES } = require("../../constants/roles");
const teamRepository = require("../../repositories/teamRepository");
const repo = require("../../repositories/teamTrackingRepository");
const { getAccessibleTeamIds, isCompanyWideRole } = require("../accessScopeService");
const { buildRoute, thinSegments } = require("./routeModel");

const IST_OFFSET_MS = 330 * 60 * 1000;
const LIVE_WINDOW_MS = 10 * 60 * 1000;
const MAX_SESSION_MS = 12 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 31;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---- dates (all reporting is in IST) ----
const istDateOf = (value) => new Date(new Date(value).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
const todayIst = () => istDateOf(Date.now());

function istDayStart(date) {
  if (!DATE_RE.test(date || "")) throw new AppError("Use a date in YYYY-MM-DD format.", 400);
  const start = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) throw new AppError("Invalid date.", 400);
  return new Date(start.getTime() - IST_OFFSET_MS);
}

function istRange(fromDate, toDate = fromDate) {
  const from = istDayStart(fromDate);
  const to = new Date(istDayStart(toDate).getTime() + 24 * 3600 * 1000);
  const days = Math.round((to - from) / 86400000);
  if (days < 1) throw new AppError("The end date must be on or after the start date.", 400);
  if (days > MAX_RANGE_DAYS) throw new AppError(`Choose a range of up to ${MAX_RANGE_DAYS} days.`, 400);
  return { from, to, days };
}

function listDates(from, days) {
  return Array.from({ length: days }, (_, i) => istDateOf(from.getTime() + i * 86400000));
}

// ---- access ----
function assertViewer(auth) {
  if (!auth?.companyId) throw new AppError("Select a company workspace first.", 400);
  const allowed = auth.role === ROLES.SALES || auth.role === ROLES.MANAGER || isCompanyWideRole(auth.role);
  if (!allowed || auth.role === ROLES.EXPERT) throw new AppError("You do not have access to field tracking.", 403);
}

// null = whole company (admins); otherwise the explicit list of visible user IDs.
async function visibleUserIds(auth) {
  assertViewer(auth);
  if (auth.role === ROLES.SALES) return [auth.userId];
  if (auth.role === ROLES.MANAGER) {
    const teamIds = await getAccessibleTeamIds(auth, auth.companyId);
    const ids = await teamRepository.listUsersForTeams(auth.companyId, teamIds || []);
    return [...new Set([...ids, auth.userId])];
  }
  return null;
}

async function resolveEmployee(auth, userId) {
  const ids = await visibleUserIds(auth);
  if (ids !== null && !ids.includes(userId)) throw new AppError("You can only view employees in your teams.", 403);
  const [user] = await repo.listTrackableUsers(auth.companyId, [userId]);
  if (!user) throw new AppError("Sales employee not found.", 404);
  return user;
}

// ---- live board ----
function liveStatus(row, now) {
  const started = row.started_at ? new Date(row.started_at).getTime() : 0;
  const active = Boolean(row.session_id) && !row.stopped_at && now - started < MAX_SESSION_MS;
  if (!active) return "off";
  const lastFix = row.last_fix_at ? new Date(row.last_fix_at).getTime() : 0;
  return lastFix && now - lastFix <= LIVE_WINDOW_MS ? "live" : "idle";
}

async function getLiveBoard(auth) {
  const ids = await visibleUserIds(auth);
  const now = Date.now();
  const rows = await repo.listLatestPositions(auth.companyId, ids, istDayStart(todayIst()));
  const employees = rows.map((row) => {
    const status = liveStatus(row, now);
    return {
      user_id: row.user_id,
      name: row.name,
      phone: row.phone,
      status,
      tracking_since: status === "off" ? null : row.started_at,
      last_stopped_at: row.stopped_at,
      last_fix: row.last_fix_at ? {
        latitude: Number(row.latitude), longitude: Number(row.longitude),
        accuracy: row.accuracy === null ? null : Number(row.accuracy), at: row.last_fix_at, mocked: Boolean(row.mocked),
      } : null,
      last_visit: row.last_visit_at ? { label: row.last_visit_label, at: row.last_visit_at } : null,
      visits_today: Number(row.visits_today || 0),
    };
  });
  const count = (status) => employees.filter((e) => e.status === status).length;
  return {
    generated_at: new Date(now).toISOString(),
    scope: ids === null ? "company" : auth.role === ROLES.SALES ? "self" : "team",
    counts: { total: employees.length, live: count("live"), idle: count("idle"), off: count("off") },
    employees,
  };
}

// ---- trips ----
function summariseTrip(session, events, rangeEnd, now) {
  const route = buildRoute(events);
  const start = new Date(session.started_at).getTime();
  const lastEventAt = events.length ? new Date(events[events.length - 1].captured_at).getTime() : start;
  const active = !session.stopped_at && now - start < MAX_SESSION_MS;
  // Stopped: stop time. Running: now. Never stopped and expired: last GPS event.
  const end = session.stopped_at ? new Date(session.stopped_at).getTime()
    : active ? Math.min(now, rangeEnd.getTime()) : lastEventAt;
  return {
    session_id: session.session_id,
    date: istDateOf(session.started_at),
    started_at: session.started_at,
    stopped_at: session.stopped_at,
    active,
    minutes: Math.max(0, Math.round((end - start) / 60000)),
    km: Math.round(route.metres / 10) / 100,
    fixes: route.fixes,
    rejected: route.rejected,
    gaps: route.gaps,
    mocked: events.filter((e) => e.mocked).length,
    visits: route.stops.length,
    route,
  };
}

async function loadTrips(auth, userId, from, to) {
  const sessions = await repo.listSessionsBetween(auth.companyId, userId, from, to);
  const { events, truncated } = await repo.listEventsForSessions(auth.companyId, userId, sessions.map((s) => s.session_id));
  const bySession = new Map(sessions.map((s) => [String(s.session_id).toLowerCase(), []]));
  for (const event of events) bySession.get(String(event.session_id).toLowerCase())?.push(event);
  const now = Date.now();
  const trips = sessions.map((s) => summariseTrip(s, bySession.get(String(s.session_id).toLowerCase()) || [], to, now));
  return { trips, events, truncated };
}

function visitRows(trips) {
  return trips.flatMap((trip) => trip.route.stops.map((stop) => ({
    number: stop.number,
    session_id: trip.session_id,
    label: stop.event.label,
    at: stop.event.captured_at,
    latitude: stop.event.latitude === null ? null : Number(stop.event.latitude),
    longitude: stop.event.longitude === null ? null : Number(stop.event.longitude),
    accuracy: stop.event.accuracy === null ? null : Number(stop.event.accuracy),
    mocked: Boolean(stop.event.mocked),
    on_map: Boolean(stop.coordinate),
  })));
}

const totalsOf = (trips) => ({
  km: Math.round(trips.reduce((t, x) => t + x.km, 0) * 100) / 100,
  visits: trips.reduce((t, x) => t + x.visits, 0),
  minutes: trips.reduce((t, x) => t + x.minutes, 0),
  trips: trips.length,
  mocked: trips.reduce((t, x) => t + x.mocked, 0),
});

// ---- employee day (dashboard) ----
async function getEmployeeDay(auth, userId, date = todayIst()) {
  const user = await resolveEmployee(auth, userId);
  const { from, to } = istRange(date);
  const [{ trips, truncated }, attendance, activity, calls] = await Promise.all([
    loadTrips(auth, userId, from, to),
    repo.listAttendanceBetween(auth.companyId, userId, from, to),
    repo.listLeadActivityBetween(auth.companyId, userId, from, to),
    repo.listCallsBetween(auth.companyId, userId, from, to),
  ]);
  const dayTrips = trips.filter((trip) => trip.date === date);
  return {
    user,
    date,
    truncated,
    totals: { ...totalsOf(dayTrips), calls: calls.length, lead_updates: activity.length },
    trips: dayTrips.map(({ route, ...trip }) => ({ ...trip, segments: thinSegments(route.segments) })),
    visits: visitRows(dayTrips),
    attendance,
    activity: activity.slice(0, 200),
    calls: calls.slice(0, 200),
  };
}

// ---- exports ----
function groupByDate(rows, field) {
  const map = new Map();
  for (const row of rows) {
    const key = istDateOf(row[field]);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function dailyRows(dates, trips, attendance, activity, calls) {
  const tripsByDay = new Map();
  for (const trip of trips) {
    if (!tripsByDay.has(trip.date)) tripsByDay.set(trip.date, []);
    tripsByDay.get(trip.date).push(trip);
  }
  const att = groupByDate(attendance, "created_at");
  const act = groupByDate(activity, "created_at");
  const cal = groupByDate(calls, "created_at");
  return dates.map((date) => {
    const dayTrips = tripsByDay.get(date) || [];
    const punches = att.get(date) || [];
    const ins = punches.filter((p) => p.event_type === "punch_in");
    const outs = punches.filter((p) => p.event_type === "punch_out");
    return {
      date,
      ...totalsOf(dayTrips),
      first_start: dayTrips[0]?.started_at || null,
      last_stop: dayTrips.length ? dayTrips[dayTrips.length - 1].stopped_at : null,
      fixes: dayTrips.reduce((t, x) => t + x.fixes, 0),
      rejected: dayTrips.reduce((t, x) => t + x.rejected, 0),
      punch_in: ins[0]?.created_at || null,
      punch_out: outs.length ? outs[outs.length - 1].created_at : null,
      calls: (cal.get(date) || []).length,
      lead_updates: (act.get(date) || []).length,
    };
  });
}

async function getEmployeeReport(auth, userId, fromDate, toDate) {
  const user = await resolveEmployee(auth, userId);
  const { from, to, days } = istRange(fromDate, toDate);
  const [{ trips, events, truncated }, attendance, activity, calls] = await Promise.all([
    loadTrips(auth, userId, from, to),
    repo.listAttendanceBetween(auth.companyId, userId, from, to),
    repo.listLeadActivityBetween(auth.companyId, userId, from, to),
    repo.listCallsBetween(auth.companyId, userId, from, to),
  ]);
  const dates = listDates(from, days);
  const inRange = trips.filter((trip) => dates.includes(trip.date));
  const sessionIds = new Set(inRange.map((t) => String(t.session_id).toLowerCase()));
  return {
    user, fromDate, toDate, truncated,
    days: dailyRows(dates, inRange, attendance, activity, calls),
    trips: inRange.map(({ route, ...trip }) => trip),
    visits: visitRows(inRange),
    points: events.filter((e) => sessionIds.has(String(e.session_id).toLowerCase()) && e.latitude !== null),
    attendance, activity, calls,
  };
}

async function getTeamReport(auth, fromDate, toDate) {
  const ids = await visibleUserIds(auth);
  const users = await repo.listTrackableUsers(auth.companyId, ids);
  const { from, to, days } = istRange(fromDate, toDate);
  const dates = listDates(from, days);
  const employees = [];
  for (const user of users) {
    const [{ trips }, attendance, activity, calls] = await Promise.all([
      loadTrips(auth, user.user_id, from, to),
      repo.listAttendanceBetween(auth.companyId, user.user_id, from, to),
      repo.listLeadActivityBetween(auth.companyId, user.user_id, from, to),
      repo.listCallsBetween(auth.companyId, user.user_id, from, to),
    ]);
    const inRange = trips.filter((trip) => dates.includes(trip.date));
    employees.push({ user, days: dailyRows(dates, inRange, attendance, activity, calls), visits: visitRows(inRange) });
  }
  return { fromDate, toDate, employees };
}

module.exports = { getLiveBoard, getEmployeeDay, getEmployeeReport, getTeamReport, todayIst, IST_OFFSET_MS };
