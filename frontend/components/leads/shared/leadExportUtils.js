"use client";

import { apiRequest } from "../../../lib/api";
import { LEAD_EXPORT_PAGE_SIZE } from "./leadPageConstants";
import { buildQueryPath, titleizeLeadValue } from "./leadPageFormatters";

function resolveNotesList(lead) {
  if (Array.isArray(lead.notes) && lead.notes.length) {
    return lead.notes.map((n) => (typeof n === "string" ? n : n?.content || n?.text || "")).filter(Boolean);
  }
  if (lead.latest_note) return [lead.latest_note];
  return [];
}

function resolveLeadNotesText(lead) {
  return resolveNotesList(lead).join(" | ");
}

function resolveLeadNotesCount(lead) {
  if (Array.isArray(lead.notes)) return lead.notes.length;
  if (lead.note_count !== undefined) return Number(lead.note_count || 0);
  return lead.notes ? 1 : 0;
}

export const LEAD_EXPORT_COLUMNS = [
  { key: "contact_person", label: "Contact Person", resolve: (lead) => lead.contact_person || "" },
  { key: "company_name", label: "Company", resolve: (lead) => lead.company_name || "" },
  { key: "email", label: "Email", resolve: (lead) => lead.email || "" },
  { key: "phone", label: "Phone", resolve: (lead) => lead.phone || "" },
  { key: "product", label: "Product", resolve: (lead) => lead.product_name || lead.product_id || "" },
  { key: "status", label: "Status", resolve: (lead) => titleizeLeadValue(lead.status || "new") },
  { key: "priority", label: "Priority", resolve: (lead) => titleizeLeadValue(lead.priority || "medium") },
  { key: "source", label: "Source", resolve: (lead) => titleizeLeadValue(lead.lead_source || "") },
  { key: "assigned_to", label: "Assigned To", resolve: (lead) => lead.assigned_to_name || lead.assigned_to || "" },
  { key: "workflow_stage", label: "Workflow Stage", resolve: (lead) => titleizeLeadValue(lead.workflow_stage || "sales") },
  { key: "estimated_value", label: "Estimated Value", resolve: (lead) => Number(lead.estimated_value || 0) },
  { key: "number_of_units", label: "Number of Units", resolve: (lead) => lead.number_of_units ?? "" },
  { key: "created_at", label: "Created At", resolve: (lead) => formatLeadExportDate(lead.created_at) },
  { key: "follow_up_date", label: "Follow-up Date", resolve: (lead) => formatLeadExportDate(lead.follow_up_date) },
  { key: "created_by", label: "Created By", resolve: (lead) => lead.created_by_name || lead.created_by || "" },
  { key: "latest_note", label: "Latest Note", resolve: (lead) => lead.latest_note || "" },
  { key: "notes_text", label: "All Notes", resolve: (lead) => resolveLeadNotesText(lead) },
  { key: "notes_count", label: "Notes Count", resolve: (lead) => resolveLeadNotesCount(lead) },
  { key: "requirements", label: "Requirements", resolve: (lead) => lead.requirements || "" },
  { key: "industry", label: "Industry", resolve: (lead) => lead.industry || "" },
  { key: "updated_at", label: "Last Updated", resolve: (lead) => formatLeadExportDate(lead.updated_at) },
];

export function formatLeadExportDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
}

