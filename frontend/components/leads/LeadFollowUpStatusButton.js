"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiRequest } from "../../lib/api";

const FIELD = "h-10 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-50";
const LABEL = "mb-1.5 block text-[11.5px] font-semibold uppercase tracking-wide text-slate-500";
const MODES = [
  ["call", "Call", "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"],
  ["whatsapp", "WhatsApp", "M21 12a9 9 0 0 1-13.5 7.8L3 21l1.2-4.5A9 9 0 1 1 21 12"],
  ["email", "Email", "M3 6h18v12H3zM3 7l9 6 9-6"],
  ["meeting", "Meeting", "M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8M21 20v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"],
];
const CALL_STATUSES = ["Connected", "Not connected", "Busy", "Not reachable", "Switched off", "Wrong number", "Call later"];
const EMAIL_STATUSES = ["Sent", "Opened", "Replied", "Bounced", "No reply", "Wrong email"];
const RESPONSES = ["Interested", "Busy", "Not reachable", "Call later", "On hold", "Not interested", "Wrong number", "Converted", "No response"];
const NOTE_STARTERS = ["Asked to call back", "Shared price list", "Sent brochure", "Wants a demo", "Discussing internally", "Asked for a discount"];
const TIMES = [["10:00", "10am"], ["12:00", "12pm"], ["15:00", "3pm"], ["17:00", "5pm"]];
const IST_MS = 330 * 60000;

