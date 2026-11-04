const db = require("../db/connection");
const { buildLeadWhere } = require("./leadRepository");
const { OPEN_PIPELINE_STATUSES } = require("../constants/lead");

// Every query starts from the viewer's lead scope (same rules as the Leads page).
const OPEN = `l.status IN (${OPEN_PIPELINE_STATUSES.map((s) => `'${s}'`).join(", ")})`;
const WON = "l.status = 'closed-won'";
const LOST = "l.status = 'closed-lost'";
const TOTAL_VALUE = "COALESCE(l.total_lead_value, l.estimated_value, 0)";
const num = (value) => Number(value || 0);

async function rows(sql, params) {
  const [result] = await db.query(sql, params);
  return result;
}

function scoped(filters) {
  const { whereClause, params } = buildLeadWhere(filters);
  return { where: whereClause, params };
}

/** Totals for leads added in the period (cohort), so won/lost relate to the same leads. */
async function getCohortTotals(rangeFilters) {
  const { where, params } = scoped(rangeFilters);
  const [row] = await rows(`
    SELECT COUNT(*) AS added,
      SUM(CASE WHEN ${WON} THEN 1 ELSE 0 END) AS won,
      SUM(CASE WHEN ${LOST} THEN 1 ELSE 0 END) AS lost,
      SUM(CASE WHEN ${OPEN} THEN 1 ELSE 0 END) AS still_open,
      SUM(COALESCE(l.estimated_value, 0)) AS value,
      SUM(CASE WHEN ${WON} THEN ${TOTAL_VALUE} ELSE 0 END) AS won_value
    FROM leads l ${where}`, params);
  return Object.fromEntries(Object.entries(row || {}).map(([k, v]) => [k, num(v)]));
}

async function getBreakdown(rangeFilters, dimension) {
  const { where, params } = scoped(rangeFilters);
  const column = {
    source: "COALESCE(NULLIF(LTRIM(RTRIM(l.lead_source)), ''), 'not-set')",
    status: "COALESCE(l.status, 'new')",
    product: "COALESCE(p.name, 'No product')",
    team: "COALESCE(t.name, 'No team')",
  }[dimension];
  const result = await rows(`
    SELECT ${column} AS name, COUNT(*) AS total,
      SUM(CASE WHEN ${WON} THEN 1 ELSE 0 END) AS won,
      SUM(CASE WHEN ${LOST} THEN 1 ELSE 0 END) AS lost,
      SUM(CASE WHEN ${OPEN} THEN 1 ELSE 0 END) AS still_open,
      SUM(COALESCE(l.estimated_value, 0)) AS value,
      SUM(CASE WHEN ${WON} THEN ${TOTAL_VALUE} ELSE 0 END) AS won_value
    FROM leads l
    LEFT JOIN products p ON p.product_id = l.product_id
    LEFT JOIN teams t ON t.team_id = l.team_id
    ${where}
    GROUP BY ${column}
    ORDER BY total DESC`, params);
  return result.map((r) => ({ name: r.name, total: num(r.total), won: num(r.won), lost: num(r.lost), open: num(r.still_open), value: num(r.value), wonValue: num(r.won_value) }));
}

/** Leads added and won per Indian calendar day. */
async function getDailyTrend(rangeFilters) {
  const { where, params } = scoped(rangeFilters);
  const result = await rows(`
    SELECT CONVERT(varchar(10), DATEADD(minute, 330, l.created_at), 23) AS day, COUNT(*) AS total,
      SUM(CASE WHEN ${WON} THEN 1 ELSE 0 END) AS won
    FROM leads l ${where}
    GROUP BY CONVERT(varchar(10), DATEADD(minute, 330, l.created_at), 23)
    ORDER BY day`, params);
  return result.map((r) => ({ day: r.day, total: num(r.total), won: num(r.won) }));
}

