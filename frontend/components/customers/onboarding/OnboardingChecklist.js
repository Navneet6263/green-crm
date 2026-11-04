"use client";

import { useState } from "react";
import { apiRequest } from "../../../lib/api";
import { day, daysUntil, onboardingOf } from "../workspace/customerConfig";

/** The onboarding checklist: tick steps, set due dates and owners, add your own steps. */
export default function OnboardingChecklist({ data, token, customerId, users, canEdit, onChanged }) {
  const [adding, setAdding] = useState("");
  const [openStep, setOpenStep] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  if (!data) return <section className="h-[300px] animate-pulse rounded-[14px] bg-white ring-1 ring-slate-200" />;

  const { steps, summary } = data;
  const state = onboardingOf(data.status);
  const call = async (key, path, method, body) => {
    setBusy(key);
    setError("");
    try { onChanged(await apiRequest(`/customers/${encodeURIComponent(customerId)}/onboarding${path}`, { method, token, body })); } catch (err) { setError(err.message || "Could not save."); } finally { setBusy(""); }
  };
  const patch = (step, body) => call(step.id, `/steps/${step.id}`, "PATCH", body);

  return (
    <section className="rounded-[14px] bg-white ring-1 ring-slate-200">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="relative grid h-12 w-12 place-items-center" aria-hidden="true">
            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" fill="none" stroke="#eef2f1" strokeWidth="4" /><circle cx="18" cy="18" r="15.5" fill="none" stroke={summary.percent === 100 ? "#059669" : "#8a55e6"} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(summary.percent / 100) * 97.4} 97.4`} /></svg>
            <span className="absolute text-[11px] font-bold text-slate-800">{summary.percent}%</span>
          </span>
          <div>
            <h2 className="text-[14.5px] font-bold text-slate-900">Onboarding <span className={`ml-1 rounded-full px-2 py-0.5 align-middle text-[11px] font-semibold ${state.tone}`}>{state.label}</span></h2>
            <p className="text-[12px] text-slate-500">{summary.done} of {summary.total} steps done{summary.overdue ? <b className="ml-1 font-semibold text-rose-700">· {summary.overdue} overdue</b> : null}{data.started_at ? ` · started ${day(data.started_at)}` : ""}</p>
          </div>
        </div>
        {summary.next ? <p className="rounded-[10px] bg-violet-50 px-3 py-1.5 text-[12px] text-violet-900 ring-1 ring-violet-100">Next: <b>{summary.next.title}</b>{summary.next.due_date ? ` · ${day(summary.next.due_date, { day: "numeric", month: "short" })}` : ""}</p> : <p className="rounded-[10px] bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-800">All steps done 🎉</p>}
      </header>
      <ol className="divide-y divide-slate-100">
        {steps.map((s, i) => {
          const d = daysUntil(s.due_date);
          const late = !s.is_done && d !== null && d < 0;
          const open = openStep === s.id;
          return (
            <li key={s.id} className={`px-4 py-2.5 ${s.is_done ? "bg-slate-50/50" : ""}`}>
              <div className="flex items-center gap-3">
                <button type="button" disabled={!canEdit || busy === s.id} onClick={() => patch(s, { is_done: !s.is_done })} aria-pressed={s.is_done} aria-label={`${s.is_done ? "Undo" : "Mark done"}: ${s.title}`}
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ring-2 transition ${s.is_done ? "bg-emerald-500 text-white ring-emerald-500" : late ? "ring-rose-300 hover:bg-rose-50" : "ring-slate-300 hover:bg-slate-100"}`}>
                  {s.is_done ? <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 5 5 9-10" /></svg> : <span className="text-[10.5px] font-bold text-slate-400">{i + 1}</span>}
                </button>
                <button type="button" onClick={() => setOpenStep(open ? null : s.id)} className="min-w-0 flex-1 text-left">
                  <span className={`block truncate text-[13.5px] font-semibold ${s.is_done ? "text-slate-400 line-through" : "text-slate-900"}`}>{s.title}{s.is_custom ? <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-500 no-underline">Custom</span> : null}</span>
                  <span className="block truncate text-[11.5px] text-slate-500">
                    {s.is_done ? `Done ${day(s.done_at, { day: "numeric", month: "short" })}${s.done_by_name ? ` by ${s.done_by_name}` : ""}` : s.due_date ? <span className={late ? "font-semibold text-rose-700" : ""}>{late ? `${-d} days late` : d === 0 ? "Due today" : `Due ${day(s.due_date, { day: "numeric", month: "short" })}`}</span> : "No due date"}
                    {!s.is_done && s.owner_name ? ` · ${s.owner_name}` : ""}{s.note ? ` · ${s.note}` : ""}
                  </span>
                </button>
              </div>
              {open && canEdit ? (
                <div className="ml-9 mt-2 grid gap-2 rounded-[10px] bg-slate-50 p-2.5 ring-1 ring-slate-100 sm:grid-cols-[1fr_1fr_auto]">
                  <input type="date" aria-label="Due date" defaultValue={s.due_date ? String(s.due_date).slice(0, 10) : ""} onChange={(e) => patch(s, { due_date: e.target.value || null })} className="h-9 rounded-[8px] border border-slate-200 bg-white px-2 text-[12.5px]" />
                  <select aria-label="Owner" defaultValue={s.owner_id || ""} onChange={(e) => patch(s, { owner_id: e.target.value || null })} className="h-9 rounded-[8px] border border-slate-200 bg-white px-2 text-[12.5px]">
                    <option value="">No owner</option>
                    {users.map((u) => <option key={u.user_id} value={u.user_id}>{u.name}</option>)}
                  </select>
                  <button type="button" onClick={() => window.confirm(`Remove "${s.title}"?`) && call(s.id, `/steps/${s.id}`, "DELETE")} className="h-9 rounded-[8px] px-3 text-[12px] font-semibold text-rose-600 hover:bg-rose-50">Remove</button>
                  <input aria-label="Note" defaultValue={s.note || ""} placeholder="Add a note and press Enter" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); patch(s, { note: e.currentTarget.value }); } }} className="h-9 rounded-[8px] border border-slate-200 bg-white px-2.5 text-[12.5px] sm:col-span-3" />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      {canEdit ? (
        <form className="flex gap-2 border-t border-slate-100 p-3" onSubmit={(e) => { e.preventDefault(); if (adding.trim()) call("add", "/steps", "POST", { title: adding.trim() }).then(() => setAdding("")); }}>
          <input value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="Add your own step, e.g. “Install app on 20 phones”" maxLength={160} aria-label="New step"
            className="h-9 min-w-0 flex-1 rounded-[10px] border border-slate-200 bg-slate-50 px-3 text-[13px] outline-none focus:border-brand-300 focus:bg-white" />
          <button type="submit" disabled={!adding.trim() || busy === "add"} className="rounded-[10px] bg-slate-900 px-3 text-[12.5px] font-semibold text-white disabled:opacity-40">Add step</button>
        </form>
      ) : null}
      {error ? <p role="alert" className="px-4 pb-3 text-[12.5px] text-rose-700">{error}</p> : null}
    </section>
  );
}
