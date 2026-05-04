"use client";

import { formatIndiaDateTime } from "../../lib/dateTime";

export function isCustomerFollowUpOverdue(value) {
  if (!value) return false;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < Date.now();
}

export function customerFollowUpState(value) {
  if (!value) return { dot: "bg-slate-400", label: "No follow-up scheduled", tone: "border-slate-200 bg-slate-100 text-slate-600" };
  if (isCustomerFollowUpOverdue(value)) return { dot: "bg-rose-500", label: "Overdue", tone: "border-rose-200 bg-rose-100 text-rose-700" };
  return { dot: "bg-emerald-500", label: "Scheduled", tone: "border-emerald-200 bg-emerald-100 text-emerald-700" };
}

export function customerStatusState(status) {
  const active = String(status || "active").toLowerCase() === "active";
  return active
    ? { dot: "bg-emerald-500", label: "Active", tone: "border-emerald-200 bg-emerald-100 text-emerald-700" }
    : { dot: "bg-slate-400", label: "Inactive", tone: "border-slate-200 bg-slate-100 text-slate-600" };
}

export function DotBadge({ state, children }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${state.tone}`}>
      <span className={`h-2 w-2 rounded-full ${state.dot}`} />
      {children || state.label}
    </span>
  );
}

export function CustomerFollowUpBadge({ value, withDate = false }) {
  const state = customerFollowUpState(value);
  return (
    <DotBadge state={state}>
      {withDate && value ? `${state.label}: ${formatIndiaDateTime(value, true)}` : state.label}
    </DotBadge>
  );
}

export function CustomerStatusBadge({ status }) {
  return <DotBadge state={customerStatusState(status)} />;
}

export function FollowUpSummary({ onSchedule, value }) {
  const state = customerFollowUpState(value);
  const dueText = value ? formatIndiaDateTime(value, true) : "No follow-up scheduled";

  return (
    <div className={`rounded-2xl border p-4 ${state.tone}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className={`h-2.5 w-2.5 rounded-full ${state.dot}`} />
        {state.label}
      </div>
      <strong className="mt-3 block text-lg text-slate-950">{dueText}</strong>
      {!value && onSchedule ? (
        <button className="mt-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700" type="button" onClick={onSchedule}>
          Schedule follow-up
        </button>
      ) : null}
    </div>
  );
}
