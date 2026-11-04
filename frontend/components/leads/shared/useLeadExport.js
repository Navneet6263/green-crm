"use client";

import { useState } from "react";

import { buildLeadExportFilename, downloadLeadCsv, fetchLeadExportRows } from "./leadExportUtils";

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

      downloadLeadCsv(leads, buildLeadExportFilename("csv"));

      setNotice(`${leads.length} filtered leads exported as CSV.`);
    } catch (requestError) {
      setError(requestError.message || "Could not export the current filtered leads.");
    } finally {
      setExportingFormat("");
    }
  }

  return {
    exportCsv: () => runLeadExport("csv"),
    exportingCsv: exportingFormat === "csv",
  };
}
