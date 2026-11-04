const AppError = require("../../utils/appError");
const { ROLES } = require("../../constants/roles");
const repo = require("../../repositories/dashboardInsightsRepository");
const leadRepository = require("../../repositories/leadRepository");
const teamRepository = require("../../repositories/teamRepository");
const leadService = require("../leadService");
const taskService = require("../taskService");
const { getIndiaDayStartUtc } = require("../../utils/indiaDateBuckets");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400000;
const MAX_DAYS = 366;
const TEAM_ROLES = [ROLES.ADMIN, ROLES.MANAGER];
const DASHBOARD_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.MARKETING, ROLES.LEGAL_TEAM, ROLES.FINANCE_TEAM, ROLES.SUPPORT, ROLES.VIEWER];

// Which widgets each role may ask for. The data inside is still limited to the viewer's scope.
const WIDGET_ROLES = {
  kpis: DASHBOARD_ROLES,
  myday: [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.MARKETING, ROLES.SUPPORT],
  sources: DASHBOARD_ROLES,
  funnel: DASHBOARD_ROLES,
  trend: DASHBOARD_ROLES,
  products: DASHBOARD_ROLES,
  team: TEAM_ROLES,
  usage: TEAM_ROLES,
  payments: [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.MARKETING, ROLES.FINANCE_TEAM],
  workflow: [ROLES.ADMIN, ROLES.MANAGER, ROLES.LEGAL_TEAM, ROLES.FINANCE_TEAM],
};

const istKey = (ms) => new Date(ms + 330 * 60000).toISOString().slice(0, 10);
const istStart = (key) => new Date(`${key}T00:00:00.000+05:30`);
const istEnd = (key) => new Date(`${key}T23:59:59.999+05:30`);

// From the first lead ever, when "All time" is chosen.
const EPOCH = new Date("2000-01-01T00:00:00.000Z");

function parseRange(query) {
  const today = istKey(Date.now());
  if (query.period === "all") return { all: true, from: null, to: today, start: EPOCH, end: istEnd(today) };
  const to = DATE_RE.test(String(query.to || "")) ? String(query.to) : today;
  const from = DATE_RE.test(String(query.from || "")) ? String(query.from) : istKey(istStart(to).getTime() - 29 * DAY_MS);
  if (from > to) throw new AppError("The from date must be before the to date.", 400);
  if ((istStart(to) - istStart(from)) / DAY_MS > MAX_DAYS) throw new AppError("Choose up to one year.", 400);
  return { from, to, start: istStart(from), end: istEnd(to) };
}

function allowedWidgets(role, requested) {
  const keys = requested ? String(requested).split(",").map((s) => s.trim()) : Object.keys(WIDGET_ROLES);
  return keys.filter((key) => WIDGET_ROLES[key]?.includes(role));
}

async function scopeFor(auth, query) {
  if (!DASHBOARD_ROLES.includes(auth.role) || !auth.companyId) throw new AppError("This dashboard is not available for your role.", 403);
  const canTeam = TEAM_ROLES.includes(auth.role);
  const scope = await leadService.buildLeadFilters(auth, {
    team_ids: query.team_ids || undefined,
    assigned_to: canTeam ? query.assigned_to || undefined : undefined,
    product_id: query.product_id || undefined,
  });
  return { scope, canTeam };
}

async function peopleInScope(auth, scope, query) {
  if (TEAM_ROLES.includes(auth.role) && query.assigned_to) return [String(query.assigned_to)];
  if (!Array.isArray(scope.teamIds)) return null;
  return teamRepository.listUsersForTeams(auth.companyId, scope.teamIds);
}

const taskTotal = async (auth, params) => Number((await taskService.listTasks(auth, { page_size: "1", ...params })).meta?.total || 0);

