const AppError = require("../../utils/appError");
const { ROLES } = require("../../constants/roles");
const { query } = require("../../db/connection");
const leadRepository = require("../../repositories/leadRepository");
const teamRepository = require("../../repositories/teamRepository");
const insightsRepo = require("../../repositories/dashboardInsightsRepository");
const leadService = require("../leadService");
const { getInsights, parseRange } = require("../dashboard/insightsService");
const { buildDashboardReport } = require("../dashboard/dashboardReport");

const REPORT_WIDGETS = "kpis,sources,funnel,trend,products,payments";
const USER_ID_RE = /^[A-Za-z0-9_-]{1,20}$/;

/** The person, if the viewer may see their report: admins anyone, managers their teams, everyone else only themselves. */
async function resolvePerson(auth, userId) {
  if (!USER_ID_RE.test(String(userId || ""))) throw new AppError("Person not found.", 404);
  const [rows] = await query(
    "SELECT user_id, name, email, role, phone, last_login_at, is_active, created_at FROM users WHERE company_id = ? AND user_id = ?",
    [auth.companyId, userId]
  );
  const person = rows[0];
  if (!person) throw new AppError("Person not found.", 404);
  if (auth.role !== ROLES.ADMIN && person.user_id !== auth.userId) {
    if (auth.role !== ROLES.MANAGER) throw new AppError("You can only see your own report.", 403);
    const scope = await leadService.buildLeadFilters(auth, {});
    const people = Array.isArray(scope.teamIds) ? await teamRepository.listUsersForTeams(auth.companyId, scope.teamIds) : [];
    if (!people.map(String).includes(String(person.user_id))) throw new AppError("This person is not in your teams.", 403);
  }
  const [teams] = await query(
    `SELECT t.team_id, t.name FROM team_members tm JOIN teams t ON t.team_id = tm.team_id
     WHERE tm.user_id = ? AND t.company_id = ? AND tm.is_active = 1 AND t.is_active = 1 ORDER BY t.name`,
    [person.user_id, auth.companyId]
  ).catch(() => [[]]);
  return { ...person, is_active: Boolean(person.is_active), teams: teams.map((t) => t.name).join(", ") };
}

async function recentNotes(companyId, userId) {
  const [rows] = await query(
    `SELECT TOP 8 ln.id, ln.lead_id, ln.content, ln.created_at, l.company_name, l.contact_person
     FROM lead_notes ln JOIN leads l ON l.lead_id = ln.lead_id AND l.company_id = ln.company_id
     WHERE ln.company_id = ? AND ln.created_by = ?
     ORDER BY ln.created_at DESC, ln.id DESC`,
    [companyId, userId]
  );
  return rows;
}

/** Everything on the person report screen. Uses the same numbers as the dashboard, filtered to one person. */
async function getPersonReport(auth, userId, q = {}) {
  const person = await resolvePerson(auth, userId);
  const range = parseRange(q);
  const self = person.user_id === auth.userId;
  const scope = await leadService.buildLeadFilters(auth, self ? {} : { assigned_to: person.user_id });
  const page = { limit: 25, offset: 0, page: 1, pageSize: 25 };
  const [insights, activity, overdue, notes] = await Promise.all([
    getInsights(auth, { ...q, assigned_to: person.user_id, widgets: REPORT_WIDGETS }),
    insightsRepo.getPeopleActivity(auth.companyId, [person.user_id], range.start, range.end),
    leadRepository.listLeads({ ...scope, assignedTo: person.user_id, followUp: "overdue", sort: "follow_up_date", sortDir: "asc" }, page),
    recentNotes(auth.companyId, person.user_id),
  ]);
  return {
    person,
    range: insights.range,
    widgets: insights.widgets,
    activity: activity[0] || { updates: 0, leadsAdded: 0, calls: 0, lastActive: null, lastLogin: person.last_login_at },
    overdue: {
      total: overdue.total || 0,
      items: (overdue.rows || []).map((l) => ({ lead_id: l.lead_id, company_name: l.company_name, contact_person: l.contact_person, phone: l.phone, status: l.status, follow_up_date: l.follow_up_date, estimated_value: l.estimated_value })),
    },
    recent_notes: notes,
  };
}

/** The person's Excel: the dashboard report for their leads only. */
async function buildPersonExcel(auth, userId, q = {}) {
  const person = await resolvePerson(auth, userId);
  const { buffer, range } = await buildDashboardReport(auth, { ...q, assigned_to: person.user_id, filter_label: `${person.name}'s report` });
  const label = range.all ? "all-time" : `${range.from}-to-${range.to}`;
  return { buffer, range, person, filename: `GreenCRM-${person.name.replace(/[^A-Za-z0-9]+/g, "-")}-${label}.xlsx` };
}

module.exports = { buildPersonExcel, getPersonReport, resolvePerson };
