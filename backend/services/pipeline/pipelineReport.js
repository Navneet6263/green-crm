// Pipeline Excel report: the numbers on the Pipeline page (status, workflow stage, people, sources, products,
// priority, trend) plus the full workflow tracker list. Sheets, columns and options come from the column picker.
const ExcelJS = require("exceljs");
const kit = require("../reports/sheetKit");
const leadService = require("../leadService");
const workflowService = require("../workflowService");
const workflowRepository = require("../../repositories/workflowRepository");

const { label, ist, statusTone } = kit;
const MAX_TRACKER_ROWS = 5000;
const RANGE_LABEL = { week: "Last 7 days", month: "Last 31 days", quarter: "Last 92 days", year: "Last 365 days" };
const share = (part, whole) => (whole ? part / whole : 0);

const breakdown = (header, nameOf = (r) => label(r.key)) => [
  { key: "name", header, bold: true, value: nameOf },
  { key: "leads", header: "Leads", format: "int", total: true, value: (r) => r.leads },
  { key: "open", header: "Open", format: "int", total: true, value: (r) => r.open_leads },
  { key: "won", header: "Won", format: "int", total: true, value: (r) => r.won },
  { key: "conversion", header: "Conversion", format: "pct", value: (r) => share(r.won, r.leads) },
  { key: "share", header: "Share of leads", format: "pct", optional: true, value: (r) => r.share },
  { key: "value", header: "Lead value", format: "inr", total: true, value: (r) => r.value },
  { key: "openValue", header: "Open pipeline", format: "inr", total: true, value: (r) => r.open_value },
  { key: "wonValue", header: "Won value", format: "inr", total: true, value: (r) => r.won_value },
];

const CATALOG = [
  { key: "summary", label: "Summary", description: "Headline numbers for the period and filters" },
  { key: "status", label: "Status", description: "Leads by their status now", columns: breakdown("Status") },
  { key: "workflow", label: "Workflow stage", description: "Sales, legal, finance and completed", columns: breakdown("Stage") },
  { key: "owners", label: "People", description: "Leads and value per owner", columns: breakdown("Owner", (r) => r.label || (r.key === "unassigned" ? "Unassigned" : r.key)) },
  { key: "sources", label: "Lead sources", description: "Where leads came from and how many converted", columns: breakdown("Source") },
  { key: "products", label: "Products", description: "Leads and value per product", columns: breakdown("Product", (r) => r.label || "Unmapped") },
  { key: "priority", label: "Priority", description: "Leads by priority", columns: breakdown("Priority") },
  {
    key: "trend", label: "Over time", description: "Leads added and won, by day, week or month",
    options: [{ key: "by", label: "Group by", choices: [["day", "Day"], ["week", "Week"], ["month", "Month"]] }],
    columns: [
      { key: "period", header: "Period", format: "date", value: (r) => new Date(`${r.period}T00:00:00Z`) },
      { key: "leads", header: "Leads added", format: "int", total: true, value: (r) => r.leads },
      { key: "won", header: "Of those, won", format: "int", total: true, value: (r) => r.won },
      { key: "value", header: "Lead value", format: "inr", total: true, value: (r) => r.value },
    ],
  },
  {
    key: "tracker", label: "Workflow leads", description: "Every lead in the tracker with owners and documents", trackerOnly: true,
    columns: [
      { key: "lead", header: "Lead ID", value: (r) => r.lead_id },
      { key: "company", header: "Company", bold: true, value: (r) => r.company_name },
      { key: "contact", header: "Contact", value: (r) => r.contact_person },
      { key: "phone", header: "Phone", optional: true, value: (r) => r.phone },
      { key: "email", header: "Email", optional: true, value: (r) => r.email },
      { key: "stage", header: "Stage", tone: (r) => statusTone(r.workflow_stage), value: (r) => label(r.workflow_stage || "sales") },
      { key: "status", header: "Status", tone: (r) => statusTone(r.status), value: (r) => label(r.status || "new") },
      { key: "priority", header: "Priority", value: (r) => label(r.priority || "medium") },
      { key: "owner", header: "Sales owner", value: (r) => r.assigned_to_name || "Unassigned" },
      { key: "legal", header: "Legal owner", value: (r) => r.legal_owner_name || "" },
      { key: "finance", header: "Finance owner", value: (r) => r.finance_owner_name || "" },
      { key: "product", header: "Product", value: (r) => r.product_name || "" },
      { key: "source", header: "Source", optional: true, value: (r) => label(r.lead_source || "") },
      { key: "value", header: "Lead value", format: "inr", total: true, value: (r) => Number(r.estimated_value) || 0 },
      { key: "invoice", header: "Invoice amount", format: "inr", total: true, optional: true, value: (r) => Number(r.invoice_amount) || 0 },
      { key: "docs", header: "Documents", format: "int", total: true, value: (r) => Number(r.doc_count) || 0 },
      { key: "followUp", header: "Next follow-up", format: "datetime", tone: (r) => (r.follow_up_date && new Date(r.follow_up_date) < new Date() ? "danger" : null), value: (r) => ist(r.follow_up_date) },
      { key: "created", header: "Created", format: "date", optional: true, value: (r) => kit.istDay(r.created_at) },
      { key: "updated", header: "Last updated", format: "datetime", value: (r) => ist(r.updated_at) },
    ],
  },
];
const DEFAULT_SHEETS = ["summary", "status", "workflow", "owners", "sources", "tracker"];

const canTrack = (role) => workflowService.TRACKER_ROLES.includes(role);
const reportCatalog = (role) => kit.catalogFor(CATALOG.filter((s) => !s.trackerOnly || canTrack(role)))
  .map((sheet) => ({ ...sheet, selectedByDefault: DEFAULT_SHEETS.includes(sheet.key) }));

