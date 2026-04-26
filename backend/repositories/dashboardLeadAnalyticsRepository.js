const db = require("../db/connection");
const { OPEN_PIPELINE_STATUSES } = require("../constants/lead");
const { buildIndiaDayBuckets } = require("../utils/indiaDateBuckets");

const STATUS_ORDER = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "booked-demo",
  "demo-done",
  "trial-started",
  "closed-won",
  "closed-lost",
];
const FUNNEL_STAGES = [
  { key: "new", label: "New", statuses: ["new"] },
  { key: "contacted", label: "Contacted", statuses: ["contacted", "qualified", "proposal", "negotiation"] },
  { key: "booked-demo", label: "Booked Demo", statuses: ["booked-demo"] },
  { key: "demo-done", label: "Demo Done", statuses: ["demo-done"] },
  { key: "closed-won", label: "Closed Won", statuses: ["closed-won"] },
];

async function queryRows(sqlText, params = []) {
  const [rows] = await db.query(sqlText, params);
  return rows;
}

function buildTeamScope(teamIds, columnName = "team_id") {
  if (!Array.isArray(teamIds)) {
    return { clause: "", params: [] };
  }

  if (!teamIds.length) {
    return { clause: " AND 1 = 0", params: [] };
  }

  return {
    clause: ` AND ${columnName} IN (${teamIds.map(() => "?").join(", ")})`,
    params: teamIds,
  };
}

function toCount(value) {
  return Number(value || 0);
}

function indexByDay(rows = []) {
  return rows.reduce((accumulator, row) => {
    accumulator[String(row.day_key || "")] = toCount(row.total);
    return accumulator;
  }, {});
}

function indexByStatus(rows = []) {
  return rows.reduce((accumulator, row) => {
    accumulator[String(row.status || "").toLowerCase()] = toCount(row.total);
    return accumulator;
  }, {});
}

function countBucket(statusIndex, statuses = []) {
  return statuses.reduce((total, status) => total + toCount(statusIndex[status]), 0);
}

function buildDistribution(statusIndex) {
  return STATUS_ORDER
    .map((status) => ({
      status,
      total: toCount(statusIndex[status]),
    }))
    .filter((item) => item.total > 0);
}

function buildFunnel(statusIndex) {
  return FUNNEL_STAGES.map((stage) => ({
    key: stage.key,
    label: stage.label,
    status: stage.key,
    total: countBucket(statusIndex, stage.statuses),
  }));
}

