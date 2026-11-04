"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../../../lib/api";
import { LEAD_STATUS_ORDER, getLeadStatusLabel } from "../../../lib/leadStatus";

const ACTIONS = {
  status: { label: "Change status", verb: "Update" },
  priority: { label: "Change priority", verb: "Update" },
  followUp: { label: "Set follow-up", verb: "Update" },
  delete: { label: "Delete", verb: "Delete" },
};
const BLOCKED = ["booked-demo", "onboarded"];
const FIELD = "h-10 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-[13.5px] text-slate-900 outline-none focus:border-brand-400";
const BAR_BTN = "h-8 rounded-[8px] px-2.5 text-[12.5px] font-semibold text-white transition hover:bg-white/15";

function BulkDialog({ action, count, ids, statuses, token, onClose, onDone }) {
  const [value, setValue] = useState(action === "priority" ? "high" : action === "status" ? statuses[0] : "");
  const [time, setTime] = useState("10:00");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState(null);
  const isDelete = action === "delete";

  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape" && !saving) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function submit(event) {
    event.preventDefault();
    if (!note.trim()) { setError("Write a short note. It is saved in each lead's history."); return; }
    if (action === "followUp" && !value) { setError("Choose a date."); return; }
    setSaving(true);
    setError("");
    try {
      const body = { lead_ids: ids, change_note: note.trim() };
      if (isDelete) body.action = "delete";
      if (action === "status") body.status = value;
      if (action === "priority") body.priority = value;
      // The date and time are entered in India time.
      if (action === "followUp") body.follow_up_date = new Date(`${value}T${time || "10:00"}:00+05:30`).toISOString();
      const result = await apiRequest("/leads/bulk-update", { method: "POST", token, body });
      if (result.failed?.length) {
        setFailed(result);
        onDone(result, false);
      } else {
        onDone(result, true);
      }
    } catch (err) {
      setError(err.message || "The leads could not be changed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[2px]" onClick={() => !saving && onClose()} />
      <div role="dialog" aria-label={ACTIONS[action].label} className="tw-buttons fixed inset-x-3 top-[12vh] z-[60] mx-auto max-w-[440px] overflow-hidden rounded-[16px] bg-white shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] ring-1 ring-slate-200">
        <form onSubmit={submit}>
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-[16px] font-bold text-slate-900">{ACTIONS[action].label}</h2>
            <p className="text-[13px] text-slate-500">{count} selected lead{count === 1 ? "" : "s"}</p>
          </div>
          {failed ? (
            <div className="space-y-2 px-5 py-4">
              <p className="text-[14px] font-semibold text-slate-900">{failed.done} done, {failed.failed.length} could not be changed</p>
              <ul className="max-h-48 space-y-1 overflow-y-auto text-[12.5px] text-rose-700">
                {failed.failed.slice(0, 30).map((row) => <li key={row.lead_id}><b>{row.lead_id}</b>: {row.error}</li>)}
              </ul>
            </div>
          ) : (
            <div className="space-y-3 px-5 py-4">
              {action === "status" ? (
                <label className="block text-[12px] font-semibold text-slate-600">New status
                  <select value={value} onChange={(e) => setValue(e.target.value)} className={`${FIELD} mt-1`}>
                    {statuses.map((s) => <option key={s} value={s}>{getLeadStatusLabel(s)}</option>)}
                  </select>
                  <span className="mt-1 block font-normal text-slate-400">Booked Demo and Onboarded need details, so change those one lead at a time.</span>
                </label>
              ) : null}
              {action === "priority" ? (
                <label className="block text-[12px] font-semibold text-slate-600">New priority
                  <select value={value} onChange={(e) => setValue(e.target.value)} className={`${FIELD} mt-1`}>
                    {["low", "medium", "high"].map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </label>
              ) : null}
              {action === "followUp" ? (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-[12px] font-semibold text-slate-600">Date
                    <input type="date" value={value} onChange={(e) => setValue(e.target.value)} className={`${FIELD} mt-1`} />
                  </label>
                  <label className="block text-[12px] font-semibold text-slate-600">Time
                    <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${FIELD} mt-1`} />
                  </label>
                </div>
              ) : null}
              {isDelete ? <p className="rounded-[10px] bg-rose-50 px-3 py-2 text-[13px] text-rose-800 ring-1 ring-rose-200">These leads will disappear from the lists for everyone. Only do this if you are sure.</p> : null}
              <label className="block text-[12px] font-semibold text-slate-600">Note (saved in each lead's history)
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} autoFocus placeholder={isDelete ? "Why are these being deleted?" : "Why is this changing?"}
                  className="mt-1 w-full resize-y rounded-[10px] border border-slate-200 px-3 py-2 text-[13.5px] text-slate-900 outline-none focus:border-brand-400" />
              </label>
              {error ? <p role="alert" className="rounded-[10px] bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</p> : null}
            </div>
          )}
          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-[10px] px-4 py-2 text-[13.5px] font-semibold text-slate-600 hover:bg-slate-100">{failed ? "Close" : "Cancel"}</button>
            {!failed ? (
              <button type="submit" disabled={saving} className={`rounded-[10px] px-5 py-2 text-[13.5px] font-semibold text-white shadow-sm disabled:opacity-60 ${isDelete ? "bg-rose-600 hover:bg-rose-700" : "bg-brand-700 hover:bg-brand-800"}`}>
                {saving ? "Working…" : `${ACTIONS[action].verb} ${count} lead${count === 1 ? "" : "s"}`}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </>
  );
}

/** Floating bar for selected leads. Assign keeps its existing card, which checks the team. */
export default function LeadBulkBar({ picked, total, allFilteredPicked, selectingAll, onSelectAll, onClear, onAssign, assignOpen, enabledStatuses, token, onDone }) {
  const [action, setAction] = useState("");
  const count = picked.length;
  if (!count) return null;
  const statuses = (enabledStatuses.length ? enabledStatuses : LEAD_STATUS_ORDER).filter((s) => !BLOCKED.includes(s));
  const canSelectMore = !allFilteredPicked && total > count;

  return (
    <>
      <div className="tw-buttons fixed inset-x-3 bottom-4 z-30 mx-auto flex w-fit max-w-[calc(100vw-24px)] flex-wrap items-center gap-1 rounded-[14px] bg-slate-900 px-3 py-2 text-white shadow-[0_18px_50px_-12px_rgba(15,23,42,0.6)]">
        <span className="px-1.5 text-[13px] font-bold">{count.toLocaleString("en-IN")} selected</span>
        {canSelectMore ? (
          <button type="button" disabled={selectingAll} onClick={onSelectAll} className="rounded-[8px] px-2 py-1 text-[12.5px] font-semibold text-gold-300 hover:bg-white/10 disabled:opacity-60">
            {selectingAll ? "Selecting…" : `Select all ${total.toLocaleString("en-IN")}`}
          </button>
        ) : null}
        <span className="mx-1 h-5 w-px bg-white/20" />
        <button type="button" onClick={onAssign} aria-pressed={assignOpen} className={`${BAR_BTN} ${assignOpen ? "bg-white/15" : ""}`}>Assign</button>
        <button type="button" onClick={() => setAction("status")} className={BAR_BTN}>Status</button>
        <button type="button" onClick={() => setAction("priority")} className={BAR_BTN}>Priority</button>
        <button type="button" onClick={() => setAction("followUp")} className={BAR_BTN}>Follow-up</button>
        <button type="button" onClick={() => setAction("delete")} className={`${BAR_BTN} text-rose-300`}>Delete</button>
        <span className="mx-1 h-5 w-px bg-white/20" />
        <button type="button" onClick={onClear} aria-label="Clear selection" className="grid h-8 w-8 place-items-center rounded-[8px] text-white/70 hover:bg-white/15 hover:text-white">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </div>
      {action ? (
        <BulkDialog action={action} count={count} ids={picked} statuses={statuses} token={token} onClose={() => setAction("")}
          onDone={(result, close) => { if (close) setAction(""); onDone(result, action); }} />
      ) : null}
    </>
  );
}
