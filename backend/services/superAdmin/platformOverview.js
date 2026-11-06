const db = require("../../db/connection");
const AppError = require("../../utils/appError");
const { PLATFORM_COMPANY_ID } = require("../../db/schema");
const { PLATFORM_CONSOLE_ROLES, ROLES } = require("../../constants/roles");
const { getAccessibleCompanyIds } = require("../../utils/tenant");

// The platform console dashboard: every tenant's numbers in one call. A super admin sees all
// companies; platform admins and managers see only the companies assigned to them.
const RANGES = { 7: 7, 30: 30, 90: 90 };
const MODULE_KEYS = ["leads", "customers", "workflow", "products", "team_management", "tasks", "calendar", "communications", "attendance", "analytics", "support", "documents", "performance"];
const OPT_IN = ["developer_api"];

function parseJson(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw) || {}; } catch (_error) { return {}; }
}

/** SQL condition limiting a table alias to the companies this person may see. */
function scopeFor(auth) {
  const ids = getAccessibleCompanyIds(auth);
  return (alias) => {
    if (ids === null) return { sql: `${alias}.company_id <> ?`, params: [PLATFORM_COMPANY_ID] };
    if (!ids.length) return { sql: "1 = 0", params: [] };
    return { sql: `${alias}.company_id IN (${ids.map(() => "?").join(", ")})`, params: ids };
  };
}

const safe = (promise, fallback) => promise.catch((error) => {
  console.warn("[platform overview] part skipped:", error.message);
  return fallback;
});
const rowsOf = async (sql, params) => (await db.query(sql, params))[0];

async function totals(scope, days) {
  const c = scope("c"), u = scope("u"), l = scope("l"), k = scope("k"), t = scope("t");
  const [row] = await rowsOf(
    `SELECT
       (SELECT COUNT(*) FROM companies c WHERE ${c.sql}) AS companies,
       (SELECT COUNT(*) FROM companies c WHERE ${c.sql} AND c.status = 'active') AS companies_active,
       (SELECT COUNT(*) FROM companies c WHERE ${c.sql} AND c.status = 'trial') AS companies_trial,
       (SELECT COUNT(*) FROM companies c WHERE ${c.sql} AND c.status = 'suspended') AS companies_suspended,
       (SELECT COUNT(*) FROM companies c WHERE ${c.sql} AND c.created_at >= DATEADD(day, ?, SYSUTCDATETIME())) AS companies_new,
       (SELECT COUNT(*) FROM users u WHERE ${u.sql} AND u.is_active = 1) AS users_active,
       (SELECT COUNT(*) FROM users u WHERE ${u.sql} AND u.is_active = 0) AS users_off,
       (SELECT COUNT(*) FROM users u WHERE ${u.sql} AND u.is_active = 1 AND u.last_login_at >= DATEADD(day, -7, SYSUTCDATETIME())) AS users_seen_7d,
       (SELECT COUNT(*) FROM users u WHERE ${u.sql} AND u.created_at >= DATEADD(day, ?, SYSUTCDATETIME())) AS users_new,
       (SELECT COUNT(*) FROM leads l WHERE ${l.sql} AND l.is_active = 1) AS leads,
       (SELECT COUNT(*) FROM leads l WHERE ${l.sql} AND l.is_active = 1 AND l.created_at >= DATEADD(day, ?, SYSUTCDATETIME())) AS leads_new,
       (SELECT COUNT(*) FROM leads l WHERE ${l.sql} AND l.is_active = 1 AND l.status = 'closed-won' AND l.updated_at >= DATEADD(day, ?, SYSUTCDATETIME())) AS leads_won,
       (SELECT COALESCE(SUM(l.estimated_value), 0) FROM leads l WHERE ${l.sql} AND l.is_active = 1 AND l.status = 'closed-won' AND l.updated_at >= DATEADD(day, ?, SYSUTCDATETIME())) AS won_value,
       (SELECT COUNT(*) FROM leads l WHERE ${l.sql} AND l.is_active = 1 AND l.assigned_to IS NULL) AS leads_unassigned,
       (SELECT COUNT(*) FROM customers k WHERE ${k.sql} AND k.is_active = 1) AS customers,
       (SELECT COUNT(*) FROM tasks t WHERE ${t.sql} AND t.status = 'pending') AS tasks_pending,
       (SELECT COUNT(*) FROM tasks t WHERE ${t.sql} AND t.status = 'pending' AND t.due_date < SYSUTCDATETIME()) AS tasks_overdue`,
    [...c.params, ...c.params, ...c.params, ...c.params, ...c.params, -days,
      ...u.params, ...u.params, ...u.params, ...u.params, -days,
      ...l.params, ...l.params, -days, ...l.params, -days, ...l.params, -days, ...l.params,
      ...k.params, ...t.params, ...t.params]
  );
  return Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [key, Number(value) || 0]));
}