export async function fetchLeadExportRows({ token, leadQueryBase, totalMatched = 0 }) {
  if (!token) {
    return [];
  }

  const firstResponse = await apiRequest(
    buildQueryPath("/leads", {
      page: 1,
      page_size: LEAD_EXPORT_PAGE_SIZE,
      full_fetch: 1,
      ...leadQueryBase,
    }),
    { token }
  );

  const firstItems = firstResponse.items || [];
  const totalPages = Math.max(
    Number(firstResponse.meta?.total_pages || Math.ceil(Number(firstResponse.meta?.total || totalMatched || firstItems.length) / LEAD_EXPORT_PAGE_SIZE) || 1),
    1
  );

  if (totalPages === 1) {
    return firstItems;
  }

  const pendingPages = [];

  for (let page = 2; page <= totalPages; page += 1) {
    pendingPages.push(
      apiRequest(
        buildQueryPath("/leads", {
          page,
          page_size: LEAD_EXPORT_PAGE_SIZE,
          full_fetch: 1,
          ...leadQueryBase,
        }),
        { token }
      )
    );
  }

  const responses = await Promise.all(pendingPages);
  return firstItems.concat(...responses.map((response) => response.items || []));
}

export function mapLeadExportRows(leads = []) {
  return leads.map((lead) =>
    LEAD_EXPORT_COLUMNS.reduce((row, column) => {
      row[column.label] = column.resolve(lead);
      return row;
    }, {})
  );
}

export function buildLeadExportFilename(extension = "csv", prefix = "greencrm-leads") {
  const now = new Date();
  const dateStamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  const timeStamp = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");

  return `${prefix}-${dateStamp}-${timeStamp}.${extension}`;
}

export function downloadLeadHtml(leads = [], filename = buildLeadExportFilename("html")) {
  const html = buildLeadHtmlReport(leads);
  downloadBlob(filename, new Blob([html], { type: "text/html;charset=utf-8;" }));
}

export function downloadLeadCsv(leads = [], filename = buildLeadExportFilename("csv")) {
  function escapeCsv(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }
  const header = LEAD_EXPORT_COLUMNS.map((column) => escapeCsv(column.label)).join(",");
  const rows = leads
    .map((lead) =>
      LEAD_EXPORT_COLUMNS.map((column) => escapeCsv(column.resolve(lead))).join(",")
    )
    .join("\n");
  downloadBlob(filename, new Blob([`\uFEFF${header}\n${rows}`], { type: "text/csv;charset=utf-8;" }));
}

export function downloadLeadExcel(leads = [], filename = buildLeadExportFilename("html")) {
  const html = buildLeadHtmlReport(leads);
  downloadBlob(filename, new Blob([html], { type: "text/html;charset=utf-8;" }));
}

export function downloadLeadHtmlSheet(leads = [], filename = buildLeadExportFilename("html")) {
  const html = buildLeadHtmlSheet(leads);
  downloadBlob(filename, new Blob([html], { type: "text/html;charset=utf-8;" }));
}

const MAX_NOTE_COLS = 5;

