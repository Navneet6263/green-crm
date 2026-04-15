"use client";

import { apiRequest } from "../../../lib/api";
import { LEAD_EXPORT_PAGE_SIZE } from "./leadPageConstants";
import { buildQueryPath, titleizeLeadValue } from "./leadPageFormatters";

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
  { key: "created_at", label: "Created At", resolve: (lead) => formatLeadExportDate(lead.created_at) },
  { key: "follow_up_date", label: "Follow-up Date", resolve: (lead) => formatLeadExportDate(lead.follow_up_date) },
  { key: "created_by", label: "Created By", resolve: (lead) => lead.created_by_name || lead.created_by || "" },
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

export function downloadLeadCsv(leads = [], filename = buildLeadExportFilename("csv")) {
  const header = LEAD_EXPORT_COLUMNS.map((column) => escapeCsvValue(column.label)).join(",");
  const rows = leads
    .map((lead) =>
      LEAD_EXPORT_COLUMNS.map((column) => escapeCsvValue(column.resolve(lead))).join(",")
    )
    .join("\n");
  const content = `${header}\n${rows}`;

  downloadBlob(filename, new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8;" }));
}

export function downloadLeadExcel(leads = [], filename = buildLeadExportFilename("xls")) {
  const workbook = buildLeadExcelWorkbook(leads);
  downloadBlob(
    filename,
    new Blob([workbook], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    })
  );
}

function buildLeadExcelWorkbook(leads = []) {
  const bodyRows = leads
    .map((lead) => {
      const cells = LEAD_EXPORT_COLUMNS.map((column) => {
        const value = column.resolve(lead);
        return buildXmlCell(value, typeof value === "number" ? "Number" : "String");
      }).join("");

      return `<Row>${cells}</Row>`;
    })
    .join("");

  return [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:o="urn:schemas-microsoft-com:office:office"',
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    "<Styles>",
    '<Style ss:ID="Header"><Font ss:Bold="1" /><Interior ss:Color="#FBF6EC" ss:Pattern="Solid" /></Style>',
    "</Styles>",
    '<Worksheet ss:Name="Leads">',
    "<Table>",
    `<Row>${LEAD_EXPORT_COLUMNS.map((column) => buildXmlCell(column.label, "String", true)).join("")}</Row>`,
    bodyRows,
    "</Table>",
    "</Worksheet>",
    "</Workbook>",
  ].join("");
}

function buildXmlCell(value, type = "String", isHeader = false) {
  const style = isHeader ? ' ss:StyleID="Header"' : "";
  return `<Cell${style}><Data ss:Type="${type}">${escapeXmlValue(value)}</Data></Cell>`;
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

function escapeXmlValue(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
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