async function getCompanyLeadAnalytics(companyId, teamIds = null) {
  const teamScope = buildTeamScope(teamIds);
  const buckets = buildIndiaDayBuckets(7);
  const todayBucket = buckets[buckets.length - 1];
  const windowStart = buckets[0].startUtc;
  const windowEnd = todayBucket.endUtc;
  const openPipelineSql = OPEN_PIPELINE_STATUSES.map(() => "?").join(", ");

  const [statusRows, kpiRows, leadTrendRows, demoTrendRows, insightRows] = await Promise.all([
    queryRows(
      `SELECT status, COUNT(*) AS total FROM leads WHERE company_id = ? AND is_active = 1${teamScope.clause} GROUP BY status`,
      [companyId, ...teamScope.params]
    ),
    queryRows(
      `
        SELECT
          SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) AS today_leads,
          SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) AS last_7_days_leads,
          SUM(CASE WHEN status IN (${openPipelineSql}) THEN 1 ELSE 0 END) AS open_pipeline,
          SUM(CASE WHEN status = 'closed-won' THEN 1 ELSE 0 END) AS closed_won,
          SUM(CASE WHEN status = 'booked-demo' AND updated_at >= ? AND updated_at < ? THEN 1 ELSE 0 END) AS booked_demo_today,
          SUM(CASE WHEN status = 'booked-demo' THEN 1 ELSE 0 END) AS booked_demo_total
        FROM leads
        WHERE company_id = ? AND is_active = 1${teamScope.clause}
      `,
      [
        todayBucket.startUtc,
        todayBucket.endUtc,
        windowStart,
        windowEnd,
        ...OPEN_PIPELINE_STATUSES,
        todayBucket.startUtc,
        todayBucket.endUtc,
        companyId,
        ...teamScope.params,
      ]
    ),
    queryRows(
      `
        SELECT
          CONVERT(varchar(10), CONVERT(date, DATEADD(minute, 330, created_at)), 23) AS day_key,
          COUNT(*) AS total
        FROM leads
        WHERE company_id = ? AND is_active = 1 AND created_at >= ? AND created_at < ?${teamScope.clause}
        GROUP BY CONVERT(date, DATEADD(minute, 330, created_at))
        ORDER BY day_key ASC
      `,
      [companyId, windowStart, windowEnd, ...teamScope.params]
    ),
    queryRows(
      `
        SELECT
          CONVERT(varchar(10), CONVERT(date, DATEADD(minute, 330, updated_at)), 23) AS day_key,
          COUNT(*) AS total
        FROM leads
        WHERE company_id = ? AND is_active = 1 AND status = 'booked-demo' AND updated_at >= ? AND updated_at < ?${teamScope.clause}
        GROUP BY CONVERT(date, DATEADD(minute, 330, updated_at))
        ORDER BY day_key ASC
      `,
      [companyId, windowStart, windowEnd, ...teamScope.params]
    ),
    queryRows(
      `
        SELECT
          SUM(CASE WHEN priority IN ('high', 'urgent') AND status IN (${openPipelineSql}) THEN 1 ELSE 0 END) AS high_priority,
          SUM(CASE WHEN follow_up_date IS NULL AND status IN (${openPipelineSql}) THEN 1 ELSE 0 END) AS no_follow_up,
          SUM(CASE WHEN assigned_to IS NULL AND status IN (${openPipelineSql}) THEN 1 ELSE 0 END) AS unassigned,
          SUM(CASE WHEN status = 'booked-demo' THEN 1 ELSE 0 END) AS pending_demo
        FROM leads
        WHERE company_id = ? AND is_active = 1${teamScope.clause}
      `,
      [
        ...OPEN_PIPELINE_STATUSES,
        ...OPEN_PIPELINE_STATUSES,
        ...OPEN_PIPELINE_STATUSES,
        companyId,
        ...teamScope.params,
      ]
    ),
  ]);

  const statusIndex = indexByStatus(statusRows);
  const leadTrendIndex = indexByDay(leadTrendRows);
  const demoTrendIndex = indexByDay(demoTrendRows);
  const kpis = kpiRows[0] || {};
  const insights = insightRows[0] || {};

  return {
    lead_counts: buildDistribution(statusIndex),
    kpis: {
      today_leads: toCount(kpis.today_leads),
      last_7_days_leads: toCount(kpis.last_7_days_leads),
      open_pipeline: toCount(kpis.open_pipeline),
      closed_won: toCount(kpis.closed_won),
      booked_demo_today: toCount(kpis.booked_demo_today),
      booked_demo_total: toCount(kpis.booked_demo_total),
    },
    charts: {
      lead_trend: buckets.map((bucket) => ({
        key: bucket.key,
        label: bucket.label,
        total: toCount(leadTrendIndex[bucket.key]),
      })),
      demo_trend: buckets.map((bucket) => ({
        key: bucket.key,
        label: bucket.label,
        total: toCount(demoTrendIndex[bucket.key]),
      })),
      funnel: buildFunnel(statusIndex),
      status_distribution: buildDistribution(statusIndex),
    },
    insights: {
      high_priority: toCount(insights.high_priority),
      no_follow_up: toCount(insights.no_follow_up),
      unassigned: toCount(insights.unassigned),
      pending_demo: toCount(insights.pending_demo),
    },
  };
}

module.exports = {
  getCompanyLeadAnalytics,
};
