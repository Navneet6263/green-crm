"use client";

import Link from "next/link";
import { colorFor } from "../../dashboard/home/widgetCatalog";
import { HEALTH, day, daysUntil, money, onboardingOf, pendingOf, titleize } from "./customerConfig";

const initials = (t) => String(t || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export function HealthPill({ health }) {
  const h = HEALTH[health?.level] || HEALTH.inactive;
  return (
    <span title={(health?.reasons || []).join(" · ") || "All good"} className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1 ${h.tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${h.dot}`} />{h.label}{health?.score !== null && health?.score !== undefined ? <span className="opacity-60">{health.score}</span> : null}
    </span>
  );
}

function OnboardingCell({ c }) {
  const o = onboardingOf(c.onboarding_status);
  const total = Number(c.onboarding_steps_total || 0);
  const done = Number(c.onboarding_steps_done || 0);
  const pct = total ? Math.round((done / total) * 100) : ["done", "completed"].includes(c.onboarding_status) ? 100 : 0;
  return (
    <div className="w-[130px]">
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${o.tone}`}>{o.label}</span>
      <span className="mt-1.5 flex items-center gap-1.5">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full rounded-full ${o.bar}`} style={{ width: `${pct}%` }} /></span>
        <span className="text-[10.5px] tabular-nums text-slate-400">{total ? `${done}/${total}` : `${pct}%`}</span>
      </span>
    </div>
  );
}

function MoneyCell({ c }) {
  const value = Number(c.total_value || 0);
  const paid = Number(c.paid_amount || 0);
  const pct = value ? Math.min(100, Math.round((paid / value) * 100)) : 0;
  return (
    <div className="w-[130px]">
      <span className="text-[12.5px] font-semibold tabular-nums text-slate-800">{money(paid)} <span className="font-normal text-slate-400">/ {money(value)}</span></span>
      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></span>
    </div>
  );
}

function DateCell({ value, overdueWhen, empty = "–", soon = 30 }) {
  if (!value) return <span className="text-slate-300">{empty}</span>;
  const d = daysUntil(value);
  const late = overdueWhen && d < 0;
  return (
    <span className="block whitespace-nowrap">
      <span className={`text-[12.5px] font-medium ${late ? "text-rose-700" : d <= soon && d >= 0 ? "text-amber-700" : "text-slate-700"}`}>{day(value, { day: "numeric", month: "short", year: "2-digit" })}</span>
      <span className={`block text-[11px] ${late ? "font-semibold text-rose-600" : "text-slate-400"}`}>{d < 0 ? `${-d}d ago` : d === 0 ? "today" : `in ${d}d`}</span>
    </span>
  );
}

const CELLS = {
  owner: (c) => <span className="whitespace-nowrap text-[12.5px] text-slate-700">{c.assigned_to_name || <span className="text-amber-700">Unassigned</span>}</span>,
  health: (c) => <HealthPill health={c.health} />,
  onboarding: (c) => <OnboardingCell c={c} />,
  money: (c) => <MoneyCell c={c} />,
  pending: (c) => (pendingOf(c) ? <span className="whitespace-nowrap text-[13px] font-bold tabular-nums text-orange-700">{money(pendingOf(c))}</span> : <span className="text-[12px] font-semibold text-emerald-600">Clear</span>),
  due: (c) => (pendingOf(c) ? <DateCell value={c.next_payment_date} overdueWhen empty="Not set" soon={7} /> : <span className="text-slate-300">–</span>),
  renewal: (c) => <DateCell value={c.next_renewal} overdueWhen />,
  followup: (c) => <DateCell value={c.next_follow_up} overdueWhen soon={2} />,
  product: (c) => <span className="text-[12.5px] text-slate-700">{c.product_name || "–"}</span>,
  team: (c) => <span className="text-[12.5px] text-slate-700">{c.team_name || "–"}</span>,
  since: (c) => <span className="whitespace-nowrap text-[12.5px] text-slate-600">{day(c.created_at)}</span>,
};

/** The customers list. Columns come from the person's choice; actions sit at the end of each row. */
export default function CustomerTable({ rows, columns, labels, loading, onPayment, onFollowUp, onDelete, canManage, canDelete, saving }) {
  if (loading && !rows.length) return <div className="space-y-2 p-4">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-12 animate-pulse rounded-[10px] bg-slate-100" />)}</div>;
  if (!rows.length) return <p className="px-6 py-14 text-center text-[13.5px] text-slate-400">No customers match these filters.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {columns.map((key) => <th key={key} className={`px-3 py-2.5 ${key === "customer" ? "pl-4" : ""}`}>{labels[key]}</th>)}
            <th className="px-3 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className={loading ? "opacity-60" : ""}>
          {rows.map((c) => (
            <tr key={c.customer_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
              {columns.map((key) => (
                <td key={key} className={`px-3 py-2.5 align-middle ${key === "customer" ? "pl-4" : ""}`}>
                  {key === "customer" ? (
                    <Link href={`/customers/${c.customer_id}`} prefetch={false} className="flex min-w-[220px] items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: colorFor(c.customer_id) }}>{initials(c.company_name || c.name)}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-semibold text-slate-900 hover:text-brand-700">{c.company_name || c.name}</span>
                        <span className="block truncate text-[11.5px] text-slate-500">{[c.name, c.phone].filter(Boolean).join(" · ")}{c.status !== "active" ? ` · ${titleize(c.status)}` : ""}</span>
                      </span>
                    </Link>
                  ) : CELLS[key](c)}
                </td>
              ))}
              <td className="px-3 py-2.5 text-right">
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  {canManage ? <button type="button" onClick={() => onPayment(c)} className="whitespace-nowrap rounded-[8px] bg-emerald-50 px-2.5 py-1.5 text-[12px] font-semibold text-emerald-800 ring-1 ring-emerald-100 hover:bg-emerald-100">+ Payment</button> : null}
                  {canManage ? <button type="button" onClick={() => onFollowUp(c)} className="whitespace-nowrap rounded-[8px] px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">Log</button> : null}
                  {canDelete ? (
                    <button type="button" onClick={() => onDelete(c)} disabled={saving === c.customer_id} aria-label={`Delete ${c.company_name}`} title="Delete" className="grid h-7 w-7 place-items-center rounded-[8px] text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
                    </button>
                  ) : null}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