const STATUS_COLORS = {
  "new": { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" },
  "contacted": { bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" },
  "qualified": { bg: "#ede9fe", text: "#5b21b6", border: "#c4b5fd" },
  "proposal": { bg: "#fce7f3", text: "#9d174d", border: "#f9a8d4" },
  "negotiation": { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  "booked-demo": { bg: "#ede9fe", text: "#4c1d95", border: "#a78bfa" },
  "demo-done": { bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" },
  "trial-started": { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  "closed-won": { bg: "#dcfce7", text: "#166534", border: "#86efac" },
  "closed-lost": { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
};

const PRIORITY_COLORS = {
  "low": { bg: "#f0fdf4", text: "#166534", border: "#86efac" },
  "medium": { bg: "#fef9c3", text: "#854d0e", border: "#fde047" },
  "high": { bg: "#fff7ed", text: "#9a3412", border: "#fdba74" },
  "urgent": { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
};

function getBadgeStyle(colorMap, key) {
  const c = colorMap[String(key || "").toLowerCase()] || { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" };
  return `background:${c.bg};color:${c.text};border:1px solid ${c.border};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;display:inline-block;white-space:nowrap;`;
}

function buildLeadHtmlReport(leads = []) {
  const now = new Date();
  const generatedAt = now.toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" });
  const totalValue = leads.reduce((sum, l) => sum + Number(l.estimated_value || 0), 0);
  const wonCount = leads.filter((l) => l.status === "closed-won").length;
  const lostCount = leads.filter((l) => l.status === "closed-lost").length;
  const activeCount = leads.filter((l) => l.status !== "closed-won" && l.status !== "closed-lost").length;

  const statCards = [
    { label: "Total Leads", value: leads.length, color: "#2563eb" },
    { label: "Active", value: activeCount, color: "#0891b2" },
    { label: "Closed Won", value: wonCount, color: "#16a34a" },
    { label: "Closed Lost", value: lostCount, color: "#dc2626" },
    { label: "Total Value", value: `INR ${totalValue.toLocaleString("en-IN")}`, color: "#7c3aed" },
  ]
    .map((s) => `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px 22px;min-width:140px;flex:1;"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#9ca3af;margin-bottom:8px;">${escapeHtml(s.label)}</div><div style="font-size:26px;font-weight:800;color:${s.color};">${escapeHtml(String(s.value))}</div></div>`)
    .join("");

  const headerCells = [
    "#", "Contact Person", "Company", "Email", "Phone",
    "Product", "Status", "Priority", "Source", "Assigned To",
    "Workflow Stage", "Estimated Value", "Units", "Created At",
    "Follow-up Date", "Created By", "Latest Note", "All Notes", "Notes Count",
    "Requirements", "Industry", "Last Updated",
  ].map((h) => `<th style="background:#1e293b;color:#f8fafc;padding:11px 14px;text-align:left;font-size:12px;font-weight:700;white-space:nowrap;border:1px solid #334155;">${escapeHtml(h)}</th>`).join("");

  const bodyRows = leads.map((lead, idx) => {
    const statusKey = String(lead.status || "new").toLowerCase();
    const priorityKey = String(lead.priority || "medium").toLowerCase();
    const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
    const cells = [
      `<td style="${tdBase}font-weight:700;color:#374151;">${idx + 1}</td>`,
      `<td style="${tdBase}font-weight:600;color:#111827;">${escapeHtml(lead.contact_person || "")}</td>`,
      `<td style="${tdBase}font-weight:600;color:#111827;">${escapeHtml(lead.company_name || "")}</td>`,
      `<td style="${tdBase}color:#2563eb;">${escapeHtml(lead.email || "")}</td>`,
      `<td style="${tdBase}">${escapeHtml(lead.phone || "")}</td>`,
      `<td style="${tdBase}">${escapeHtml(lead.product_name || lead.product_id || "")}</td>`,
      `<td style="${tdBase}"><span style="${getBadgeStyle(STATUS_COLORS, statusKey)}">${escapeHtml(titleizeLeadValue(lead.status || "new"))}</span></td>`,
      `<td style="${tdBase}"><span style="${getBadgeStyle(PRIORITY_COLORS, priorityKey)}">${escapeHtml(titleizeLeadValue(lead.priority || "medium"))}</span></td>`,
      `<td style="${tdBase}">${escapeHtml(titleizeLeadValue(lead.lead_source || ""))}</td>`,
      `<td style="${tdBase}">${escapeHtml(lead.assigned_to_name || lead.assigned_to || "")}</td>`,
      `<td style="${tdBase}">${escapeHtml(titleizeLeadValue(lead.workflow_stage || "sales"))}</td>`,
      `<td style="${tdBase}font-weight:700;color:#16a34a;">INR ${Number(lead.estimated_value || 0).toLocaleString("en-IN")}</td>`,
      `<td style="${tdBase}">${escapeHtml(String(lead.number_of_units ?? ""))}</td>`,
      `<td style="${tdBase}color:#6b7280;">${escapeHtml(formatLeadExportDate(lead.created_at))}</td>`,
      `<td style="${tdBase}color:#6b7280;">${escapeHtml(formatLeadExportDate(lead.follow_up_date))}</td>`,
      `<td style="${tdBase}">${escapeHtml(lead.created_by_name || lead.created_by || "")}</td>`,
      `<td style="${tdBase}max-width:220px;">${escapeHtml(lead.latest_note || "")}</td>`,
      `<td style="${tdBase}max-width:280px;color:#4b5563;">${escapeHtml(resolveLeadNotesText(lead))}</td>`,
      `<td style="${tdBase}text-align:center;font-weight:700;color:#7c3aed;">${resolveLeadNotesCount(lead)}</td>`,
      `<td style="${tdBase}max-width:220px;">${escapeHtml(lead.requirements || "")}</td>`,
      `<td style="${tdBase}">${escapeHtml(lead.industry || "")}</td>`,
      `<td style="${tdBase}color:#6b7280;">${escapeHtml(formatLeadExportDate(lead.updated_at))}</td>`,
    ].join("");
    return `<tr style="background:${rowBg};">${cells}</tr>`;
  }).join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>GreenCRM — Lead Export</title><style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;color:#1e293b;}.page{max-width:100%;padding:32px 28px;}.header{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px;}.brand{font-size:22px;font-weight:800;color:#166534;letter-spacing:-.02em;}.brand span{color:#1e293b;}.meta{font-size:12px;color:#64748b;text-align:right;}.stats{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:28px;}.table-wrap{overflow-x:auto;border-radius:14px;box-shadow:0 4px 24px rgba(0,0,0,.08);border:1px solid #e2e8f0;}table{width:100%;border-collapse:collapse;font-size:13px;}tr:hover td{background:#eff6ff!important;}.footer{margin-top:24px;text-align:center;font-size:11px;color:#94a3b8;}@media print{body{background:#fff;}.page{padding:16px;}}</style></head><body><div class="page"><div class="header"><div><div class="brand">Green<span>CRM</span></div><div style="font-size:13px;color:#64748b;margin-top:4px;">Lead Export Report</div></div><div class="meta"><div>Generated: ${escapeHtml(generatedAt)}</div><div style="margin-top:4px;">${leads.length} lead${leads.length !== 1 ? "s" : ""} exported</div></div></div><div class="stats">${statCards}</div><div class="table-wrap"><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></div><div class="footer">GreenCRM &mdash; Exported on ${escapeHtml(generatedAt)}</div></div></body></html>`;
}

function buildLeadHtmlSheet(leads = []) {
  const now = new Date();
  const generatedAt = now.toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" });

  // Determine max notes columns needed (capped at MAX_NOTE_COLS)
  const maxNotes = Math.min(
    leads.reduce((max, lead) => Math.max(max, resolveNotesList(lead).length), 0),
    MAX_NOTE_COLS
  );

  const baseHeaders = [
    "#", "Contact Person", "Company", "Email", "Phone",
    "Product", "Status", "Priority", "Source", "Assigned To",
    "Workflow Stage", "Est. Value (INR)", "Units",
    "Created At", "Follow-up Date", "Created By", "Requirements", "Last Updated",
  ];
  const noteHeaders = Array.from({ length: maxNotes }, (_, i) => `Note ${i + 1}`);
  const allHeaders = [...baseHeaders, ...noteHeaders];

  const thStyle = `background:#0f172a;color:#f8fafc;padding:10px 13px;text-align:left;font-size:11px;font-weight:700;white-space:nowrap;border:1px solid #1e293b;letter-spacing:.04em;`;
  const headerRow = allHeaders.map((h) => `<th style="${thStyle}">${escapeHtml(h)}</th>`).join("");

  const bodyRows = leads.map((lead, idx) => {
    const statusKey = String(lead.status || "new").toLowerCase();
    const priorityKey = String(lead.priority || "medium").toLowerCase();
    const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
    const notes = resolveNotesList(lead);

    const baseCells = [
      `<td style="${tdBase}font-weight:700;color:#64748b;">${idx + 1}</td>`,
      `<td style="${tdBase}font-weight:700;color:#0f172a;">${escapeHtml(lead.contact_person || "")}</td>`,
      `<td style="${tdBase}font-weight:600;color:#1e293b;">${escapeHtml(lead.company_name || "")}</td>`,
      `<td style="${tdBase}color:#2563eb;">${escapeHtml(lead.email || "")}</td>`,
      `<td style="${tdBase}">${escapeHtml(lead.phone || "")}</td>`,
      `<td style="${tdBase}">${escapeHtml(lead.product_name || lead.product_id || "")}</td>`,
      `<td style="${tdBase}"><span style="${getBadgeStyle(STATUS_COLORS, statusKey)}">${escapeHtml(titleizeLeadValue(lead.status || "new"))}</span></td>`,
      `<td style="${tdBase}"><span style="${getBadgeStyle(PRIORITY_COLORS, priorityKey)}">${escapeHtml(titleizeLeadValue(lead.priority || "medium"))}</span></td>`,
      `<td style="${tdBase}">${escapeHtml(titleizeLeadValue(lead.lead_source || ""))}</td>`,
      `<td style="${tdBase}">${escapeHtml(lead.assigned_to_name || lead.assigned_to || "")}</td>`,
      `<td style="${tdBase}">${escapeHtml(titleizeLeadValue(lead.workflow_stage || "sales"))}</td>`,
      `<td style="${tdBase}font-weight:700;color:#16a34a;">${Number(lead.estimated_value || 0).toLocaleString("en-IN")}</td>`,
      `<td style="${tdBase}text-align:center;">${escapeHtml(String(lead.number_of_units ?? ""))}</td>`,
      `<td style="${tdBase}color:#64748b;font-size:11px;">${escapeHtml(formatLeadExportDate(lead.created_at))}</td>`,
      `<td style="${tdBase}color:#64748b;font-size:11px;">${escapeHtml(formatLeadExportDate(lead.follow_up_date))}</td>`,
      `<td style="${tdBase}">${escapeHtml(lead.created_by_name || lead.created_by || "")}</td>`,
      `<td style="${tdBase}max-width:200px;">${escapeHtml(lead.requirements || "")}</td>`,
      `<td style="${tdBase}color:#64748b;font-size:11px;">${escapeHtml(formatLeadExportDate(lead.updated_at))}</td>`,
    ];

    const noteCells = Array.from({ length: maxNotes }, (_, i) => {
      const text = notes[i] || "";
      const noteStyle = text
        ? `${tdBase}max-width:260px;background:#fefce8;border-left:3px solid #fbbf24;color:#1e293b;font-size:12px;line-height:1.5;`
        : `${tdBase}color:#cbd5e1;`;
      return `<td style="${noteStyle}">${escapeHtml(text)}</td>`;
    });

    return `<tr style="background:${rowBg};">${[...baseCells, ...noteCells].join("")}</tr>`;
  }).join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>GreenCRM — Lead Sheet</title><style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;color:#1e293b;}.wrap{padding:24px 20px;}.table-wrap{overflow-x:auto;border-radius:12px;box-shadow:0 2px 16px rgba(0,0,0,.07);border:1px solid #e2e8f0;}table{width:100%;border-collapse:collapse;font-size:12px;}tr:hover td{background:#eff6ff!important;}.foot{margin-top:16px;text-align:right;font-size:10px;color:#94a3b8;}@media print{body{background:#fff;}.wrap{padding:8px;}}</style></head><body><div class="wrap"><div class="table-wrap"><table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table></div><div class="foot">GreenCRM &mdash; ${escapeHtml(generatedAt)} &mdash; ${leads.length} leads</div></div></body></html>`;
}

const tdBase = "padding:10px 14px;border:1px solid #e2e8f0;vertical-align:top;font-size:12px;word-break:break-word;";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function downloadBlob(filename, blob) {
  if (typeof window === "undefined") {
    return;
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
