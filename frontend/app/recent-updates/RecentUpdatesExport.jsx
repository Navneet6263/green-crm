"use client";

import { useState } from "react";
import { recentActivityApi } from "../../lib/api/recentActivity.js";

export default function RecentUpdatesExport({
  session,
  typeFilter,
  selectedUsers,
  selectedProducts,
  fromDate,
  toDate,
  search
}) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!session) return;
    setExporting(true);
    try {
      // Fetch up to 10,000 records for the export based on current filters
      const res = await recentActivityApi.getRecentNotes({
        limit: 10000,
        type: typeFilter === "all" ? "all" : `${typeFilter}s`,
        users: selectedUsers,
        products: selectedProducts,
        fromDate,
        toDate,
        search
      });

      const notes = res.items || res.data || res || [];
      
      if (notes.length === 0) {
        alert("No notes found to export.");
        return;
      }

      // Convert to CSV
      const headers = ["Type", "Date", "User", "Role", "Entity Name", "Company Name", "Product", "Note Content"];
      
      const csvRows = [headers.join(",")];
      
      for (const note of notes) {
        const row = [
          note.note_type || "N/A",
          new Date(note.created_at).toLocaleString(),
          `"${(note.created_by_name || "Unknown").replace(/"/g, '""')}"`,
          `"${(note.created_by_role || "N/A").replace(/"/g, '""')}"`,
          `"${(note.entity_name || "N/A").replace(/"/g, '""')}"`,
          `"${(note.entity_company_name || "N/A").replace(/"/g, '""')}"`,
          `"${(note.product_name || "N/A").replace(/"/g, '""')}"`,
          `"${(note.content || "").replace(/"/g, '""').replace(/\n/g, ' ')}"`
        ];
        csvRows.push(row.join(","));
      }

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      link.setAttribute("href", url);
      link.setAttribute("download", `recent_updates_export_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export notes. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm">
      <h3 className="mb-2 text-sm font-bold text-slate-900">Export Report</h3>
      <p className="mb-4 text-xs text-slate-500">Download current filtered notes as a CSV file.</p>
      <button
        onClick={handleExport}
        disabled={exporting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-300 disabled:opacity-50"
      >
        {exporting ? (
          <>
            <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Exporting...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download CSV
          </>
        )}
      </button>
    </div>
  );
}
