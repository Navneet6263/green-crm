const ExcelJS = require("exceljs");
const { query } = require("../../db/connection");
const customerRepository = require("../../repositories/customerRepository");
const customerService = require("../customerService");
const kit = require("../reports/sheetKit");
const { customerHealth } = require("./customerHealth");
const { DEFAULT_STEPS } = require("./customerOnboarding");

const { ist, istDay } = kit;
const PAGE = 1000;
const MAX_PAGES = 10;
const DAY = 86400000;
const num = (v) => Number(v || 0);
const pending = (c) => Math.max(0, num(c.total_value) - num(c.paid_amount));
const daysUntil = (v) => (v ? Math.ceil((new Date(v).getTime() - Date.now()) / DAY) : null);
const onboardPct = (c) => (num(c.onboarding_steps_total) ? num(c.onboarding_steps_done) / num(c.onboarding_steps_total) : null);
const titleize = (v) => String(v || "").replace(/[-_]/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());
const healthTone = (h) => ({ good: "good", watch: "warn", risk: "danger" }[h.level] || null);

const CATALOG = [
  { key: "summary", label: "Summary", description: "Totals: customers, money, onboarding and renewals" },
  {
    key: "customers", label: "Customers", description: "One row per customer",
    options: [{ key: "group", label: "Group rows by", choices: [["none", "No grouping"], ["owner", "Owner"], ["onboarding", "Onboarding status"], ["health", "Health"], ["product", "Product"], ["team", "Team"]] }],
    columns: [
      { key: "company", header: "Company", bold: true, value: (c) => c.company_name },
      { key: "contact", header: "Contact", value: (c) => c.name },
      { key: "phone", header: "Phone", value: (c) => c.phone },
      { key: "email", header: "Email", value: (c) => c.email },
      { key: "owner", header: "Owner", value: (c) => c.assigned_to_name || "Unassigned" },
      { key: "team", header: "Team", optional: true, value: (c) => c.team_name },
      { key: "product", header: "Product", value: (c) => c.product_name },
      { key: "status", header: "Status", value: (c) => titleize(c.status), tone: (c) => (c.status === "active" ? "good" : "neutral") },
      { key: "value", header: "Contract value", format: "inr", total: true, value: (c) => num(c.total_value) },
      { key: "paid", header: "Paid", format: "inr", total: true, value: (c) => num(c.paid_amount) },
      { key: "pending", header: "Pending", format: "inr", total: true, value: pending, tone: (c) => (pending(c) > 0 ? "warn" : null) },
      { key: "last_paid", header: "Last payment", format: "date", value: (c) => ist(c.last_paid_at) },
      { key: "next_payment", header: "Next payment due", format: "date", value: (c) => ist(c.next_payment_date), tone: (c) => (pending(c) > 0 && daysUntil(c.next_payment_date) < 0 ? "danger" : null) },
      { key: "cycle", header: "Billing cycle", optional: true, value: (c) => titleize(c.billing_cycle) },
      { key: "onboarding", header: "Onboarding", value: (c) => titleize(c.onboarding_status || "pending"), tone: (c) => (["done", "completed"].includes(c.onboarding_status) ? "good" : c.onboarding_status === "pending" ? "warn" : "info") },
      { key: "onboarding_pct", header: "Onboarding %", format: "pct", value: onboardPct },
      { key: "renewal", header: "Next renewal", format: "date", value: (c) => ist(c.next_renewal), tone: (c) => (daysUntil(c.next_renewal) !== null && daysUntil(c.next_renewal) < 0 ? "danger" : daysUntil(c.next_renewal) <= 30 ? "warn" : null) },
      { key: "health", header: "Health", value: (c) => c.__health.score, format: "int", tone: (c) => healthTone(c.__health) },
      { key: "health_reasons", header: "Why", optional: true, wrap: true, value: (c) => c.__health.reasons.join(", ") },
      { key: "follow_up", header: "Next follow-up", format: "datetime", optional: true, value: (c) => ist(c.next_follow_up) },
      { key: "last_contact", header: "Last contact", format: "date", optional: true, value: (c) => ist(c.last_interaction) },
      { key: "created", header: "Customer since", format: "date", value: (c) => ist(c.created_at) },
      { key: "lead", header: "From lead", optional: true, value: (c) => c.converted_from_lead_id },
      { key: "id", header: "Customer ID", optional: true, value: (c) => c.customer_id },
    ],
  },
  {
    key: "pending", label: "Money pending", description: "Only customers who still owe money, biggest first",
    columns: [
      { key: "company", header: "Company", bold: true, value: (c) => c.company_name },
      { key: "owner", header: "Owner", value: (c) => c.assigned_to_name || "Unassigned" },
      { key: "phone", header: "Phone", value: (c) => c.phone },
      { key: "value", header: "Contract value", format: "inr", total: true, value: (c) => num(c.total_value) },
      { key: "paid", header: "Paid", format: "inr", total: true, value: (c) => num(c.paid_amount) },
      { key: "pending", header: "Pending", format: "inr", total: true, value: pending, tone: () => "warn" },
      { key: "next_payment", header: "Due on", format: "date", value: (c) => ist(c.next_payment_date) },
      { key: "late", header: "Days late", format: "int", value: (c) => { const d = daysUntil(c.next_payment_date); return d !== null && d < 0 ? -d : null; }, tone: (c) => (daysUntil(c.next_payment_date) < 0 ? "danger" : null) },
      { key: "last_paid", header: "Last payment", format: "date", value: (c) => ist(c.last_paid_at) },
    ],
  },
  {
    key: "payments", label: "Payments", description: "Every payment received, newest first",
    columns: [
      { key: "date", header: "Date", format: "date", value: (p) => ist(p.paid_on) },
      { key: "company", header: "Company", bold: true, value: (p) => p.company_name },
      { key: "amount", header: "Amount", format: "inr", total: true, value: (p) => num(p.amount) },
      { key: "mode", header: "Mode", value: (p) => titleize(p.mode) },
      { key: "reference", header: "Reference", value: (p) => p.reference },
      { key: "note", header: "Note", optional: true, wrap: true, value: (p) => p.note },
      { key: "by", header: "Recorded by", value: (p) => p.recorded_by_name },
    ],
  },
  { key: "onboarding", label: "Onboarding checklist", description: "Each customer against each onboarding step (✓ done, ! overdue)" },
  {
    key: "renewals", label: "Plans and renewals", description: "Every active plan with its end date, soonest first",
    columns: [
      { key: "company", header: "Company", bold: true, value: (s) => s.company_name },
      { key: "product", header: "Product", value: (s) => s.product_name },
      { key: "amount", header: "Amount", format: "inr", total: true, value: (s) => num(s.amount) },
      { key: "start", header: "Start", format: "date", value: (s) => ist(s.start_date) },
      { key: "end", header: "Ends", format: "date", value: (s) => ist(s.end_date) },
      { key: "days", header: "Days left", format: "int", value: (s) => daysUntil(s.end_date), tone: (s) => (daysUntil(s.end_date) < 0 ? "danger" : daysUntil(s.end_date) <= 30 ? "warn" : null) },
      { key: "owner", header: "Owner", value: (s) => s.owner_name },
    ],
  },
];
const DEFAULT_SHEETS = ["summary", "customers", "pending", "payments"];

