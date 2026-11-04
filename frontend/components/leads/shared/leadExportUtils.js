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

// Splits a raw note into { userText, changes[] }
// Note format from backend: "<user text>\n\nChanges:\n<field>: <before> -> <after>\n..."
function parseNoteContent(raw) {
  const text = String(raw || "").trim();
  const changesSplit = text.split(/\n\nChanges:\n/i);
  const userText = changesSplit[0].trim();
  const changes = changesSplit[1]
    ? changesSplit[1].split("\n").map((l) => l.trim()).filter(Boolean)
    : [];
  return { userText, changes };
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
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  // Always India time, whatever the browser's timezone is.
  const shifted = new Date(date.getTime() + 330 * 60000).toISOString();
  return `${shifted.slice(8, 10)}/${shifted.slice(5, 7)}/${shifted.slice(0, 4)} ${shifted.slice(11, 16)}`;
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

export function downloadLeadCsv(leads = [], filename = buildLeadExportFilename("csv")) {
  function esc(value) {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  const maxNotes = Math.min(
    leads.reduce((max, lead) => Math.max(max, resolveNotesList(lead).length), 0),
    MAX_NOTE_COLS
  );
  const noteLabels = Array.from({ length: maxNotes }, (_, i) => `Note ${i + 1}`);

  const baseColumns = LEAD_EXPORT_COLUMNS.filter(
    (c) => c.key !== "latest_note" && c.key !== "notes_text" && c.key !== "notes_count"
  );

  const headerRow = [...baseColumns.map((c) => esc(c.label)), ...noteLabels.map(esc)].join(",");

  const rows = leads.map((lead) => {
    const notes = resolveNotesList(lead);
    const baseCells = baseColumns.map((c) => esc(c.resolve(lead)));
    const noteCells = Array.from({ length: maxNotes }, (_, i) => {
      const raw = notes[i] || "";
      if (!raw) return esc("");
      const { userText, changes } = parseNoteContent(raw);
      const parts = [userText, ...(changes.length ? ["Changes:", ...changes] : [])].filter(Boolean);
      return esc(parts.join("\n"));
    });
    return [...baseCells, ...noteCells].join(",");
  });

  downloadBlob(filename, new Blob([`\uFEFF${headerRow}\n${rows.join("\n")}`], { type: "text/csv;charset=utf-8;" }));
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
