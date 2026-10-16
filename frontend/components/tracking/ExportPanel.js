"use client";

import { useState } from "react";
import { downloadWithAuth, monthStart, shiftDate, todayIst } from "./trackingClient";

const INPUT = "rounded-[12px] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50";

// path(from, to) returns the API path; fileName is used if the server name is not readable.
export default function ExportPanel({ token, title, path, fileName }) {
  const today = todayIst();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const presets = [
    ["Today", today, today],
    ["Last 7 days", shiftDate(today, -6), today],
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
    <div className="rounded-[20px] border border-slate-200/70 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <div className="flex flex-wrap gap-1.5">
          {presets.map(([label, f, t]) => (
            <button key={label} type="button" onClick={() => { setFrom(f); setTo(t); }}
              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${from === f && to === t ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-slate-600 ring-slate-200 hover:ring-indigo-300"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-[11px] font-semibold text-slate-500">From<input type="date" className={INPUT} value={from} max={today} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="grid gap-1 text-[11px] font-semibold text-slate-500">To<input type="date" className={INPUT} value={to} max={today} onChange={(e) => setTo(e.target.value)} /></label>
        <button type="button" onClick={download} disabled={busy}
          className="inline-flex items-center gap-2 rounded-[12px] bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60">
          {busy ? "Preparing…" : "⬇ Download Excel"}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