const title = (v) => String(v || "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const dayKey = (offset = 0) => new Date(Date.now() + IST_MS + offset * 86400000).toISOString().slice(0, 10);
const nextMonday = () => {
  const day = new Date(Date.now() + IST_MS).getUTCDay();
  return dayKey(((8 - day) % 7) || 7);
};

function buildNote({ callStatus, emailStatus, mode, nextDate, nextTime, note, response }) {
  const rows = [
    "Follow-up Status",
    `Mode: ${title(mode)}`,
    mode === "email" ? `Email status: ${emailStatus}` : `Calling status: ${callStatus}`,
    `Customer response: ${response}`,
  ];
  if (nextDate) rows.push(`Next follow-up: ${nextDate} ${nextTime || "10:00"}`);
  rows.push("", "Notes:", note.trim());
  return rows.join("\n");
}

function Chips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button key={option} type="button" onClick={() => onChange(option)} aria-pressed={value === option}
          className={`rounded-full px-2.5 py-1 text-[12px] font-semibold transition ${value === option ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
          {option}
        </button>
      ))}
    </div>
  );
}

/** Records what happened on a follow-up and, when a next date is chosen, moves the lead's follow-up date. */
export default function LeadFollowUpStatusButton({ className = "", label = "Follow-up Status", lead, onSaved, token, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("call");
  const [callStatus, setCallStatus] = useState("Connected");
  const [emailStatus, setEmailStatus] = useState("Sent");
  const [response, setResponse] = useState("Interested");
  const [note, setNote] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [nextTime, setNextTime] = useState("10:00");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const noteRef = useRef(null);

  function reset() {
    setNote(""); setNextDate(""); setNextTime("10:00"); setError("");
    setMode("call"); setCallStatus("Connected"); setEmailStatus("Sent"); setResponse("Interested");
  }
  const close = () => { if (!saving) { setOpen(false); reset(); } };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  async function save() {
    if (!note.trim()) { setError("Write what the customer said. It stays in the lead's history."); noteRef.current?.focus(); return; }
    setSaving(true);
    setError("");
    const content = buildNote({ callStatus, emailStatus, mode, nextDate, nextTime, note, response });
    let updatedLead;
    let warning = "";
    try {
      const due = nextDate ? new Date(`${nextDate}T${nextTime || "10:00"}:00+05:30`).toISOString() : null;
      if (due) {
        // Saving through the lead moves its follow-up date and records the note in one step.
        try {
          updatedLead = await apiRequest(`/leads/${lead.lead_id}`, { method: "PATCH", token, body: { follow_up_date: due, change_note: content } });
        } catch (patchError) {
          warning = patchError.message || "The lead's follow-up date could not be changed.";
          await apiRequest(`/leads/${lead.lead_id}/notes`, { method: "POST", token, body: { content } });
        }
        await apiRequest("/tasks", {
          method: "POST",
          token,
          body: {
            assigned_to: lead.assigned_to || undefined,
            company_id: lead.company_id || undefined,
            due_date: due,
            priority: lead.priority || "medium",
            related_id: lead.lead_id,
            related_to: "lead",
            team_id: lead.team_id || undefined,
            title: `${title(mode)} follow-up`,
            type: mode === "whatsapp" ? "call" : mode,
            notes: content,
          },
        });
      } else {
        await apiRequest(`/leads/${lead.lead_id}/notes`, { method: "POST", token, body: { content } });
      }
      onSaved?.(lead.lead_id, content, updatedLead);
      if (warning) {
        setError(`Follow-up saved, but the lead's next date did not change: ${warning}`);
        setNote("");
      } else {
        setOpen(false);
        reset();
      }
    } catch (err) {
      setError(err.message || "Could not save the follow-up.");
    } finally {
      setSaving(false);
    }
  }

  const dateChips = [[dayKey(1), "Tomorrow"], [dayKey(2), "In 2 days"], [nextMonday(), "Next Monday"], [dayKey(7), "In a week"]];
  const statuses = mode === "email" ? EMAIL_STATUSES : CALL_STATUSES;
  const status = mode === "email" ? emailStatus : callStatus;
  const setStatus = mode === "email" ? setEmailStatus : setCallStatus;

  return (
    <>
      <div className="group relative inline-flex">
        <button type="button" className={`${className} ${disabled ? "cursor-not-allowed opacity-50" : ""}`} aria-disabled={disabled}
          onClick={(event) => { if (disabled) { event.preventDefault(); return; } setOpen(true); }}>
          {label}
        </button>
        {disabled ? (
          <div className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 w-[220px] rounded-[8px] bg-slate-900 px-3 py-2 text-[11.5px] font-medium leading-relaxed text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100">
            Change the status from New first, then log follow-ups.
          </div>
        ) : null}
      </div>

      {open ? createPortal(
        <div className="tw-buttons fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-[2px]" onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) close(); }}>
          <div role="dialog" aria-label="Log a follow-up" className="flex max-h-[94vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_30px_80px_-20px_rgba(15,23,42,0.5)]">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
              <div className="min-w-0">
                <h3 className="text-[16px] font-bold text-slate-900">Log a follow-up</h3>
                <p className="truncate text-[12.5px] text-slate-500">{[lead.company_name, lead.contact_person, lead.phone].filter(Boolean).join(" · ")}</p>
              </div>
              <button type="button" onClick={close} aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-5 py-4">
              {lead.latest_note ? (
                <div className="rounded-[10px] bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Last note</p>
                  <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-[12.5px] leading-snug text-slate-600">{String(lead.latest_note).split(/\n\s*Changes:/i)[0]}</p>
                </div>
              ) : null}

              <div>
                <span className={LABEL}>How did you reach them?</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {MODES.map(([key, text, d]) => (
                    <button key={key} type="button" onClick={() => setMode(key)} aria-pressed={mode === key}
                      className={`flex flex-col items-center gap-1 rounded-[10px] py-2 text-[12px] font-semibold transition ${mode === key ? "bg-brand-700 text-white shadow-sm" : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"}`}>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
                      {text}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className={LABEL}>{mode === "email" ? "Email status" : "Call status"}</span>
                <Chips options={statuses} value={status} onChange={setStatus} />
              </div>
              <div>
                <span className={LABEL}>Customer response</span>
                <Chips options={RESPONSES} value={response} onChange={setResponse} />
              </div>

              <div>
                <label htmlFor="followup-note" className={LABEL}>What did they say? <span className="text-rose-500">*</span></label>
                <textarea id="followup-note" ref={noteRef} autoFocus value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="What the customer said and what happens next"
                  className="w-full resize-y rounded-[10px] border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50" />
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {NOTE_STARTERS.map((text) => (
                    <button key={text} type="button" onClick={() => setNote((current) => (current.trim() ? `${current.trim()}. ${text}` : text))}
                      className="rounded-[7px] px-2 py-0.5 text-[11.5px] font-medium text-slate-500 ring-1 ring-slate-200 hover:bg-brand-50 hover:text-brand-800">+ {text}</button>
                  ))}
                </div>
              </div>

              <div className="rounded-[12px] bg-slate-50/80 p-3 ring-1 ring-slate-100">
                <span className={LABEL}>Next follow-up</span>
                <div className="flex flex-wrap gap-1.5">
                  {dateChips.map(([key, text]) => (
                    <button key={text} type="button" onClick={() => setNextDate(nextDate === key ? "" : key)} aria-pressed={nextDate === key}
                      className={`rounded-[8px] px-2.5 py-1 text-[12px] font-semibold ${nextDate === key ? "bg-brand-100 text-brand-900 ring-1 ring-brand-200" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>{text}</button>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input aria-label="Next follow-up date" className={FIELD} type="date" min={dayKey()} value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
                  <input aria-label="Next follow-up time" className={FIELD} type="time" value={nextTime} onChange={(e) => setNextTime(e.target.value)} />
                </div>
                {nextDate ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {TIMES.map(([value, text]) => (
                      <button key={value} type="button" onClick={() => setNextTime(value)} className={`rounded-[7px] px-2 py-0.5 text-[11.5px] font-semibold ${nextTime === value ? "bg-brand-100 text-brand-900" : "text-slate-500 hover:bg-slate-100"}`}>{text}</button>
                    ))}
                  </div>
                ) : <p className="mt-1.5 text-[11.5px] text-slate-500">Choose a date to update the lead and add it to the calendar.</p>}
              </div>

              {error ? <p role="alert" className="rounded-[10px] bg-rose-50 px-3 py-2 text-[13px] font-medium text-rose-700">{error}</p> : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
              <button type="button" disabled={saving} onClick={close} className="rounded-[10px] px-4 py-2 text-[13.5px] font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button type="button" disabled={saving} onClick={save} className="rounded-[10px] bg-brand-700 px-5 py-2 text-[13.5px] font-semibold text-white shadow-sm hover:bg-brand-800 disabled:opacity-60">
                {saving ? "Saving…" : "Save follow-up"}
              </button>
            </div>
          </div>
        </div>
      , document.body) : null}
    </>
  );
}
