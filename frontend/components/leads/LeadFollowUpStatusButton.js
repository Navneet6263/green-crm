"use client";

import { useRef, useState } from "react";
import { apiRequest } from "../../lib/api";

const FIELD = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-50";
const MODES = ["call", "email", "whatsapp", "meeting"];
const CALL_STATUSES = ["Connected", "Not connected", "Busy", "Not reachable", "Switched off", "Wrong number", "Call later"];
const EMAIL_STATUSES = ["Sent", "Opened", "Replied", "Bounced", "No reply", "Wrong email"];
const RESPONSES = ["Interested", "Busy", "Not reachable", "Call later", "Not interested", "Wrong number", "Converted", "No response"];

const MODE_ICON = { call: "📞", email: "✉️", whatsapp: "💬", meeting: "🤝" };

function title(v) {
  return String(v || "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function buildNote({ callStatus, emailStatus, mode, nextDate, nextTime, note, response }) {
  const rows = [
    "Follow-up Status",
    `Mode: ${title(mode)}`,
    mode === "email" ? `Email status: ${emailStatus}` : `Calling status: ${callStatus}`,
    `Customer response: ${response}`,
  ];
  if (nextDate && nextTime) rows.push(`Next follow-up: ${nextDate} ${nextTime}`);
  rows.push("", "Notes:", note.trim());
  return rows.join("\n");
}

export default function LeadFollowUpStatusButton({ className = "", lead, onSaved, token }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("call");
  const [callStatus, setCallStatus] = useState("Connected");
  const [emailStatus, setEmailStatus] = useState("Sent");
  const [response, setResponse] = useState("Interested");
  const [note, setNote] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [nextTime, setNextTime] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const saveLockRef = useRef(false);

  function reset() {
    setNote(""); setNextDate(""); setNextTime(""); setError("");
    setMode("call"); setCallStatus("Connected"); setEmailStatus("Sent"); setResponse("Interested");
  }

  function save() {
    if (!note.trim()) { setError("Follow-up note is required."); return; }
    if ((nextDate && !nextTime) || (!nextDate && nextTime)) { setError("Add both date and time for next follow-up."); return; }
    if (saveLockRef.current) return;
    setSaving(true); setError("");
    const content = buildNote({ callStatus, emailStatus, mode, nextDate, nextTime, note, response });
    const taskPayload = nextDate && nextTime ? {
      assigned_to: lead.assigned_to || undefined,
      company_id: lead.company_id || undefined,
      due_date: `${nextDate} ${nextTime}:00`,
      priority: lead.priority || "medium",
      related_id: lead.lead_id,
      related_to: "lead",
      team_id: lead.team_id || undefined,
      title: `${title(mode)} follow-up`,
      type: mode === "whatsapp" ? "call" : mode,
      notes: content,
    } : null;

    saveLockRef.current = true;
    onSaved?.(lead.lead_id, content);
    setOpen(false); reset();
    setTimeout(() => { saveLockRef.current = false; setSaving(false); }, 500);

    (async () => {
      await apiRequest(`/leads/${lead.lead_id}/notes`, { method: "POST", token, body: { content } });
      if (taskPayload) {
        await apiRequest("/tasks", { method: "POST", token, body: taskPayload });
      }
    })().catch((e) => { setOpen(true); setError(e.message || "Could not save follow-up."); });
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        Follow-up Status
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-100 bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Follow-up Status</h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {lead.company_name || lead.contact_person || "Lead"} — record what happened
                </p>
              </div>
              <button type="button" onClick={() => { setOpen(false); reset(); }}
                className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900">
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M2 2l12 12M14 2L2 14" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Mode selector — visual tabs */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Follow-up Mode</p>
                <div className="flex gap-2">
                  {MODES.map(m => (
                    <button key={m} type="button" onClick={() => setMode(m)}
                      className={`flex flex-1 flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-semibold transition ${
                        mode === m ? "border-amber-300 bg-amber-50 text-amber-900" : "border-slate-200 bg-white text-slate-600 hover:border-amber-200"
                      }`}>
                      <span className="text-base">{MODE_ICON[m]}</span>
                      {title(m)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status + Response */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {mode === "email" ? "Email Status" : "Call Status"}
                  </span>
                  <select className={FIELD} value={mode === "email" ? emailStatus : callStatus}
                    onChange={e => mode === "email" ? setEmailStatus(e.target.value) : setCallStatus(e.target.value)}>
                    {(mode === "email" ? EMAIL_STATUSES : CALL_STATUSES).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Customer Response</span>
                  <select className={FIELD} value={response} onChange={e => setResponse(e.target.value)}>
                    {RESPONSES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
              </div>

              {/* Next follow-up date + time */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Next Follow-up (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <input className={FIELD} type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} />
                  <input className={FIELD} type="time" value={nextTime} onChange={e => setNextTime(e.target.value)} />
                </div>
              </div>

              {/* Notes */}
              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Notes *</span>
                <textarea
                  className={`${FIELD} min-h-[100px] resize-y`}
                  value={note} onChange={e => setNote(e.target.value)}
                  placeholder="What did the customer say? What's the next step?"
                />
              </label>

              {error ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>
              ) : null}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" disabled={saving}
                onClick={() => { setOpen(false); reset(); }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300">
                Cancel
              </button>
              <button type="button" disabled={saving} onClick={save}
                className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900 transition hover:bg-amber-100 disabled:opacity-60">
                {saving ? "Saving…" : "Save Follow-up"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