/** Leads added and won per month, for long or all-time periods. */
async function getMonthlyTrend(rangeFilters) {
  const { where, params } = scoped(rangeFilters);
  const result = await rows(`
    SELECT CONVERT(varchar(7), DATEADD(minute, 330, l.created_at), 23) AS month, COUNT(*) AS total,
      SUM(CASE WHEN ${WON} THEN 1 ELSE 0 END) AS won
    FROM leads l ${where}
    GROUP BY CONVERT(varchar(7), DATEADD(minute, 330, l.created_at), 23)
    ORDER BY month`, params);
  return result.map((r) => ({ month: r.month, total: num(r.total), won: num(r.won) }));
}

// "Build your own chart": only these groupings and measures can reach the SQL.
const DIMENSIONS = {
  source: "COALESCE(NULLIF(LTRIM(RTRIM(l.lead_source)), ''), 'not-set')",
  status: "COALESCE(l.status, 'new')",
  product: "COALESCE(p.name, 'No product')",
  owner: "COALESCE(u.name, 'Unassigned')",
  team: "COALESCE(t.name, 'No team')",
  priority: "COALESCE(l.priority, 'medium')",
  city: "COALESCE(NULLIF(LTRIM(RTRIM(l.address_city)), ''), 'Not set')",
  state: "COALESCE(NULLIF(LTRIM(RTRIM(l.address_state)), ''), 'Not set')",
  industry: "COALESCE(NULLIF(LTRIM(RTRIM(l.industry)), ''), 'not-set')",
  month: "CONVERT(varchar(7), DATEADD(minute, 330, l.created_at), 23)",
};
const MEASURES = {
  count: "COUNT(*)",
  won: `SUM(CASE WHEN ${WON} THEN 1 ELSE 0 END)`,
  lost: `SUM(CASE WHEN ${LOST} THEN 1 ELSE 0 END)`,
  open: `SUM(CASE WHEN ${OPEN} THEN 1 ELSE 0 END)`,
  value: "SUM(COALESCE(l.estimated_value, 0))",
  won_value: `SUM(CASE WHEN ${WON} THEN ${TOTAL_VALUE} ELSE 0 END)`,
  advance: "SUM(COALESCE(l.advance_received, 0))",
  pending: `SUM(CASE WHEN ${TOTAL_VALUE} > COALESCE(l.advance_received, 0) AND NOT ${LOST} THEN ${TOTAL_VALUE} - COALESCE(l.advance_received, 0) ELSE 0 END)`,
};

async function getCustomBreakdown(rangeFilters, dimension, measure) {
  const column = DIMENSIONS[dimension];
  const value = MEASURES[measure];
  if (!column || !value) throw new Error("Unknown chart setting.");
  const { where, params } = scoped(rangeFilters);
  const result = await rows(`
    SELECT TOP 60 ${column} AS name, ${value} AS value, COUNT(*) AS leads
    FROM leads l
    LEFT JOIN products p ON p.product_id = l.product_id
    LEFT JOIN users u ON u.user_id = l.assigned_to
    LEFT JOIN teams t ON t.team_id = l.team_id
    ${where}
    GROUP BY ${column}
    ORDER BY ${dimension === "month" ? "name" : "value DESC"}`, params);
  return result.map((r) => ({ name: r.name, value: num(r.value), leads: num(r.leads) }));
}

