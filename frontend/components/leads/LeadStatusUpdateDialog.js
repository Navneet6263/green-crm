"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { LEAD_STATUS_ORDER, getLeadStatusLabel } from "../../lib/leadStatus";
import LeadDemoHandoffFields from "./LeadDemoHandoffFields";
import LeadWonFields, { wonDefaults, wonMissing } from "./LeadWonFields";

const RESPONSES = ["Interested", "Busy", "Not reachable", "Call later", "On hold", "Not interested", "Wrong number", "Converted"];
const MODES = [["call", "Call"], ["whatsapp", "WhatsApp"], ["email", "Email"], ["meeting", "Meeting"]];
const INPUT = "w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-[13.5px] text-slate-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50";
const LABEL = "text-[12px] font-semibold text-slate-600";
const tone = (status) => (status === "closed-won" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : status === "closed-lost" ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-sky-50 text-sky-800 ring-sky-200");
const todayIst = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const plusDays = (n) => new Date(Date.now() + 330 * 60000 + n * 86400000).toISOString().slice(0, 10);

function buildStatusNote({ customerResponse, followUp, nextStatus, note, previousStatus }) {
  const lines = [
    `Status changed: ${getLeadStatusLabel(previousStatus)} -> ${getLeadStatusLabel(nextStatus)}`,
    `Customer response: ${customerResponse}`,
    "",
    "Note:",
    note.trim(),
  ];
  if (followUp.required) lines.push("", `Next follow-up: ${followUp.date} ${followUp.time}`, `Mode: ${followUp.mode}`);
  return lines.join("\n");
}

/** Change a lead's status: what the customer said, the note, and the next follow-up (plus demo or won details). */
export default function LeadStatusUpdateDialog({
  assigneeOptions = [], currentStatus, disabled = false, enabledStatuses = [], error = "", lead, nextStatus, onCancel, onSave, saving = false, setNextStatus,
}) {
  const [mounted, setMounted] = useState(false);
  const isDemoStatus = nextStatus === "booked-demo";
  const isOnboardedStatus = nextStatus === "onboarded";
  const isWonStatus = nextStatus === "closed-won";
  const [won, setWon] = useState(() => wonDefaults(lead));
  const [customerResponse, setCustomerResponse] = useState("Interested");
  const [note, setNote] = useState("");
  const [onboardedDate, setOnboardedDate] = useState("");
  const [demo, setDemo] = useState({ assignee: "", date: "", note: "", requirement: "", time: "" });
  const [followUp, setFollowUp] = useState({ assignee: lead?.assigned_to || "", date: "", mode: "call", required: false, time: "" });
  const statusOptions = enabledStatuses.length > 0 ? enabledStatuses : LEAD_STATUS_ORDER;

  const notePayload = useMemo(() => buildStatusNote({ customerResponse, followUp, nextStatus, note, previousStatus: currentStatus }), [currentStatus, customerResponse, followUp, nextStatus, note]);
  const followUpMissing = followUp.required && !followUp.date;
  const demoMissing = isDemoStatus && (!demo.requirement.trim() || !demo.date || !demo.time || !demo.assignee);
  const onboardedMissing = isOnboardedStatus && !onboardedDate;
  const noteRequired = !isDemoStatus && !isOnboardedStatus && !isWonStatus;
  const cannotSave = disabled || saving || (noteRequired && !note.trim()) || followUpMissing || demoMissing || onboardedMissing || (isWonStatus && wonMissing(won)) || nextStatus === currentStatus;
  const missing = nextStatus === currentStatus ? "Pick a new status" : noteRequired && !note.trim() ? "Write what the customer said" : followUpMissing ? "Pick the follow-up date" : demoMissing ? "Fill the demo details" : onboardedMissing ? "Pick the onboarded date" : isWonStatus && wonMissing(won) ? "Fill the deal value and plan dates" : "";

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !saving) onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, saving]);
  const setFollow = (patch) => setFollowUp((current) => ({ ...current, ...patch }));

  const dialog = (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/40 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={() => !saving && onCancel()}>
      <section role="dialog" aria-label="Update lead status" onClick={(e) => e.stopPropagation()} className="tw-buttons flex max-h-[94dvh] w-full max-w-[620px] flex-col overflow-hidden rounded-t-[18px] bg-white shadow-2xl sm:rounded-[18px]">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[16px] font-bold text-slate-900">Update status</h2>
            <p className="truncate text-[12.5px] text-slate-500">{lead?.company_name || lead?.contact_person}</p>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-[12px] font-semibold">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{getLeadStatusLabel(currentStatus)}</span>
              <span className="text-slate-400">→</span>
              <span className={`rounded-full px-2.5 py-1 ring-1 ${tone(nextStatus)}`}>{getLeadStatusLabel(nextStatus)}</span>
            </p>
          </div>
          <button type="button" onClick={onCancel} disabled={saving} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-[8px] text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {!isDemoStatus ? (
            <label className="block space-y-1.5">
              <span className={LABEL}>New status</span>
              <select className={INPUT} value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} disabled={saving}>
                {statusOptions.map((status) => <option key={status} value={status}>{getLeadStatusLabel(status)}</option>)}
              </select>
            </label>
          ) : null}

          {isDemoStatus ? <LeadDemoHandoffFields assigneeOptions={assigneeOptions} demo={demo} setDemo={setDemo} /> : (
            <>
              <div>
                <p className={`${LABEL} mb-1.5`}>What did the customer say?</p>
                <div className="flex flex-wrap gap-1.5">
                  {RESPONSES.map((r) => (
                    <button key={r} type="button" onClick={() => setCustomerResponse(r)} aria-pressed={customerResponse === r} disabled={saving}
                      className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${customerResponse === r ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{r}</button>
                  ))}
                </div>
              </div>
              {isWonStatus ? <LeadWonFields won={won} setWon={setWon} saving={saving} /> : null}
              {isOnboardedStatus ? (
                <label className="block space-y-1.5"><span className={LABEL}>Onboarded on *</span><input className={INPUT} type="date" max={todayIst()} value={onboardedDate} onChange={(e) => setOnboardedDate(e.target.value)} disabled={saving} /></label>
              ) : null}
              <label className="block space-y-1.5">
                <span className={LABEL}>Note {noteRequired ? <span className="text-rose-600">*</span> : <span className="font-normal text-slate-400">(optional)</span>}</span>
                <textarea className={`${INPUT} min-h-[110px] resize-y leading-relaxed`} value={note} onChange={(e) => setNote(e.target.value)} rows={4} disabled={saving}
                  placeholder="What happened on the call, what they asked for, what was agreed…" />
              </label>
            </>
          )}

          {!isDemoStatus ? (
            <div className="rounded-[12px] bg-slate-50 p-3 ring-1 ring-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-slate-800">Schedule the next follow-up?</span>
                <div className="flex rounded-full bg-white p-0.5 ring-1 ring-slate-200" role="group" aria-label="Next follow-up">
                  {[[false, "No"], [true, "Yes"]].map(([value, name]) => (
                    <button key={name} type="button" aria-pressed={followUp.required === value} onClick={() => setFollow({ required: value, ...(value && !followUp.date ? { date: plusDays(1), time: followUp.time || "11:00" } : {}) })}
                      className={`rounded-full px-4 py-1 text-[12.5px] font-semibold ${followUp.required === value ? "bg-brand-700 text-white" : "text-slate-500"}`}>{name}</button>
                  ))}
                </div>
              </div>
              {followUp.required ? (
                <div className="mt-3 space-y-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {[[0, "Today"], [1, "Tomorrow"], [3, "In 3 days"], [7, "Next week"]].map(([n, name]) => (
                      <button key={name} type="button" onClick={() => setFollow({ date: plusDays(n) })} aria-pressed={followUp.date === plusDays(n)}
                        className={`rounded-full px-3 py-1 text-[12px] font-semibold ${followUp.date === plusDays(n) ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{name}</button>
                    ))}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input className={INPUT} type="date" min={todayIst()} value={followUp.date} onChange={(e) => setFollow({ date: e.target.value })} aria-label="Follow-up date" />
                    <input className={INPUT} type="time" value={followUp.time} onChange={(e) => setFollow({ time: e.target.value })} aria-label="Follow-up time" />
                    <div className="flex gap-1 rounded-[10px] bg-white p-1 ring-1 ring-slate-200" role="group" aria-label="How">
                      {MODES.map(([key, name]) => (
                        <button key={key} type="button" onClick={() => setFollow({ mode: key })} aria-pressed={followUp.mode === key}
                          className={`flex-1 rounded-[8px] py-1 text-[12px] font-semibold ${followUp.mode === key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>{name}</button>
                      ))}
                    </div>
                    <select className={INPUT} value={followUp.assignee} onChange={(e) => setFollow({ assignee: e.target.value })} aria-label="Who follows up">
                      <option value="">Who follows up?</option>
                      {assigneeOptions.map((user) => <option key={user.user_id} value={user.user_id}>{user.name}</option>)}
                    </select>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          {error ? <p role="alert" className="min-w-0 flex-1 text-[12.5px] font-medium text-rose-700">{error}</p> : <p className="min-w-0 flex-1 truncate text-[12px] text-slate-400">{missing}</p>}
          <button type="button" onClick={onCancel} disabled={saving} className="rounded-[10px] px-3 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
          <button type="button" disabled={cannotSave}
            onClick={() => onSave({ customerResponse, demo, followUp, isDemoStatus, onboardedDate, won: isWonStatus ? won : null, note: isDemoStatus ? demo.note : notePayload })}
            className={`rounded-[10px] px-4 py-2 text-[13px] font-semibold text-white shadow-sm disabled:opacity-40 ${isWonStatus ? "bg-emerald-600 hover:bg-emerald-700" : nextStatus === "closed-lost" ? "bg-rose-600 hover:bg-rose-700" : "bg-brand-700 hover:bg-brand-800"}`}>
            {saving ? "Saving…" : isWonStatus ? "Mark as won" : "Save update"}
          </button>
        </footer>
      </section>
    </div>
  );

  return mounted ? createPortal(dialog, document.body) : null;
}
