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
      const res = await recentActivityApi.getRecentNotes({
        limit: 10000,
        page: 1,
        type: typeFilter === "all" ? "all" : `${typeFilter}s`,
        users: selectedUsers,
        products: selectedProducts,
        fromDate,
        toDate,
        search
      });

      const rawNotes = res.items || res.data || (Array.isArray(res) ? res : []);
      
      if (!rawNotes || rawNotes.length === 0) {
        alert("No activity notes found to export.");
        return;
      }

      // Robust parser for Excel Export to display full status, response & highlighted note
      const parseNoteContentForExcel = (note) => {
        if (!note) return "";
        const raw = String(note.content || "").trim();
        const userName = note.created_by_name || "User";

        let statusStr = note.entity_status || "";
        let responseStr = "";
        let noteText = raw;

        // Extract "Status changed: <value>"
        const statusMatch = raw.match(/Status changed:\s*(.*?)(?=\s*Customer response:|\s*Note:|\s*Notes:|\s*Next follow-up:|\s*Mode:|$)/i);
        if (statusMatch && statusMatch[1]) {
          statusStr = statusMatch[1].trim();
        }

        // Extract "Customer response: <value>"
        const respMatch = raw.match(/Customer response:\s*(.*?)(?=\s*Note:|\s*Notes:|\s*Next follow-up:|\s*Mode:|$)/i);
        if (respMatch && respMatch[1]) {
          responseStr = respMatch[1].trim();
        }

        // Extract "Mode: <value>"
        const modeMatch = raw.match(/Mode:\s*(.*?)(?=\s*Next follow-up:|\s*Status changed:|\s*Customer response:|\s*Note:|\s*Notes:|$)/i);
        if (modeMatch && modeMatch[1]) {
          const modeVal = modeMatch[1].trim();
          if (modeVal && !responseStr.toLowerCase().includes(modeVal.toLowerCase())) {
            responseStr = responseStr ? `${responseStr} (${modeVal})` : modeVal;
          }
        }

        // Extract "Note: <value>" or "Notes: <value>"
        const noteMatch = raw.match(/(?:Note|Notes|Comment|Remarks|Remark):\s*(.*?)(?=\s*Next follow-up:|\s*Mode:|$)/i);
        if (noteMatch && noteMatch[1]) {
          noteText = noteMatch[1].trim();
        } else if (statusMatch || respMatch) {
          noteText = "";
        }

        // Build clean point-wise HTML lines for Excel cell
        const parts = [];
        if (statusStr) {
          parts.push(`<div style='color:#475569;font-size:9pt;'>• <b>Status:</b> ${statusStr}</div>`);
        }
        if (responseStr) {
          parts.push(`<div style='color:#334155;font-size:9pt;'>• <b>Customer Response:</b> ${responseStr}</div>`);
        }
        if (noteText) {
          parts.push(`<div style='color:#0F172A;font-weight:bold;font-size:9.5pt;margin-top:3px;'>• <b>Note (${userName}):</b> ${noteText}</div>`);
        } else {
          parts.push(`<div style='color:#475569;font-size:9pt;'>• <b>Updated by:</b> ${userName}</div>`);
        }

        return parts.join("");
      };

      const clean = (val) => {
        if (!val || val === "N/A" || val === "null" || val === "undefined") return "";
        return String(val).trim();
      };

      // Status Badge Styling for Excel
      const getStatusStyle = (status) => {
        const s = String(status || "").toLowerCase();
        if (s.includes("won") || s.includes("onboard") || s.includes("approve")) {
          return "background-color:#16A34A;color:#FFFFFF;font-weight:bold;text-align:center;";
        }
        if (s.includes("lost") || s.includes("reject") || s.includes("disapprove")) {
          return "background-color:#DC2626;color:#FFFFFF;font-weight:bold;text-align:center;";
        }
        if (s.includes("new") || s.includes("pending") || s.includes("hold")) {
          return "background-color:#D97706;color:#FFFFFF;font-weight:bold;text-align:center;";
        }
        if (s.includes("demo") || s.includes("trial")) {
          return "background-color:#7C3AED;color:#FFFFFF;font-weight:bold;text-align:center;";
        }
        return "background-color:#2563EB;color:#FFFFFF;font-weight:bold;text-align:center;";
      };

      // Group notes by lead / entity
      const entityMap = {};
      rawNotes.forEach((note) => {
        const key = `${note.note_type}_${note.entity_id || note.customer_id || note.entity_company_name || note.id}`;
        if (!entityMap[key]) {
          entityMap[key] = {
            note_type: note.note_type,
            entity_name: note.entity_name,
            entity_company_name: note.entity_company_name,
            email: note.email,
            phone: note.phone,
            entity_status: note.entity_status,
            legal_approved_by: note.legal_approved_by,
            legal_approved_at: note.legal_approved_at,
            lost_reason: note.lost_reason,
            requirements: note.requirements,
            notes: []
          };
        }
        entityMap[key].notes.push(note);
      });

      const entities = Object.values(entityMap);

      const primaryHeaders = [
        "S.No", "Company", "Email", "Phone", "Date",
        "Domain Check", "Welcome Call", "Approver Name", "Approval Date",
        "Status", "last status feedback", "Reason for Disapprove",
        "DATE - 2nd Connect", "REMARKS"
      ];

      const followupHeaders = [];
      for (let day = 1; day <= 15; day++) {
        followupHeaders.push(`${day} Day Followup`);
        followupHeaders.push(`Remarks (${day} Day)`);
      }

      const rowsHtml = entities.map((entity, idx) => {
        const sortedNotes = [...entity.notes].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const latestNote = sortedNotes[sortedNotes.length - 1];
        const leadDate = latestNote?.created_at ? new Date(latestNote.created_at).toLocaleDateString("en-IN") : "";
        const approvalDate = entity.legal_approved_at ? new Date(entity.legal_approved_at).toLocaleDateString("en-IN") : "";
        
        const isEven = idx % 2 === 1;
        const rowBg = isEven ? "background-color:#F8FAFC;" : "background-color:#FFFFFF;";
        const statusCss = getStatusStyle(entity.entity_status);

        const cells = [
          `<td style='background-color:#F1F5F9;font-weight:bold;text-align:center;color:#334155;'>${idx + 1}</td>`,
          `<td style='font-weight:bold;color:#0F172A;'>${clean(entity.entity_company_name || entity.entity_name)}</td>`,
          `<td>${clean(entity.email)}</td>`,
          `<td style='font-weight:semibold;color:#1E293B;'>${clean(entity.phone)}</td>`,
          `<td style='text-align:center;color:#64748B;'>${clean(leadDate)}</td>`,
          `<td></td>`, // Domain Check
          `<td></td>`, // Welcome Call
          `<td>${clean(entity.legal_approved_by)}</td>`,
          `<td style='text-align:center;'>${clean(approvalDate)}</td>`,
          `<td style='${statusCss}'>${clean(entity.entity_status)}</td>`,
          `<td style='vertical-align:top;'>${parseNoteContentForExcel(latestNote)}</td>`, // FULL UNTRUNCATED STATUS & RESPONSE & NOTE
          `<td style='color:#DC2626;font-weight:semibold;'>${clean(entity.lost_reason)}</td>`, // Reason for Disapprove
          `<td></td>`, // DATE - 2nd Connect
          `<td></td>`  // REMARKS
        ];

        // Fill Day 1 to Day 15 followups sequentially from sorted notes
        for (let day = 1; day <= 15; day++) {
          const noteForDay = sortedNotes[day - 1];
          if (noteForDay) {
            const noteDateStr = new Date(noteForDay.created_at).toLocaleDateString("en-IN");
            cells.push(`<td style='text-align:center;color:#475569;background-color:#F8FAFC;vertical-align:top;'>${clean(noteDateStr)}</td>`);
            cells.push(`<td style='vertical-align:top;'>${parseNoteContentForExcel(noteForDay)}</td>`);
          } else {
            cells.push(`<td></td>`);
            cells.push(`<td></td>`);
          }
        }

        cells.push(`<td style='color:#0F172A;'>${clean(entity.requirements)}</td>`);

        return `<tr style='${rowBg}'>${cells.join("")}</tr>`;
      }).join("\n");

      const headerCells = [
        ...primaryHeaders.map(h => `<th style='background-color:#0F172A;color:#FFFFFF;font-weight:bold;text-align:center;border:1px solid #1E293B;padding:10px 14px;white-space:nowrap;'>${h}</th>`),
        ...followupHeaders.map(h => `<th style='background-color:#1E293B;color:#F8FAFC;font-weight:bold;text-align:center;border:1px solid #334155;padding:10px 14px;white-space:nowrap;'>${h}</th>`),
        `<th style='background-color:#047857;color:#FFFFFF;font-weight:bold;text-align:center;border:1px solid #065F46;padding:10px 14px;white-space:nowrap;'>REQUIREMENT</th>`
      ];

      const tableHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <!--[if gte mso 9]>
          <xml>
           <x:ExcelWorkbook>
            <x:ExcelWorksheets>
             <x:ExcelWorksheet>
              <x:Name>GreenCRM Activity Report</x:Name>
              <x:WorksheetOptions>
               <x:DisplayGridlines/>
              </x:WorksheetOptions>
             </x:ExcelWorksheet>
            </x:ExcelWorksheets>
           </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            table { border-collapse: collapse; width: 100%; font-family: 'Segoe UI', 'Calibri', Arial, sans-serif; font-size: 10pt; }
            th { padding: 10px 14px; font-size: 10.5pt; }
            td { border: 1px solid #CBD5E1; padding: 8px 12px; vertical-align: top; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                ${headerCells.join("\n")}
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob(["\uFEFF" + tableHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      link.setAttribute("href", url);
      link.setAttribute("download", `GreenCRM_Pointwise_Activity_Report_${dateStr}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export Excel. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-extrabold text-slate-900">Smart Excel Export</h3>
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
          Clean Notes
        </span>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        Export Excel sheet with full Status, Customer Response & highlighted notes.
      </p>
      <button
        onClick={handleExport}
        disabled={exporting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-indigo-200 transition-all hover:shadow-lg disabled:opacity-50"
      >
        {exporting ? (
          <>
            <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating Smart Sheet...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Smart Excel (.xls)
          </>
        )}
      </button>
    </div>
  );
}