/** Per owner: leads added and won in the period, plus their open and overdue leads now. */
async function getOwnerStats(scopeFilters, rangeFilters, todayStart) {
  const now = scoped(scopeFilters);
  const range = scoped(rangeFilters);
  const [current, added] = await Promise.all([
    rows(`
      SELECT l.assigned_to AS user_id, MAX(u.name) AS name, MAX(u.role) AS role, MAX(t.name) AS team,
        SUM(CASE WHEN ${OPEN} THEN 1 ELSE 0 END) AS open_leads,
        SUM(CASE WHEN ${OPEN} AND l.follow_up_date < ? THEN 1 ELSE 0 END) AS overdue,
        SUM(CASE WHEN ${OPEN} THEN COALESCE(l.estimated_value, 0) ELSE 0 END) AS pipeline,
        SUM(COALESCE(l.advance_received, 0)) AS advance
      FROM leads l
      LEFT JOIN users u ON u.user_id = l.assigned_to
      LEFT JOIN teams t ON t.team_id = l.team_id
      ${now.where}
      GROUP BY l.assigned_to`, [todayStart, ...now.params]),
    rows(`
      SELECT l.assigned_to AS user_id, COUNT(*) AS added,
        SUM(CASE WHEN ${WON} THEN 1 ELSE 0 END) AS won,
        SUM(CASE WHEN ${LOST} THEN 1 ELSE 0 END) AS lost,
        SUM(CASE WHEN ${WON} THEN ${TOTAL_VALUE} ELSE 0 END) AS won_value
      FROM leads l ${range.where}
      GROUP BY l.assigned_to`, range.params),
  ]);
  const byId = new Map();
  for (const r of current) {
    byId.set(r.user_id || "", { userId: r.user_id || "", name: r.name || "Unassigned", role: r.role || "", team: r.team || "", open: num(r.open_leads), overdue: num(r.overdue), pipeline: num(r.pipeline), advance: num(r.advance), added: 0, won: 0, lost: 0, wonValue: 0 });
  }
  for (const r of added) {
    const key = r.user_id || "";
    if (!byId.has(key)) byId.set(key, { userId: key, name: "Unassigned", role: "", team: "", open: 0, overdue: 0, pipeline: 0, advance: 0 });
    Object.assign(byId.get(key), { added: num(r.added), won: num(r.won), lost: num(r.lost), wonValue: num(r.won_value) });
  }
  return [...byId.values()];
}

/** What each person did in the period: notes they wrote, leads they created, calls, last activity. */
async function getPeopleActivity(companyId, userIds, from, to) {
  if (Array.isArray(userIds) && !userIds.length) return [];
  const people = Array.isArray(userIds) ? ` AND u.user_id IN (${userIds.map(() => "?").join(", ")})` : "";
  const ids = Array.isArray(userIds) ? userIds : [];
  const result = await rows(`
    SELECT u.user_id, u.name, u.role, u.last_login_at,
      (SELECT COUNT(*) FROM lead_notes n WHERE n.company_id = u.company_id AND n.created_by = u.user_id AND n.created_at >= ? AND n.created_at <= ?) AS updates,
      (SELECT COUNT(*) FROM leads x WHERE x.company_id = u.company_id AND x.created_by = u.user_id AND x.is_active = 1 AND x.created_at >= ? AND x.created_at <= ?) AS leads_added,
      (SELECT COUNT(*) FROM call_logs c WHERE c.company_id = u.company_id AND c.created_by = u.user_id AND c.created_at >= ? AND c.created_at <= ?) AS calls,
      (SELECT MAX(n.created_at) FROM lead_notes n WHERE n.company_id = u.company_id AND n.created_by = u.user_id) AS last_note,
      (SELECT MAX(a.created_at) FROM lead_activities a WHERE a.company_id = u.company_id AND a.created_by = u.user_id) AS last_activity
    FROM users u
    WHERE u.company_id = ? AND u.is_active = 1 AND u.role IN ('sales', 'marketing', 'manager', 'support')${people}`,
  [from, to, from, to, from, to, companyId, ...ids]);
  return result.map((r) => {
    const times = [r.last_note, r.last_activity].filter(Boolean).map((v) => new Date(v).getTime());
    return {
      userId: r.user_id, name: r.name, role: r.role, lastLogin: r.last_login_at || null,
      lastActive: times.length ? new Date(Math.max(...times)).toISOString() : null,
      updates: num(r.updates), leadsAdded: num(r.leads_added), calls: num(r.calls),
    };
  });
}

