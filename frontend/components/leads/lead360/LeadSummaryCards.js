"use client";

import { useState } from "react";
import { apiRequest } from "../../../lib/api";
import { getLeadStatusLabel, LEAD_STATUS_ORDER } from "../../../lib/leadStatus";
import LeadFollowUpStatusButton from "../LeadFollowUpStatusButton";
import LeadQuickStatusControl from "../LeadQuickStatusControl";
import { followUpState, formatClock, formatDay, moneyShort } from "../workspace/leadWorkspaceConfig";

const titleize = (v) => String(v || "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** "What should happen next" for this lead. */
export function NextStepCard({ lead, token, canEdit, onSaved, hideAction = false }) {
  const state = followUpState(lead);
  const isNew = !lead.status || lead.status === "new";
  const closed = ["closed-won", "closed-lost"].includes(lead.status);
  const copy = closed ? [`Lead is ${titleize(lead.status)}`, "No follow-up needed unless it reopens."]
    : isNew ? ["Make the first contact", "Call them, then change the status from New."]
      : state === "overdue" ? [`Follow-up overdue since ${formatDay(lead.follow_up_date)}`, "Call now and set the next date."]
        : state === "today" ? [`Follow-up today at ${formatClock(lead.follow_up_date)}`, "Log what happened after you talk."]
          : state === "upcoming" ? [`Next follow-up ${formatDay(lead.follow_up_date)}, ${formatClock(lead.follow_up_date)}`, "You are on track."]
            : ["No follow-up planned", "Set a date so this lead does not go quiet."];
  const tone = closed ? "bg-slate-50 ring-slate-200" : state === "overdue" ? "bg-rose-50 ring-rose-200" : state === "today" || isNew ? "bg-gold-50 ring-gold-200" : state === "upcoming" ? "bg-brand-50 ring-brand-100" : "bg-amber-50 ring-amber-200";
  return (
    <section className={`rounded-[12px] p-3.5 ring-1 ${tone}`}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Next step</p>
      <p className={`mt-0.5 text-[14.5px] font-bold ${state === "overdue" && !closed ? "text-rose-800" : "text-slate-900"}`}>{copy[0]}</p>
      <p className="text-[12.5px] text-slate-600">{copy[1]}</p>
      {canEdit && !closed && !hideAction ? (
        <LeadFollowUpStatusButton className="mt-2.5 h-9 rounded-[10px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white hover:bg-brand-800" label="Log follow-up" lead={lead} token={token} onSaved={onSaved} disabled={isNew} />
      ) : null}
    </section>
  );
}

export function PaymentCard({ lead }) {
  const total = Number(lead.total_lead_value || lead.estimated_value || 0);
  const advance = Number(lead.advance_received || 0);
  const pending = Math.max(0, total - advance);
  const percent = total ? Math.min(100, Math.round((advance / total) * 100)) : 0;
  const rows = [
    ["Payment mode", titleize(lead.payment_mode)],
    ["Payment date", formatDay(lead.payment_date, { day: "numeric", month: "short", year: "numeric" })],
    ["Next payment", formatDay(lead.next_payment_date, { day: "numeric", month: "short", year: "numeric" })],
    ["Subscription from", formatDay(lead.subscription_start_date, { day: "numeric", month: "short", year: "numeric" })],
    ["Tenure till", formatDay(lead.client_tenure, { day: "numeric", month: "short", year: "numeric" })],
  ].filter(([, value]) => value);
  return (
    <section className="rounded-[12px] bg-white p-3.5 ring-1 ring-slate-200">
      <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Payment</h3>
      {total || advance ? (
        <>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div><p className="text-[11.5px] text-slate-500">Total</p><p className="text-[15px] font-bold tabular-nums text-slate-900">{moneyShort(total)}</p></div>
            <div><p className="text-[11.5px] text-slate-500">Received</p><p className="text-[15px] font-bold tabular-nums text-emerald-700">{moneyShort(advance)}</p></div>
            <div><p className="text-[11.5px] text-slate-500">Pending</p><p className={`text-[15px] font-bold tabular-nums ${pending ? "text-amber-700" : "text-slate-400"}`}>{moneyShort(pending)}</p></div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${percent}% received`}><div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} /></div>
          <p className="mt-1 text-[11.5px] text-slate-500">{percent}% received</p>
        </>
      ) : <p className="mt-1.5 text-[13px] text-slate-500">No value or payment added yet.</p>}
      {rows.length ? (
        <dl className="mt-2.5 space-y-1 border-t border-slate-100 pt-2.5">
          {rows.map(([name, value]) => (
            <div key={name} className="flex justify-between gap-3 text-[12.5px]"><dt className="text-slate-500">{name}</dt><dd className="font-medium text-slate-800">{value}</dd></div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}

/** Status path across the top of the lead page. Clicking a step opens the normal status dialog. */
export function StagePath({ lead, enabledStatuses, token, teamUsers, canEdit, onUpdated }) {
  const [moving, setMoving] = useState("");
  const all = enabledStatuses.length ? enabledStatuses : LEAD_STATUS_ORDER;
  const path = all.filter((s) => !["closed-lost", "on-hold"].includes(s));
  const current = path.indexOf(lead.status);
  const offPath = current < 0;
  const editable = canEdit && !lead.is_workflow;
  return (
    <div className="flex items-center gap-2">
      <ol className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]" aria-label="Lead status">
        {path.map((status, index) => {
          const state = index === current ? "current" : !offPath && index < current ? "done" : "todo";
          const tone = state === "current" ? "bg-brand-700 text-white" : state === "done" ? "bg-brand-100 text-brand-900" : "bg-slate-100 text-slate-500";
          return (
            <li key={status} className="min-w-[90px] flex-1">
              <button type="button" aria-disabled={!editable || state === "current"} onClick={() => { if (editable && state !== "current") setMoving(status); }} aria-current={state === "current" ? "step" : undefined}
                className={`h-8 w-full truncate rounded-[7px] px-2 text-[12px] font-semibold transition ${tone} ${editable && state !== "current" ? "hover:ring-2 hover:ring-brand-300" : "cursor-default"}`}>
                {getLeadStatusLabel(status)}
              </button>
            </li>
          );
        })}
      </ol>
      {all.includes("closed-lost") ? (
        <button type="button" disabled={!editable || lead.status === "closed-lost"} onClick={() => setMoving("closed-lost")}
          className={`h-8 shrink-0 rounded-[7px] px-2.5 text-[12px] font-semibold ${lead.status === "closed-lost" ? "bg-rose-600 text-white" : "text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50"}`}>Lost</button>
      ) : null}
      {lead.status === "on-hold" ? <span className="h-8 shrink-0 rounded-[7px] bg-amber-100 px-2.5 text-[12px] font-semibold leading-8 text-amber-800">On Hold</span> : null}
      {moving ? (
        <LeadQuickStatusControl assigneeOptions={teamUsers} enabledStatuses={enabledStatuses} lead={lead} token={token} onUpdated={onUpdated} requestedStatus={moving} hideSelect onDialogClosed={() => setMoving("")} />
      ) : null}
    </div>
  );
}

/** Small box to add a note without opening the follow-up form. */
export function QuickNote({ lead, token, onSaved, placeholder = "Add a quick note" }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function save(event) {
    event.preventDefault();
    const content = text.trim();
    if (!content) return;
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/leads/${lead.lead_id}/notes`, { method: "POST", token, body: { content } });
      setText("");
      onSaved?.(lead.lead_id, content);
    } catch (err) {
      setError(err.message || "The note could not be saved.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={save}>
      <div className="flex items-end gap-2 rounded-[12px] bg-white p-2 ring-1 ring-slate-200 focus-within:ring-brand-300">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={text.includes("\n") || text.length > 60 ? 3 : 1} placeholder={placeholder} aria-label="Note"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save(e); }}
          className="min-h-[34px] flex-1 resize-none border-0 bg-transparent px-1.5 py-1.5 text-[13.5px] text-slate-900 outline-none placeholder:text-slate-400" />
        <button type="submit" disabled={saving || !text.trim()} className="h-8 shrink-0 rounded-[8px] bg-slate-900 px-3 text-[12.5px] font-semibold text-white hover:bg-slate-700 disabled:opacity-40">{saving ? "Saving…" : "Add note"}</button>
      </div>
      {error ? <p role="alert" className="mt-1 text-[12.5px] text-rose-700">{error}</p> : null}
    </form>
  );
}
