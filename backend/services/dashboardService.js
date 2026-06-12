const dashboardRepository = require("../repositories/dashboardRepository");
const { ROLES } = require("../constants/roles");
const { getAccessibleCompanyIds, isPlatformOperatorRole } = require("../utils/tenant");
const { parseRequestedTeamIds, resolveTeamScope } = require("./accessScopeService");

const dashboardCache = new Map();

function getAssignedViewerColumns(role) {
  if (role === ROLES.LEGAL_TEAM) {
    return ["assigned_to_legal", "assigned_to"];
  }

  if (role === ROLES.FINANCE_TEAM) {
    return ["assigned_to_finance", "assigned_to"];
  }

  return ["assigned_to"];
}

function parseCacheControl(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function getCacheTtlMs() {
  const ttlSeconds = Number(process.env.DASHBOARD_CACHE_TTL_SECONDS || 30);
  return Number.isFinite(ttlSeconds) ? Math.max(ttlSeconds, 0) * 1000 : 30000;
}

function readCache(key) {
  const entry = dashboardCache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    dashboardCache.delete(key);
    return null;
  }

  return entry.value;
}

function writeCache(key, value, ttlMs) {
  dashboardCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function buildScopeKey(teamIds) {
  if (!Array.isArray(teamIds)) {
    return "all";
  }

  if (!teamIds.length) {
    return "none";
  }

  return teamIds.slice().sort().join(",");
}

function buildCacheKey(auth, scopeKey = "all", query = {}) {
  // Sort query keys to ensure consistent cache keys
  const filterKey = Object.keys(query)
    .filter(k => ['from_date', 'to_date', 'status', 'priority', 'lead_source', 'product_id', 'assigned_to'].includes(k))
    .sort()
    .map(k => `${k}=${query[k]}`)
    .join('&');
    
  const suffix = filterKey ? `:${filterKey}` : '';

  if (auth.role === ROLES.SUPER_ADMIN) {
    return `dashboard:platform${suffix}`;
  }

  if (isPlatformOperatorRole(auth.role)) {
    const companyKey = (getAccessibleCompanyIds(auth) || []).slice().sort().join(",");
    return `dashboard:platform:${auth.role}:${auth.userId}:${companyKey}${suffix}`;
  }

  if ([ROLES.ADMIN, ROLES.MANAGER].includes(auth.role)) {
    const identityKey = auth.role === ROLES.MANAGER ? `:${auth.userId}` : "";
    return `dashboard:company:${auth.companyId}:${auth.role}${identityKey}:${scopeKey}${suffix}`;
  }

  if (auth.role === ROLES.SALES || auth.role === ROLES.MARKETING) {
    return `dashboard:user:${auth.companyId}:${auth.role}:${auth.userId}:assigned:${scopeKey}${suffix}`;
  }

  return `dashboard:user:${auth.companyId}:${auth.role}:${auth.userId}:company:${scopeKey}${suffix}`;
}

async function resolveDashboardTeamScope(auth, query = {}) {
  if (!auth.companyId) {
    return null;
  }

  const { teamIds } = await resolveTeamScope(auth, auth.companyId, parseRequestedTeamIds(query), {
    includeManaged: true,
    includeMembership: true,
  });

  return teamIds;
}

async function loadSummary(auth, query = {}) {
  if (auth.role === ROLES.SUPER_ADMIN) {
    return dashboardRepository.getPlatformSummary(null, query);
  }

  if (isPlatformOperatorRole(auth.role)) {
    return dashboardRepository.getPlatformSummary(getAccessibleCompanyIds(auth), query);
  }

  if ([ROLES.ADMIN, ROLES.MANAGER].includes(auth.role)) {
    const teamIds = await resolveDashboardTeamScope(auth, query);
    return dashboardRepository.getCompanySummary(auth.companyId, teamIds, query);
  }

  if ([ROLES.SALES, ROLES.MARKETING, ROLES.LEGAL_TEAM, ROLES.FINANCE_TEAM, ROLES.SUPPORT, ROLES.VIEWER].includes(auth.role)) {
    const teamIds = await resolveDashboardTeamScope(auth, query);
    return dashboardRepository.getUserSummary({
      companyId: auth.companyId,
      userId: auth.userId,
      scope: "assigned",
      teamIds,
      viewerAccessColumns: getAssignedViewerColumns(auth.role),
      query,
    });
  }

  const teamIds = await resolveDashboardTeamScope(auth, query);
  return dashboardRepository.getUserSummary({
    companyId: auth.companyId,
    userId: auth.userId,
    scope: "company",
    teamIds,
    query,
  });
}

async function getSummary(auth, query = {}) {
  const ttlMs = getCacheTtlMs();
  const scopeKey = buildScopeKey(
    auth.companyId ? await resolveDashboardTeamScope(auth, query) : null
  );

  if (ttlMs === 0 || parseCacheControl(query.refresh) || parseCacheControl(query.fresh) || parseCacheControl(query.no_cache)) {
    return loadSummary(auth, query);
  }

  const cacheKey = buildCacheKey(auth, scopeKey, query);
  const cached = readCache(cacheKey);

  if (cached) {
    return cached;
  }

  const summary = await loadSummary(auth, query);
  writeCache(cacheKey, summary, ttlMs);
  return summary;
}



// Widget-level service methods for lazy/parallel dashboard loading
// Each widget fetches only what it needs — no more loading everything at once.
// ---------------------------------------------------------------------------

async function getWidgetKpis(auth, query = {}) {
  const summary = await getSummary(auth, query);
  // Return only the KPI numbers — fast, lightweight
  return {
    lead_counts: summary.lead_counts || summary.leads || null,
    kpis: summary.kpis || null,
    pending_tasks: summary.pending_tasks ?? null,
    overdue_tasks: summary.overdue_tasks ?? null,
    pending_reminders: summary.pending_reminders ?? null,
    team_size: summary.team_size ?? null,
    companies: summary.companies ?? null,
    users: summary.users ?? null,
  };
}

async function getWidgetRecentLeads(auth, query = {}) {
  const summary = await getSummary(auth, query);
  return {
    recent_leads: summary.recent_leads || [],
    recent_activity: summary.recent_activity || [],
  };
}

async function getWidgetTasks(auth, query = {}) {
  const summary = await getSummary(auth, query);
  return {
    pending_tasks: summary.pending_tasks ?? 0,
    overdue_tasks: summary.overdue_tasks ?? 0,
    pending_reminders: summary.pending_reminders ?? 0,
  };
}

async function getWidgetCharts(auth, query = {}) {
  const summary = await getSummary(auth, query);
  return {
    charts: summary.charts || null,
    insights: summary.insights || null,
    source_mix: summary.source_mix || [],
    recent_companies: summary.recent_companies || [],
    recent_products: summary.recent_products || [],
  };
}

module.exports = {
  getSummary,
  getWidgetCharts,
  getWidgetKpis,
  getWidgetRecentLeads,
  getWidgetTasks,
};
