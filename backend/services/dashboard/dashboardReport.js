const ExcelJS = require("exceljs");
const kit = require("../reports/sheetKit");
const repo = require("../../repositories/dashboardInsightsRepository");
const { getInsights, TEAM_ROLES } = require("./insightsService");
const leadService = require("../leadService");

const { label, ist, statusTone } = kit;
const rate = (won, lost) => (won + lost ? won / (won + lost) : null);
const conversion = (won, total) => (total ? won / total : 0);
const sourceName = (value) => (value === "not-set" ? "Not set" : label(value));

const breakdownColumns = (header, nameOf = (r) => r.name) => [
  { key: "name", header, bold: true, value: nameOf },
  { key: "total", header: "Leads", format: "int", total: true, value: (r) => r.total },
  { key: "open", header: "Open", format: "int", total: true, value: (r) => r.open },
  { key: "won", header: "Won", format: "int", total: true, value: (r) => r.won },
  { key: "lost", header: "Lost", format: "int", total: true, value: (r) => r.lost },
  { key: "conversion", header: "Conversion", format: "pct", value: (r) => conversion(r.won, r.total) },
  { key: "winRate", header: "Win rate (of closed)", format: "pct", optional: true, value: (r) => rate(r.won, r.lost) },
  { key: "value", header: "Lead value", format: "inr", total: true, value: (r) => r.value },
  { key: "wonValue", header: "Won value", format: "inr", total: true, value: (r) => r.wonValue },
];

const CATALOG = [
  { key: "summary", label: "Summary", description: "Headline numbers for the period" },
  { key: "sources", label: "Lead sources", description: "Where leads came from and how many converted", columns: breakdownColumns("Source", (r) => sourceName(r.name)) },
  {
    key: "sourceOwner", label: "Source by person", description: "Each person's leads from each source",
    options: [{ key: "rows", label: "Rows", choices: [["owner", "Person"], ["team", "Team"]] }, { key: "measure", label: "Show", choices: [["total", "Leads"], ["won", "Won"]] }],
  },
  {
    key: "owners", label: "People", description: "Leads, won, open, overdue and activity per person",
    options: [{ key: "group", label: "Group rows by", choices: [["none", "No grouping"], ["team", "Team"]] }],
    columns: [
      { key: "name", header: "Person", bold: true, value: (r) => r.name },
      { key: "team", header: "Team", value: (r) => r.team },
      { key: "added", header: "Leads added", format: "int", total: true, value: (r) => r.added },
      { key: "won", header: "Won", format: "int", total: true, value: (r) => r.won },
      { key: "lost", header: "Lost", format: "int", total: true, value: (r) => r.lost },
      { key: "conversion", header: "Conversion", format: "pct", value: (r) => conversion(r.won, r.added) },
      { key: "open", header: "Open now", format: "int", total: true, value: (r) => r.open },
      { key: "overdue", header: "Overdue now", format: "int", total: true, tone: (r) => (r.overdue ? "danger" : null), value: (r) => r.overdue },
      { key: "updates", header: "Updates written", format: "int", total: true, value: (r) => r.updates },
      { key: "calls", header: "Calls", format: "int", total: true, optional: true, value: (r) => r.calls },
      { key: "pipeline", header: "Open pipeline", format: "inr", total: true, value: (r) => r.pipeline },
      { key: "wonValue", header: "Won value", format: "inr", total: true, value: (r) => r.wonValue },
      { key: "advance", header: "Advance received", format: "inr", total: true, optional: true, value: (r) => r.advance },
    ],
  },
  { key: "products", label: "Products", description: "Leads and value per product", columns: breakdownColumns("Product") },
  { key: "funnel", label: "Status", description: "Leads added in the period, by their status now", columns: breakdownColumns("Status", (r) => label(r.name)) },
  {
    key: "trend", label: "Over time", description: "Leads added and won each day (each month for All time or periods over 4 months)",
    columns: [
      { key: "day", header: "Date", format: "date", value: (r) => new Date(`${r.day}T00:00:00Z`) },
      { key: "total", header: "Leads added", format: "int", total: true, value: (r) => r.total },
      { key: "won", header: "Of those, won", format: "int", total: true, value: (r) => r.won },
    ],
  },
  {
    key: "usage", label: "CRM use", description: "Last login, last activity and work done per person", teamOnly: true,
    columns: [
      { key: "name", header: "Person", bold: true, value: (r) => r.name },
      { key: "role", header: "Role", value: (r) => label(r.role) },
      { key: "status", header: "Status", tone: (r) => (r.quiet ? "warn" : "ok"), value: (r) => (r.quiet ? "Quiet" : "Active") },
      { key: "lastActive", header: "Last activity", format: "datetime", value: (r) => ist(r.lastActive) },
      { key: "lastLogin", header: "Last login", format: "datetime", value: (r) => ist(r.lastLogin) },
      { key: "updates", header: "Updates written", format: "int", total: true, value: (r) => r.updates },
      { key: "leadsAdded", header: "Leads added", format: "int", total: true, value: (r) => r.leadsAdded },
      { key: "calls", header: "Calls", format: "int", total: true, value: (r) => r.calls },
    ],
  },
];
const DEFAULT_SHEETS = ["summary", "sources", "owners", "funnel"];

const reportCatalog = (role) => kit.catalogFor(CATALOG.filter((s) => TEAM_ROLES.includes(role) || (!s.teamOnly && !["owners", "sourceOwner"].includes(s.key))))
  .map((sheet) => ({ ...sheet, selectedByDefault: DEFAULT_SHEETS.includes(sheet.key) }));