/** Money in scope now, payments made in the period, and payments due soon. */
async function getPayments(scopeFilters, from, to, dueUntil) {
  const { where, params } = scoped(scopeFilters);
  const [totals] = await rows(`
    SELECT SUM(COALESCE(l.advance_received, 0)) AS advance,
      SUM(CASE WHEN ${TOTAL_VALUE} > COALESCE(l.advance_received, 0) AND NOT ${LOST} THEN ${TOTAL_VALUE} - COALESCE(l.advance_received, 0) ELSE 0 END) AS pending,
      SUM(CASE WHEN l.payment_date >= ? AND l.payment_date <= ? THEN COALESCE(l.advance_received, 0) ELSE 0 END) AS received_in_period,
      SUM(CASE WHEN l.payment_date >= ? AND l.payment_date <= ? THEN 1 ELSE 0 END) AS payments_in_period
    FROM leads l ${where}`, [from, to, from, to, ...params]);
  const upcoming = await rows(`
    SELECT TOP 6 l.lead_id, l.company_name, l.contact_person, l.next_payment_date, u.name AS owner,
      ${TOTAL_VALUE} - COALESCE(l.advance_received, 0) AS pending
    FROM leads l LEFT JOIN users u ON u.user_id = l.assigned_to
    ${where} AND l.next_payment_date IS NOT NULL AND l.next_payment_date <= ? AND NOT ${LOST}
    ORDER BY l.next_payment_date`, [...params, dueUntil]);
  return {
    advance: num(totals?.advance), pending: num(totals?.pending), receivedInPeriod: num(totals?.received_in_period), paymentsInPeriod: num(totals?.payments_in_period),
    upcoming: upcoming.map((r) => ({ leadId: r.lead_id, name: r.company_name || r.contact_person, owner: r.owner, due: r.next_payment_date, pending: Math.max(0, num(r.pending)) })),
  };
}

async function getWorkflow(scopeFilters) {
  const { where, params } = scoped(scopeFilters);
  const result = await rows(`
    SELECT COALESCE(l.workflow_stage, 'sales') AS stage, COUNT(*) AS total
    FROM leads l ${where} AND COALESCE(l.workflow_stage, 'sales') <> 'sales'
    GROUP BY COALESCE(l.workflow_stage, 'sales')`, params);
  return Object.fromEntries(result.map((r) => [r.stage, num(r.total)]));
}

/** Notes written on leads in scope during the period (all writers, or one person). */
async function countUpdates(scopeFilters, from, to, writerId = null) {
  const { where, params } = scoped(scopeFilters);
  const [row] = await rows(`
    SELECT COUNT(*) AS total FROM lead_notes n
    INNER JOIN leads l ON l.lead_id = n.lead_id AND l.company_id = n.company_id
    ${where} AND n.created_at >= ? AND n.created_at <= ?${writerId ? " AND n.created_by = ?" : ""}`,
  [...params, from, to, ...(writerId ? [writerId] : [])]);
  return num(row?.total);
}

/** Leads × owner matrix for the report: how many each person got from each source. */
async function getSourceByOwner(rangeFilters) {
  const { where, params } = scoped(rangeFilters);
  const result = await rows(`
    SELECT COALESCE(NULLIF(LTRIM(RTRIM(l.lead_source)), ''), 'not-set') AS source, COALESCE(u.name, 'Unassigned') AS owner, COALESCE(t.name, 'No team') AS team,
      COUNT(*) AS total, SUM(CASE WHEN ${WON} THEN 1 ELSE 0 END) AS won
    FROM leads l LEFT JOIN users u ON u.user_id = l.assigned_to LEFT JOIN teams t ON t.team_id = l.team_id
    ${where}
    GROUP BY COALESCE(NULLIF(LTRIM(RTRIM(l.lead_source)), ''), 'not-set'), COALESCE(u.name, 'Unassigned'), COALESCE(t.name, 'No team')`, params);
  return result.map((r) => ({ source: r.source, owner: r.owner, team: r.team, total: num(r.total), won: num(r.won) }));
}

module.exports = { DIMENSIONS, MEASURES, getMonthlyTrend, getCustomBreakdown, getCohortTotals, getBreakdown, getDailyTrend, getOwnerStats, getPeopleActivity, getPayments, getWorkflow, countUpdates, getSourceByOwner };