const BUILDERS = {
  async kpis(ctx) {
    const { auth, scope, range, canTeam, query } = ctx;
    const taskScope = canTeam ? { team_ids: query.team_ids || undefined, assigned_to: query.assigned_to || undefined } : { mine: "1" };
    const todayStart = getIndiaDayStartUtc(new Date());
    const [now, cohort, updates, overdueTasks, todayTasks] = await Promise.all([
      leadRepository.getLeadCounts(scope),
      repo.getCohortTotals(ctx.rangeFilters),
      repo.countUpdates(scope, range.start, range.end, canTeam ? query.assigned_to || null : auth.userId),
      taskTotal(auth, { ...taskScope, due_bucket: "overdue", open_only: "1" }),
      taskTotal(auth, { ...taskScope, open_only: "1", due_from: todayStart.toISOString(), due_to: new Date(todayStart.getTime() + DAY_MS).toISOString() }),
    ]);
    return { now, cohort, updates, tasks: { overdue: overdueTasks, today: todayTasks } };
  },

  async myday(ctx) {
    const { auth, scope } = ctx;
    const mine = { ...scope, assignedTo: auth.userId };
    const page = { limit: 6, offset: 0, page: 1, pageSize: 6 };
    const pick = (lead) => ({ leadId: lead.lead_id, name: lead.company_name || lead.contact_person, contact: lead.contact_person, phone: lead.phone, status: lead.status, followUp: lead.follow_up_date, priority: lead.priority });
    const tomorrow = new Date(getIndiaDayStartUtc(new Date()).getTime() + DAY_MS).toISOString();
    const [overdue, today, tasks] = await Promise.all([
      leadRepository.listLeads({ ...mine, followUp: "overdue", sort: "follow_up_date", sortDir: "asc" }, page),
      leadRepository.listLeads({ ...mine, followUp: "today", sort: "follow_up_date", sortDir: "asc" }, page),
      taskService.listTasks(auth, { mine: "1", open_only: "1", due_to: tomorrow, page_size: "6" }),
    ]);
    return {
      overdue: { total: overdue.total || 0, items: (overdue.rows || []).map(pick) },
      today: { total: today.total || 0, items: (today.rows || []).map(pick) },
      tasks: { total: Number(tasks.meta?.total || 0), items: (tasks.items || []).map((t) => ({ taskId: t.task_id, title: t.title, type: t.type, due: t.due_date, leadId: t.related_to === "lead" ? t.related_id : null })) },
    };
  },

  sources: (ctx) => repo.getBreakdown(ctx.rangeFilters, "source"),
  funnel: (ctx) => repo.getBreakdown(ctx.rangeFilters, "status"),
  products: (ctx) => repo.getBreakdown(ctx.rangeFilters, "product"),

  async trend(ctx) {
    const spanDays = (istStart(ctx.range.to) - (ctx.range.all ? 0 : istStart(ctx.range.from))) / DAY_MS;
    if (ctx.range.all || spanDays > 120) {
      return (await repo.getMonthlyTrend(ctx.rangeFilters)).map((m) => ({ day: `${m.month}-01`, month: m.month, total: m.total, won: m.won }));
    }
    const counts = new Map((await repo.getDailyTrend(ctx.rangeFilters)).map((d) => [d.day, d]));
    const days = [];
    for (let t = istStart(ctx.range.from).getTime(); t <= istStart(ctx.range.to).getTime(); t += DAY_MS) {
      const key = istKey(t);
      days.push(counts.get(key) || { day: key, total: 0, won: 0 });
    }
    return days;
  },

  async team(ctx) {
    const [owners, people] = await Promise.all([
      repo.getOwnerStats(ctx.scope, ctx.rangeFilters, getIndiaDayStartUtc(new Date())),
      ctx.people(),
    ]);
    const activity = new Map(people.map((p) => [p.userId, p]));
    return owners.map((o) => ({ ...o, updates: activity.get(o.userId)?.updates || 0, calls: activity.get(o.userId)?.calls || 0 }))
      .sort((a, b) => b.added - a.added || b.open - a.open);
  },

  async usage(ctx) {
    const people = await ctx.people();
    const quietSince = Date.now() - 3 * DAY_MS;
    return people.map((p) => ({ ...p, quiet: !p.lastActive || new Date(p.lastActive).getTime() < quietSince }))
      .sort((a, b) => Number(b.quiet) - Number(a.quiet) || a.updates - b.updates);
  },

  payments: (ctx) => repo.getPayments(ctx.scope, ctx.range.start, ctx.range.end, istEnd(istKey(Date.now() + 30 * DAY_MS))),
  workflow: (ctx) => repo.getWorkflow(ctx.scope),
};

/** Data for the dashboard widgets the viewer asked for. One failing widget does not break the rest. */
async function getInsights(auth, query = {}) {
  const range = parseRange(query);
  const { scope, canTeam } = await scopeFor(auth, query);
  let peoplePromise;
  const ctx = {
    auth, query, range, scope, canTeam,
    rangeFilters: { ...scope, createdFrom: range.all ? null : range.start, createdTo: range.end, dateFilterType: "created_at" },
    people: () => {
      peoplePromise = peoplePromise || peopleInScope(auth, scope, query).then((ids) => repo.getPeopleActivity(auth.companyId, ids, range.start, range.end));
      return peoplePromise;
    },
  };
  const widgets = allowedWidgets(auth.role, query.widgets);
  const results = await Promise.all(widgets.map(async (key) => {
    try {
      return [key, { data: await BUILDERS[key](ctx) }];
    } catch (error) {
      if (!(error instanceof AppError)) console.error(`[dashboard] ${key} failed:`, error.message);
      return [key, { error: error instanceof AppError ? error.message : "This card could not load." }];
    }
  }));
  return { range: { from: range.from, to: range.to, all: Boolean(range.all) }, role: auth.role, widgets: Object.fromEntries(results) };
}

/** Data for one "build your own" chart: a grouping and a measure from fixed lists. */
async function getCustomChart(auth, query = {}) {
  if (!repo.DIMENSIONS[query.dimension]) throw new AppError("Choose what to group by.", 400);
  if (!repo.MEASURES[query.measure]) throw new AppError("Choose what to count.", 400);
  if (["owner", "team"].includes(query.dimension) && !TEAM_ROLES.includes(auth.role)) throw new AppError("Only admins and managers can group by person or team.", 403);
  if (["advance", "pending", "value", "won_value"].includes(query.measure) && [ROLES.SUPPORT, ROLES.VIEWER, ROLES.LEGAL_TEAM].includes(auth.role)) throw new AppError("Your role cannot see lead money.", 403);
  const range = parseRange(query);
  const { scope } = await scopeFor(auth, query);
  const rows = await repo.getCustomBreakdown({ ...scope, createdFrom: range.all ? null : range.start, createdTo: range.end, dateFilterType: "created_at" }, query.dimension, query.measure);
  return { range: { from: range.from, to: range.to, all: Boolean(range.all) }, rows };
}

module.exports = { getCustomChart, getInsights, parseRange, allowedWidgets, WIDGET_ROLES, TEAM_ROLES };