function option(q, sheet, key, fallback) {
  const value = String(q[`${key}_${sheet}`] || "");
  const def = CATALOG.find((s) => s.key === sheet).options.find((o) => o.key === key);
  return def.choices.some(([k]) => k === value) ? value : fallback;
}

function addMatrix(workbook, cells, q, meta) {
  const rowsBy = option(q, "sourceOwner", "rows", "owner");
  const measure = option(q, "sourceOwner", "measure", "total");
  const sources = [...new Set(cells.map((c) => c.source))].sort();
  const groups = new Map();
  for (const cell of cells) {
    const key = cell[rowsBy];
    if (!groups.has(key)) groups.set(key, { name: key, team: cell.team, values: {}, total: 0 });
    const row = groups.get(key);
    row.values[cell.source] = (row.values[cell.source] || 0) + cell[measure];
    row.total += cell[measure];
  }
  const columns = [
    { key: "name", header: rowsBy === "team" ? "Team" : "Person", bold: true, value: (r) => r.name },
    ...(rowsBy === "owner" ? [{ key: "team", header: "Team", value: (r) => r.team }] : []),
    ...sources.map((source) => ({ key: source, header: sourceName(source), format: "int", total: true, value: (r) => r.values[source] || 0 })),
    { key: "total", header: "Total", format: "int", total: true, bold: true, value: (r) => r.total },
  ];
  kit.addDataSheet(workbook, {
    name: measure === "won" ? "Won by source" : "Source by person", columns, rows: [...groups.values()].sort((a, b) => b.total - a.total), freezeColumns: 1,
    note: measure === "won" ? "Won leads from those added in the period." : "Leads added in the period.", empty: "No leads in this period.",
  }, meta);
}

async function buildDashboardReport(auth, query = {}) {
  const insights = await getInsights(auth, { ...query, widgets: undefined });
  const w = insights.widgets;
  const data = (key) => w[key]?.data;
  const meta = {
    title: "GreenCRM — Dashboard Report",
    lines: [`Period: ${insights.range.all ? "All time" : `${insights.range.from} to ${insights.range.to}`}${query.filter_label ? ` · ${String(query.filter_label).slice(0, 120)}` : ""}`, `Generated ${kit.generatedAt()} IST by ${auth.name || auth.email || "GreenCRM user"}`],
  };
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GreenCRM";
  workbook.calcProperties.fullCalcOnLoad = true;
  const allowed = new Set(reportCatalog(auth.role).map((s) => s.key));
  const layout = kit.resolveLayout(CATALOG, query, DEFAULT_SHEETS).filter(({ sheet }) => allowed.has(sheet.key));

  for (const { sheet, columns } of layout) {
    if (sheet.key === "summary") {
      const k = data("kpis");
      const { section, line, table } = kit.summaryWriter(workbook, meta);
      if (k) {
        section("Leads added in the period");
        line("Leads added", k.cohort.added);
        line("Won", k.cohort.won, `${k.cohort.added ? Math.round((k.cohort.won / k.cohort.added) * 100) : 0}% of leads added`);
        line("Lost", k.cohort.lost);
        line("Still open", k.cohort.still_open);
        line("Won value", k.cohort.won_value, "", "inr");
        line("Updates written", k.updates);
        section("Right now");
        line("Open leads", k.now.open_leads);
        line("Open pipeline", k.now.pipeline_value, "", "inr");
        line("Follow-ups overdue", k.now.overdue);
        line("Follow-ups today", k.now.today);
        line("Tasks overdue", k.tasks.overdue);
        line("Advance received", k.now.advance_received, "", "inr");
        line("Pending amount", k.now.pending_amount, "", "inr");
      }
      if (data("sources")) {
        section("Top sources");
        table(["Source", "Leads", "Won"], data("sources").slice(0, 10).map((s) => [sourceName(s.name), s.total, s.won]), [null, "int", "int"]);
      }
    } else if (sheet.key === "sourceOwner") {
      const scope = await leadService.buildLeadFilters(auth, { team_ids: query.team_ids || undefined, assigned_to: query.assigned_to || undefined, product_id: query.product_id || undefined });
      const start = insights.range.all ? null : new Date(`${insights.range.from}T00:00:00.000+05:30`);
      const end = new Date(`${insights.range.to}T23:59:59.999+05:30`);
      addMatrix(workbook, await repo.getSourceByOwner({ ...scope, createdFrom: start, createdTo: end, dateFilterType: "created_at" }), query, meta);
    } else if (sheet.key === "owners") {
      const groupBy = option(query, "owners", "group", "none") === "team" ? (r) => r.team || "No team" : null;
      const rows = (data("team") || []).slice().sort((a, b) => (groupBy ? groupBy(a).localeCompare(groupBy(b)) : 0) || b.added - a.added);
      kit.addDataSheet(workbook, { name: "People", columns, rows, groupBy, freezeColumns: 1, empty: "No people in this view." }, meta);
    } else {
      const rows = { sources: data("sources"), products: data("products"), funnel: data("funnel"), trend: data("trend"), usage: data("usage") }[sheet.key] || [];
      kit.addDataSheet(workbook, { name: sheet.label, columns: sheet.key === "funnel" ? columns.map((c) => (c.key === "name" ? { ...c, tone: (r) => statusTone(r.name) } : c)) : columns, rows, freezeColumns: 1, empty: "Nothing in this period." }, meta);
    }
  }
  return { buffer: await workbook.xlsx.writeBuffer(), range: insights.range };
}

module.exports = { buildDashboardReport, reportCatalog, CATALOG };
