"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { LEAD_STATUS_ORDER, getLeadStatusLabel } from "../../lib/leadStatus";
import LeadDemoHandoffFields from "./LeadDemoHandoffFields";

const RESPONSES = ["Interested", "Busy", "Not reachable", "Call later", "Not interested", "Wrong number", "Converted"];
const INPUT = "w-full rounded-[16px] border border-[#eadfcd] bg-white px-3 py-2.5 text-sm text-[#060710] outline-none focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const LABEL = "text-[10px] font-black uppercase tracking-[0.22em] text-[#9a886d]";
const PRIMARY = "inline-flex min-h-[40px] items-center justify-center rounded-[16px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2 text-sm font-semibold text-[#060710] disabled:cursor-not-allowed disabled:opacity-60";
const GHOST = "inline-flex min-h-[40px] items-center justify-center rounded-[16px] border border-[#eadfcd] bg-white px-4 py-2 text-sm font-semibold text-[#5d503c]";

function buildStatusNote({ customerResponse, followUp, nextStatus, note, previousStatus }) {
  const lines = [
    `Status changed: ${getLeadStatusLabel(previousStatus)} -> ${getLeadStatusLabel(nextStatus)}`,
    `Customer response: ${customerResponse}`,
    "",
    "Note:",
    note.trim(),
  ];

  if (followUp.required) {
    lines.push("", `Next follow-up: ${followUp.date} ${followUp.time}`, `Mode: ${followUp.mode}`);
  }

  return lines.join("\n");
}

export default function LeadStatusUpdateDialog({
  assigneeOptions = [],
  currentStatus,
  disabled = false,
  error = "",
  lead,
  nextStatus,
  onCancel,
  onSave,
  saving = false,
  setNextStatus,
}) {
  const [mounted, setMounted] = useState(false);
  const isDemoStatus = nextStatus === "booked-demo";
  const [customerResponse, setCustomerResponse] = useState("Interested");
  const [note, setNote] = useState("");
  const [demo, setDemo] = useState({ assignee: "", date: "", note: "", requirement: "", time: "" });
  const [followUp, setFollowUp] = useState({
    assignee: lead?.assigned_to || "",
    date: "",
    mode: "call",
    required: false,
    time: "",
  });

  const notePayload = useMemo(
    () => buildStatusNote({ customerResponse, followUp, nextStatus, note, previousStatus: currentStatus }),
    [currentStatus, customerResponse, followUp, nextStatus, note]
  );
  const followUpMissing = followUp.required && (!followUp.date || !followUp.time);
  const demoMissing = isDemoStatus && (!demo.requirement.trim() || !demo.date || !demo.time || !demo.assignee);
  const cannotSave = disabled || saving || (!isDemoStatus && !note.trim()) || followUpMissing || demoMissing || nextStatus === currentStatus;

  useEffect(() => {
    setMounted(true);
  }, []);

  const dialog = (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#060710]/35 p-3 sm:items-center">
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-[#eadfcd] bg-white p-5 shadow-[0_30px_80px_rgba(6,7,16,0.22)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#060710]">Update Lead Status</h2>
            <p className="mt-1 text-sm text-[#7a6b57]">Record customer response, note, and next follow-up in one step.</p>
          </div>
          <button className={GHOST} type="button" onClick={onCancel} disabled={saving}>Close</button>
        </div>

        {isDemoStatus ? (
          <div className="mt-5 rounded-[18px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-3 text-sm font-bold text-[#060710]">
            {getLeadStatusLabel(currentStatus)} &rarr; {getLeadStatusLabel(nextStatus)}
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className={LABEL}>New status</span>
              <select className={INPUT} value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} disabled={saving}>
                {LEAD_STATUS_ORDER.map((status) => <option key={status} value={status}>{getLeadStatusLabel(status)}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className={LABEL}>Customer response</span>
              <select className={INPUT} value={customerResponse} onChange={(event) => setCustomerResponse(event.target.value)} disabled={saving}>
                {RESPONSES.map((response) => <option key={response} value={response}>{response}</option>)}
              </select>
            </label>
          </div>
        )}

        {isDemoStatus ? (
          <LeadDemoHandoffFields assigneeOptions={assigneeOptions} demo={demo} setDemo={setDemo} />
        ) : (
          <label className="mt-4 block space-y-2">
            <span className={LABEL}>What did customer say? *</span>
            <textarea className={`${INPUT} min-h-[132px] resize-y`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Write the real customer response before saving this status change." rows="4" />
          </label>
        )}

        {!isDemoStatus ? <div className="mt-4 rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className={LABEL}>Next follow-up required?</span>
            <div className="flex rounded-full border border-[#eadfcd] bg-white p-1">
              {[false, true].map((value) => (
                <button key={String(value)} className={`rounded-full px-4 py-1.5 text-xs font-bold ${followUp.required === value ? "bg-[#f3dfab] text-[#060710]" : "text-[#7c6d55]"}`} type="button" onClick={() => setFollowUp((current) => ({ ...current, required: value }))}>
                  {value ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </div>
          {followUp.required ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input className={INPUT} type="date" value={followUp.date} onChange={(event) => setFollowUp((current) => ({ ...current, date: event.target.value }))} />
              <input className={INPUT} type="time" value={followUp.time} onChange={(event) => setFollowUp((current) => ({ ...current, time: event.target.value }))} />
              <select className={INPUT} value={followUp.mode} onChange={(event) => setFollowUp((current) => ({ ...current, mode: event.target.value }))}>
                <option value="call">Call</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="meeting">Meeting</option>
              </select>
              <select className={INPUT} value={followUp.assignee} onChange={(event) => setFollowUp((current) => ({ ...current, assignee: event.target.value }))}>
                <option value="">Select assignee</option>
                {assigneeOptions.map((user) => <option key={user.user_id} value={user.user_id}>{user.name} | {user.role}</option>)}
              </select>
            </div>
          ) : null}
        </div> : null}

        {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button className={GHOST} type="button" onClick={onCancel} disabled={saving}>Cancel</button>
          <button className={PRIMARY} type="button" disabled={cannotSave} onClick={() => onSave({ customerResponse, demo, followUp, isDemoStatus, note: isDemoStatus ? demo.note : notePayload })}>{saving ? "Saving..." : "Save Status Update"}</button>
        </div>
      </section>
    </div>
  );

  return mounted ? createPortal(dialog, document.body) : null;
}
