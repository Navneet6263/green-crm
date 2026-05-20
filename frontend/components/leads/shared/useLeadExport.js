"use client";

import { useState } from "react";

import {
  buildLeadExportFilename,
  downloadLeadCsv,
  downloadLeadExcel,
  downloadLeadHtmlSheet,
  fetchLeadExportRows,
} from "./leadExportUtils";

export function useLeadExport({ allMatchedLeads, leadQueryBase, setError, setNotice, token, totalMatched }) {
  const [exportingFormat, setExportingFormat] = useState("");

  async function runLeadExport(format) {
    if (!token || !totalMatched) {
      return;
    }

    setExportingFormat(format);
    setError("");
    setNotice("");

    try {
      const leads =
        allMatchedLeads.length === totalMatched
          ? allMatchedLeads
          : await fetchLeadExportRows({ token, leadQueryBase, totalMatched });

      if (format === "csv") {
        downloadLeadCsv(leads, buildLeadExportFilename("csv"));
      } else if (format === "html") {
        downloadLeadHtmlSheet(leads, buildLeadExportFilename("html"));
      } else {
        downloadLeadExcel(leads, buildLeadExportFilename("xls"));
      }

      setNotice(`${leads.length} filtered leads exported as ${format === "csv" ? "CSV" : format === "html" ? "HTML Sheet" : "Excel"}.`);
    } catch (requestError) {
      setError(requestError.message || "Could not export the current filtered leads.");
    } finally {
      setExportingFormat("");
    }
  }

  return {
    exportCsv: () => runLeadExport("csv"),
    exportExcel: () => runLeadExport("excel"),
    exportHtml: () => runLeadExport("html"),
    exportingCsv: exportingFormat === "csv",
    exportingExcel: exportingFormat === "excel",
    exportingHtml: exportingFormat === "html",
  };
}