function option(q, sheet, key, fallback) {
  const value = String(q[`${key}_${sheet}`] || "");
  const def = CATALOG.find((s) => s.key === sheet).options.find((o) => o.key === key);
  return def.choices.some(([k]) => k === value) ? value : fallback;
}

/** Day rows rolled up to weeks (starting Monday) or months. */
function rollUp(days, by) {
  const bucket = (day) => {
    if (by === "month") return `${day.slice(0, 7)}-01`;
    if (by === "week") { const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); }
    return day;
  };
  const map = new Map();
  for (const r of days) {
    const key = bucket(r.key);
    const row = map.get(key) || { period: key, leads: 0, won: 0, value: 0 };
    row.leads += Number(r.leads) || 0; row.won += Number(r.won) || 0; row.value += Number(r.value) || 0;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => a.period.localeCompare(b.period));
}

async function buildPipelineReport(auth, query = {}) {
  const analytics = await leadService.getAnalytics(auth, query);
  const rows = (analytics.rows || []).map((r) => ({ ...r, leads: Number(r.leads) || 0, won: Number(r.won) || 0, value: Number(r.value) || 0, won_value: Number(r.won_value) || 0, open_leads: Number(r.open_leads) || 0, open_value: Number(r.open_value) || 0 }));
  const total = rows.find((r) => r.dimension === "total") || { leads: 0, won: 0, value: 0, won_value: 0, open_leads: 0, open_value: 0 };
  const of = (dimension) => rows.filter((r) => r.dimension === dimension).map((r) => ({ ...r, share: share(r.leads, total.leads) })).sort((a, b) => b.leads - a.leads);

  const filterBits = [query.filter_label].filter(Boolean).map((s) => String(s).slice(0, 120));
  const meta = {
    title: "GreenCRM — Pipeline Report",
    lines: [`Period: ${RANGE_LABEL[query.range] || RANGE_LABEL.month} (leads created ${String(analytics.from_date).slice(0, 10)} to ${String(analytics.to_date).slice(0, 10)})${filterBits.length ? ` · ${filterBits.join(" · ")}` : ""}`, `Generated ${kit.generatedAt()} IST by ${auth.name || auth.email || "GreenCRM user"}`],
  };
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GreenCRM";
  workbook.calcProperties.fullCalcOnLoad = true;
  const allowed = new Set(reportCatalog(auth.role).map((s) => s.key));
  const layout = kit.resolveLayout(CATALOG, query, DEFAULT_SHEETS.filter((k) => allowed.has(k))).filter(({ sheet }) => allowed.has(sheet.key));

  for (const { sheet, columns } of layout) {
    if (sheet.key === "summary") {
      const { section, line, table } = kit.summaryWriter(workbook, meta);
      section("Leads created in the period");
      line("Leads", total.leads);
      line("Won", total.won, `${Math.round(share(total.won, total.leads) * 100)}% of leads`);
      line("Still open", total.open_leads);
      line("Lead value", total.value, "", "inr");
      line("Open pipeline", total.open_value, "", "inr");
      line("Won value", total.won_value, "", "inr");
      section("Workflow stage");
      table(["Stage", "Leads", "Won"], of("workflow").map((r) => [label(r.key), r.leads, r.won]), [null, "int", "int"]);
      section("Top owners");
      table(["Owner", "Leads", "Won", "Open pipeline"], of("owner").slice(0, 10).map((r) => [r.label || "Unassigned", r.leads, r.won, r.open_value]), [null, "int", "int", "inr"]);
    } else if (sheet.key === "trend") {
      const days = rows.filter((r) => r.dimension === "day");
      kit.addDataSheet(workbook, { name: sheet.label, columns, rows: rollUp(days, option(query, "trend", "by", "day")), freezeColumns: 1, empty: "No leads in this period." }, meta);
    } else if (sheet.key === "tracker") {
      // The Workflow tab's own filters come prefixed with wf_, so they do not clash with the Insights filters.
      const filters = await workflowService.buildTrackerFilters(auth, {
        company_id: query.company_id, team_ids: query.team_ids, stage: query.wf_stage, status: query.wf_status,
        owner: query.wf_owner, priority: query.wf_priority, lead_source: query.wf_source, search: query.wf_search,
      });
      const { rows: leads, total: count } = await workflowRepository.listWorkflowLeads({ ...filters, pagination: { page: 1, limit: MAX_TRACKER_ROWS, offset: 0 } });
      kit.addDataSheet(workbook, {
        name: sheet.label, columns, rows: leads, freezeColumns: 2, empty: "No leads in the workflow tracker.",
        note: count > leads.length ? `First ${leads.length} of ${count} leads (most recently updated). Narrow the filters for the rest.` : "All leads in the workflow tracker for these filters (any creation date).",
      }, meta);
    } else {
      const dimension = { status: "status", workflow: "workflow", owners: "owner", sources: "source", products: "product", priority: "priority" }[sheet.key];
      const sheetColumns = ["status", "workflow"].includes(sheet.key) ? columns.map((c) => (c.key === "name" ? { ...c, tone: (r) => statusTone(r.key) } : c)) : columns;
      kit.addDataSheet(workbook, { name: sheet.label, columns: sheetColumns, rows: of(dimension), freezeColumns: 1, empty: "Nothing in this period." }, meta);
    }
  }
  return { buffer: await workbook.xlsx.writeBuffer() };
}

module.exports = { CATALOG, buildPipelineReport, reportCatalog, rollUp };
