"use client";

import { useState } from "react";
import { downloadWithAuth, monthStart, shiftDate, todayIst } from "./trackingClient";

const INPUT = "w-full min-w-0 rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-50";

// path(from, to) returns the API path; fileName is used if the server name is not readable.
export default function ExportPanel({ token, title, subtitle, path, fileName }) {
  const today = todayIst();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const presets = [
    ["Today", today, today],
    ["7 days", shiftDate(today, -6), today],
    ["This month", monthStart(today), today],
  ];

  async function download() {
    setError("");
    if (to < from) return setError("End date must be after the start date.");
    const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
    if (days > 31) return setError("Choose up to 31 days.");
    setBusy(true);
    try {
      await downloadWithAuth(path(from, to), token, `${fileName}-${from}-to-${to}.xlsx`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-slate-900">{title}</p>
          {subtitle ? <p className="text-[12px] text-slate-500">{subtitle}</p> : null}
        </div>
        <div className="flex gap-0.5 rounded-[10px] bg-slate-100 p-0.5">
          {presets.map(([label, f, t]) => (
            <button key={label} type="button" onClick={() => { setFrom(f); setTo(t); }} aria-pressed={from === f && to === t}
              className={`rounded-[8px] px-2.5 py-1 text-[12px] font-semibold transition ${from === f && to === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-[12px] font-semibold text-slate-600">From<input type="date" className={INPUT} value={from} max={today} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="grid gap-1 text-[12px] font-semibold text-slate-600">To<input type="date" className={INPUT} value={to} max={today} onChange={(e) => setTo(e.target.value)} /></label>
        <button type="button" onClick={download} disabled={busy}
          className="col-span-2 inline-flex h-[38px] items-center justify-center gap-1.5 rounded-[10px] bg-brand-700 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-60">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" /></svg>
          {busy ? "Preparingâ€¦" : "Download Excel"}
        </button>
      </div>
      {error ? <p className="mt-2 text-[12px] font-medium text-rose-600">{error}</p> : null}
      <p className="mt-2 text-[11.5px] text-slate-400">Up to 31 days in one file.</p>
    </section>
  );
}