/** New leads, won leads, new people and new companies per day (IST). */
async function trend(scope, days) {
  const l = scope("l"), u = scope("u"), c = scope("c");
  const dayOf = (col) => `CONVERT(date, DATEADD(minute, 330, ${col}))`;
  const [leads, won, users, companies] = await Promise.all([
    rowsOf(`SELECT ${dayOf("l.created_at")} AS day, COUNT(*) AS n FROM leads l WHERE ${l.sql} AND l.is_active = 1 AND l.created_at >= DATEADD(day, ?, SYSUTCDATETIME()) GROUP BY ${dayOf("l.created_at")}`, [...l.params, -days]),
    rowsOf(`SELECT ${dayOf("l.updated_at")} AS day, COUNT(*) AS n FROM leads l WHERE ${l.sql} AND l.is_active = 1 AND l.status = 'closed-won' AND l.updated_at >= DATEADD(day, ?, SYSUTCDATETIME()) GROUP BY ${dayOf("l.updated_at")}`, [...l.params, -days]),
    rowsOf(`SELECT ${dayOf("u.created_at")} AS day, COUNT(*) AS n FROM users u WHERE ${u.sql} AND u.created_at >= DATEADD(day, ?, SYSUTCDATETIME()) GROUP BY ${dayOf("u.created_at")}`, [...u.params, -days]),
    rowsOf(`SELECT ${dayOf("c.created_at")} AS day, COUNT(*) AS n FROM companies c WHERE ${c.sql} AND c.created_at >= DATEADD(day, ?, SYSUTCDATETIME()) GROUP BY ${dayOf("c.created_at")}`, [...c.params, -days]),
  ]);
  const key = (value) => new Date(value).toISOString().slice(0, 10);
  const maps = [leads, won, users, companies].map((list) => new Map(list.map((r) => [key(r.day), Number(r.n) || 0])));
  const today = Date.now() + 330 * 60000;
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(today - (days - 1 - i) * 86400000).toISOString().slice(0, 10);
    return { date, leads: maps[0].get(date) || 0, won: maps[1].get(date) || 0, users: maps[2].get(date) || 0, companies: maps[3].get(date) || 0 };
  });
}

function healthOf(company, now = Date.now()) {
  const ageDays = (now - new Date(company.created_at).getTime()) / 86400000;
  const seenDays = company.last_login_at ? (now - new Date(company.last_login_at).getTime()) / 86400000 : Infinity;
  if (company.status === "suspended") return "suspended";
  if (ageDays < 14 && seenDays > 3) return "new";
  if (seenDays <= 3 && company.leads_period > 0) return "active";
  if (seenDays <= 14) return "quiet";
  return "at_risk";
}

/** One row per company: people, leads, wins, last sign-in, modules and health. */
async function companyRows(scope, days) {
  const c = scope("c");
  const rows = await rowsOf(
    `SELECT c.company_id, c.name, c.slug, c.status, c.industry, c.created_at, c.service_access,
       (SELECT COUNT(*) FROM users u WHERE u.company_id = c.company_id AND u.is_active = 1) AS users_active,
       (SELECT COUNT(*) FROM users u WHERE u.company_id = c.company_id AND u.is_active = 1 AND u.role = 'admin') AS admins,
       (SELECT COUNT(*) FROM users u WHERE u.company_id = c.company_id AND u.is_active = 1 AND u.last_login_at >= DATEADD(day, -7, SYSUTCDATETIME())) AS users_seen_7d,
       (SELECT MAX(u.last_login_at) FROM users u WHERE u.company_id = c.company_id) AS last_login_at,
       (SELECT COUNT(*) FROM leads l WHERE l.company_id = c.company_id AND l.is_active = 1) AS leads_total,
       (SELECT COUNT(*) FROM leads l WHERE l.company_id = c.company_id AND l.is_active = 1 AND l.created_at >= DATEADD(day, ?, SYSUTCDATETIME())) AS leads_period,
       (SELECT COUNT(*) FROM leads l WHERE l.company_id = c.company_id AND l.is_active = 1 AND l.status = 'closed-won' AND l.updated_at >= DATEADD(day, ?, SYSUTCDATETIME())) AS won_period,
       (SELECT COALESCE(SUM(l.estimated_value), 0) FROM leads l WHERE l.company_id = c.company_id AND l.is_active = 1 AND l.status = 'closed-won' AND l.updated_at >= DATEADD(day, ?, SYSUTCDATETIME())) AS won_value_period,
       (SELECT MAX(l.created_at) FROM leads l WHERE l.company_id = c.company_id) AS last_lead_at
     FROM companies c WHERE ${c.sql}`,
    [-days, -days, -days, ...c.params]
  );
  return rows.map((row) => {
    const access = parseJson(row.service_access);
    const modules = MODULE_KEYS.filter((key) => access[key] !== false);
    const item = {
      company_id: row.company_id, name: row.name, slug: row.slug, status: row.status || "trial", industry: row.industry, created_at: row.created_at,
      users_active: Number(row.users_active) || 0, admins: Number(row.admins) || 0, users_seen_7d: Number(row.users_seen_7d) || 0,
      last_login_at: row.last_login_at, leads_total: Number(row.leads_total) || 0, leads_period: Number(row.leads_period) || 0,
      won_period: Number(row.won_period) || 0, won_value_period: Number(row.won_value_period) || 0, last_lead_at: row.last_lead_at,
      modules_on: modules.length, modules_total: MODULE_KEYS.length, developer_api: access.developer_api === true, access,
    };
    return { ...item, health: healthOf(item) };
  });
}

