"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { apiRequest } from "../../lib/api";

const DELETE_REASONS = ["Duplicate lead", "Wrong or fake number", "Test lead", "Not a real enquiry", "Customer asked to be removed"];
const RESTORE_REASONS = ["Deleted by mistake", "Customer came back", "Not a duplicate after all"];

/**
 * Confirm delete (or restore) of one lead, with a reason that goes into its history.
 * mode: "delete" | "restore"
 */
export default function DeleteLeadDialog({ open, mode = "delete", lead, token, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const restoring = mode === "restore";
  useEffect(() => { if (open) { setReason(""); setError(""); } }, [open, lead?.lead_id]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);
  if (!open || !lead) return null;

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const id = encodeURIComponent(lead.lead_id);
      await apiRequest(restoring ? `/leads/${id}/restore` : `/leads/${id}`, { method: restoring ? "POST" : "DELETE", token, body: { change_note: reason.trim() } });
      onDone?.();
      onClose();
    } catch (err) {
      setError(err.message || (restoring ? "The lead could not be restored." : "The lead could not be deleted."));
    } finally {
      setBusy(false);
    }
  }

  const name = lead.company_name || lead.contact_person || lead.lead_id;
  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={() => !busy && onClose()}>
      <div role="dialog" aria-label={restoring ? "Restore lead" : "Delete lead"} onClick={(e) => e.stopPropagation()} className="tw-buttons w-full max-w-[460px] overflow-hidden rounded-t-[18px] bg-white shadow-2xl sm:rounded-[18px]">
        <div className="flex items-start gap-3 px-5 pt-5">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${restoring ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`} aria-hidden="true">
            {restoring
              ? <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /></svg>
              : <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></svg>}
          </span>
          <div className="min-w-0">
            <h2 className="text-[16px] font-bold text-slate-900">{restoring ? "Restore this lead?" : "Delete this lead?"}</h2>
            <p className="mt-0.5 text-[13px] text-slate-500"><b className="font-semibold text-slate-700">{name}</b>{restoring ? " goes back into the lead lists with its full history." : " disappears from the lists for everyone. An admin or manager can restore it from Deleted leads."}</p>
          </div>
        </div>
        <div className="space-y-2 px-5 py-4">
          <p className="text-[12px] font-semibold text-slate-600">Why? <span className="font-normal text-slate-400">(saved in the lead history)</span></p>
          <div className="flex flex-wrap gap-1.5">
            {(restoring ? RESTORE_REASONS : DELETE_REASONS).map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)} aria-pressed={reason === r}
                className={`rounded-full px-3 py-1 text-[12px] font-semibold ${reason === r ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{r}</button>
            ))}
          </div>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} placeholder="Or write the reason" aria-label="Reason"
            className="w-full rounded-[10px] border border-slate-200 px-3 py-2 text-[13.5px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50" />
          {error ? <p role="alert" className="text-[12.5px] text-rose-700">{error}</p> : null}
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-[10px] px-3 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
          <button type="button" onClick={confirm} disabled={busy || !reason.trim()}
            className={`rounded-[10px] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40 ${restoring ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}>
            {busy ? (restoring ? "Restoring…" : "Deleting…") : restoring ? "Restore lead" : "Delete lead"}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