async function inChunks(ids, run) {
  const out = [];
  for (let i = 0; i < ids.length; i += 500) {
    const part = ids.slice(i, i + 500);
    out.push(...(await run(part, part.map(() => "?").join(", "))));
  }
  return out;
}

/** The customers matching the page's filters (same scope rules as the list), up to 10,000. */
async function loadCustomers(auth, q) {
  const filters = await customerService.buildCustomerFilters(auth, q);
  const rows = [];
  let capped = false;
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await customerRepository.listCustomers({ ...filters, includeSummary: false }, { offset: page * PAGE, limit: PAGE });
    rows.push(...result.rows);
    if (result.rows.length < PAGE) break;
    if (page === MAX_PAGES - 1) capped = true;
  }
  return { customers: rows.map((c) => ({ ...c, __health: customerHealth(c) })), capped };
}

async function buildCustomerWorkbook(auth, q = {}, meta = {}) {
  const { customers, capped } = await loadCustomers(auth, q);
  const layout = kit.resolveLayout(CATALOG, q, DEFAULT_SHEETS);
  const ids = customers.map((c) => c.customer_id);
  const companyOf = new Map(customers.map((c) => [c.customer_id, c]));
  const want = (key) => layout.some((l) => l.sheet.key === key);
  // Customer IDs are unique across companies and come from the scoped list above.

  const payments = want("payments") && ids.length ? await inChunks(ids, async (part, marks) => (await query(
    `SELECT p.customer_id, p.amount, p.paid_on, p.mode, p.reference, p.note, u.name AS recorded_by_name FROM customer_payments p LEFT JOIN users u ON u.user_id = p.recorded_by
     WHERE p.deleted_at IS NULL AND p.customer_id IN (${marks})`, part))[0]) : [];
  const steps = want("onboarding") && ids.length ? await inChunks(ids, async (part, marks) => (await query(
    `SELECT customer_id, step_key, title, is_done, due_date FROM customer_onboarding_steps WHERE customer_id IN (${marks})`, part))[0]) : [];
  const plans = want("renewals") && ids.length ? await inChunks(ids, async (part, marks) => (await query(
    `SELECT cs.customer_id, cs.amount, cs.start_date, cs.end_date, p.name AS product_name FROM customer_subscriptions cs LEFT JOIN products p ON p.product_id = cs.product_id
     WHERE cs.status = 'active' AND cs.customer_id IN (${marks})`, part))[0]) : [];

  const lines = [`${customers.length.toLocaleString("en-IN")} customers${meta.filters ? ` · ${meta.filters}` : ""}`, `Generated ${kit.generatedAt()} IST by ${meta.generatedBy || auth.name}`];
  if (capped) lines.push(`Large export: only the first ${(PAGE * MAX_PAGES).toLocaleString("en-IN")} customers are included.`);
  const full = { title: "GreenCRM — Customers Report", lines };
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GreenCRM";
  workbook.calcProperties.fullCalcOnLoad = true;

  for (const { sheet, columns } of layout) {
    if (sheet.key === "summary") {
      const { section, line, table } = kit.summaryWriter(workbook, full);
      const owed = customers.filter((c) => pending(c) > 0);
      section("Customers");
      line("Customers", customers.length);
      line("Active", customers.filter((c) => c.status === "active").length);
      line("Need attention (health below 50)", customers.filter((c) => c.__health.level === "risk").length);
      section("Money");
      line("Contract value", customers.reduce((s, c) => s + num(c.total_value), 0), "", "inr");
      line("Collected", customers.reduce((s, c) => s + num(c.paid_amount), 0), "", "inr");
      line("Pending", owed.reduce((s, c) => s + pending(c), 0), `${owed.length} customers still owe money`, "inr");
      line("Payment overdue", owed.filter((c) => daysUntil(c.next_payment_date) < 0).length, "Pending money past its due date");
      section("Onboarding");
      for (const [key, name] of [["pending", "Not started"], ["in-progress", "In progress"], ["done", "Done"]]) {
        line(name, customers.filter((c) => (key === "in-progress" ? ["in-progress", "training"] : key === "done" ? ["done", "completed"] : ["pending", null, undefined, ""]).includes(c.onboarding_status)).length);
      }
      section("Pending by owner");
      const byOwner = new Map();
      for (const c of owed) { const k = c.assigned_to_name || "Unassigned"; byOwner.set(k, [(byOwner.get(k)?.[0] || 0) + 1, (byOwner.get(k)?.[1] || 0) + pending(c)]); }
      table(["Owner", "Customers", "Pending"], [...byOwner].sort((a, b) => b[1][1] - a[1][1]).map(([k, [n, v]]) => [k, n, v]), [null, "int", "inr"]);
    } else if (sheet.key === "customers") {
      const group = sheet.options[0].choices.some(([k]) => k === q.group_customers) ? q.group_customers : "none";
      const groupBy = { owner: (c) => c.assigned_to_name || "Unassigned", onboarding: (c) => titleize(c.onboarding_status || "pending"), health: (c) => titleize(c.__health.level), product: (c) => c.product_name || "No product", team: (c) => c.team_name || "No team" }[group];
      const rows = groupBy ? [...customers].sort((a, b) => String(groupBy(a)).localeCompare(String(groupBy(b)))) : customers;
      kit.addDataSheet(workbook, { name: "Customers", columns, rows, groupBy, freezeColumns: 1 }, full);
    } else if (sheet.key === "pending") {
      const rows = customers.filter((c) => pending(c) > 0).sort((a, b) => pending(b) - pending(a));
      kit.addDataSheet(workbook, { name: "Money pending", columns, rows, empty: "No money pending.", tabColor: "FFB45309", freezeColumns: 1 }, full);
    } else if (sheet.key === "payments") {
      const rows = payments.map((p) => ({ ...p, company_name: companyOf.get(p.customer_id)?.company_name })).sort((a, b) => new Date(b.paid_on) - new Date(a.paid_on));
      kit.addDataSheet(workbook, { name: "Payments", columns, rows, empty: "No payments recorded." }, full);
    } else if (sheet.key === "renewals") {
      const rows = plans.map((s) => ({ ...s, company_name: companyOf.get(s.customer_id)?.company_name, owner_name: companyOf.get(s.customer_id)?.assigned_to_name })).sort((a, b) => new Date(a.end_date) - new Date(b.end_date));
      kit.addDataSheet(workbook, { name: "Plans and renewals", columns, rows, empty: "No active plans." }, full);
    } else if (sheet.key === "onboarding") {
      // A grid: one row per customer, one column per standard step.
      const byCustomer = new Map();
      for (const s of steps) { if (!byCustomer.has(s.customer_id)) byCustomer.set(s.customer_id, new Map()); byCustomer.get(s.customer_id).set(s.step_key, s); }
      const mark = (c, key) => { const s = byCustomer.get(c.customer_id)?.get(key); if (!s) return ""; if (s.is_done) return "✓"; return s.due_date && new Date(s.due_date) < new Date() ? "!" : "–"; };
      const gridColumns = [
        { key: "company", header: "Company", bold: true, value: (c) => c.company_name },
        { key: "owner", header: "Owner", value: (c) => c.assigned_to_name || "Unassigned" },
        { key: "pct", header: "Done", format: "pct", value: onboardPct },
        ...DEFAULT_STEPS.map(([key, title]) => ({ key, header: title, value: (c) => mark(c, key), tone: (c) => ({ "✓": "good", "!": "danger" }[mark(c, key)] || null) })),
      ];
      kit.addDataSheet(workbook, { name: "Onboarding", columns: gridColumns, rows: customers, note: "✓ done · ! overdue · – not done yet · blank: checklist not opened yet", freezeColumns: 1 }, full);
    }
  }
  return { buffer: await workbook.xlsx.writeBuffer(), count: customers.length };
}

const customerExportCatalog = () => kit.catalogFor(CATALOG).map((sheet) => ({ ...sheet, selectedByDefault: DEFAULT_SHEETS.includes(sheet.key) }));

module.exports = { CATALOG, DEFAULT_SHEETS, buildCustomerWorkbook, customerExportCatalog };