function adoption(companies) {
  const total = companies.length || 1;
  return [...MODULE_KEYS, ...OPT_IN].map((key) => {
    const on = companies.filter((c) => (OPT_IN.includes(key) ? c.access[key] === true : c.access[key] !== false)).length;
    return { key, on, share: Math.round((on / total) * 100) };
  }).sort((a, b) => b.on - a.on);
}

async function mixes(scope, days) {
  const u = scope("u"), l = scope("l");
  const [roles, sources] = await Promise.all([
    rowsOf(`SELECT u.role AS label, COUNT(*) AS value FROM users u WHERE ${u.sql} AND u.is_active = 1 GROUP BY u.role ORDER BY COUNT(*) DESC`, u.params),
    rowsOf(`SELECT TOP 8 COALESCE(NULLIF(LOWER(l.lead_source), ''), 'unknown') AS label, COUNT(*) AS value FROM leads l WHERE ${l.sql} AND l.is_active = 1 AND l.created_at >= DATEADD(day, ?, SYSUTCDATETIME()) GROUP BY COALESCE(NULLIF(LOWER(l.lead_source), ''), 'unknown') ORDER BY COUNT(*) DESC`, [...l.params, -days]),
  ]);
  const shape = (list) => list.map((r) => ({ key: r.label, label: r.label, value: Number(r.value) || 0 }));
  return { roles: shape(roles), sources: shape(sources) };
}

async function developerUsage(scope) {
  const d = scope("d");
  const [row] = await rowsOf(
    `SELECT SUM(CASE WHEN d.kind = 'api' THEN 1 ELSE 0 END) AS api, SUM(CASE WHEN d.kind = 'capture' THEN 1 ELSE 0 END) AS capture,
            SUM(CASE WHEN d.status >= 400 THEN 1 ELSE 0 END) AS failed
     FROM developer_request_log d WHERE ${d.sql} AND d.created_at >= DATEADD(day, -7, SYSUTCDATETIME())`,
    d.params
  );
  return { api_7d: Number(row?.api) || 0, capture_7d: Number(row?.capture) || 0, failed_7d: Number(row?.failed) || 0 };
}

async function verifiedUsers(scope) {
  const u = scope("u");
  const [row] = await rowsOf(`SELECT COUNT(*) AS n FROM users u WHERE ${u.sql} AND u.is_active = 1 AND u.email_verified_at >= DATEADD(day, -40, SYSUTCDATETIME())`, u.params);
  return Number(row?.n) || 0;
}

async function getOverview(auth, query = {}) {
  if (!PLATFORM_CONSOLE_ROLES.includes(auth.role)) throw new AppError("Only the platform team can open this.", 403);
  const days = RANGES[Number(query.days)] || 30;
  const scope = scopeFor(auth);
  const isSuper = auth.role === ROLES.SUPER_ADMIN;
  const [sum, series, companies, mix, developer, verified, demos, audit] = await Promise.all([
    totals(scope, days),
    trend(scope, days),
    companyRows(scope, days),
    mixes(scope, days),
    safe(developerUsage(scope), { api_7d: 0, capture_7d: 0, failed_7d: 0 }),
    safe(verifiedUsers(scope), null),
    isSuper ? safe(rowsOf("SELECT TOP 5 id, name, email, company, status, created_at FROM demo_requests WHERE status = 'pending' ORDER BY created_at DESC"), []) : [],
    isSuper ? safe(rowsOf("SELECT TOP 8 audit_id, company_id, action, user_email, user_role, logged_at FROM audit_logs ORDER BY logged_at DESC"), []) : [],
  ]);
  const [pendingDemos] = isSuper ? await safe(rowsOf("SELECT COUNT(*) AS n FROM demo_requests WHERE status = 'pending'"), [{ n: 0 }]) : [{ n: 0 }];
  const health = ["active", "quiet", "new", "at_risk", "suspended"].map((key) => ({ key, value: companies.filter((c) => c.health === key).length }));
  return {
    days,
    generated_at: new Date().toISOString(),
    totals: { ...sum, users_verified: verified, demos_pending: Number(pendingDemos?.n) || 0, developer_companies: companies.filter((c) => c.developer_api).length },
    series,
    companies: companies.map(({ access, ...rest }) => rest).sort((a, b) => b.leads_period - a.leads_period || b.leads_total - a.leads_total),
    health,
    adoption: adoption(companies),
    roles: mix.roles,
    sources: mix.sources,
    developer,
    demos,
    audit,
  };
}

module.exports = { getOverview, healthOf, scopeFor };
