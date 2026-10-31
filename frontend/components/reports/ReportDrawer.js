"use client";

import { useEffect } from "react";
import ReportCustomiser from "./ReportCustomiser";

export const DownloadIcon = () => <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" /></svg>;

/** Side panel to set up and download an Excel report. `children` holds report-specific filters. */
export default function ReportDrawer({ open, onClose, title, subtitle, report, onDownload, downloading, error, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="tw-buttons fixed inset-y-0 right-0 z-50 flex w-full max-w-[620px] flex-col bg-[#f7f8f6] shadow-[-24px_0_60px_-30px_rgba(15,23,42,0.45)]" role="dialog" aria-label={title}>
        <div className="flex items-start gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-brand-50 text-brand-700">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-bold text-slate-900">{title}</h2>
            {subtitle ? <p className="text-[12.5px] text-slate-500">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-[8px] text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {children}
          <ReportCustomiser report={report} compact />
        </div>
        <div className="flex items-center gap-3 border-t border-slate-200 bg-white px-5 py-3.5">
          <p className="min-w-0 flex-1 text-[12px] text-slate-500">{error ? <span className="text-rose-600">{error}</span> : "Excel (.xlsx) with filters, frozen headers and totals. Only the ticked columns are included."}</p>
          <button type="button" onClick={onDownload} disabled={downloading || !report.layout}
            className="inline-flex shrink-0 items-center gap-2 rounded-[10px] bg-brand-700 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-brand-800 disabled:opacity-60">
            <DownloadIcon />{downloading ? "Preparing…" : "Download Excel"}
          </button>
        </div>
      </aside>
    </>
  );
}
