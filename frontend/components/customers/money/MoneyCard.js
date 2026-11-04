"use client";

import { useState } from "react";
import { apiRequest } from "../../../lib/api";
import { day, daysUntil, fullMoney, titleize } from "../workspace/customerConfig";

const CYCLES = [["", "Not set"], ["one-time", "One-time"], ["monthly", "Monthly"], ["quarterly", "Quarterly"], ["half-yearly", "Half-yearly"], ["yearly", "Yearly"]];

/** Money for one customer: contract, paid, pending, next due date, billing cycle and every payment. */
export default function MoneyCard({ money, token, customerId, canEdit, onRecord, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!money) return <section className="h-[260px] animate-pulse rounded-[14px] bg-white ring-1 ring-slate-200" />;

  const pct = money.contract_value ? Math.min(100, Math.round((money.paid / money.contract_value) * 100)) : 0;
  const due = daysUntil(money.next_payment_date);
  const late = money.pending > 0 && due !== null && due < 0;

  async function saveBilling() {
    setBusy(true);
    setError("");
    try {
      const res = await apiRequest(`/customers/${encodeURIComponent(customerId)}/billing`, { method: "PATCH", token, body: { total_value: Number(draft.total_value || 0), billing_cycle: draft.billing_cycle || null, next_payment_date: draft.next_payment_date || null } });
      onChanged(res);
      setEditing(false);
    } catch (err) { setError(err.message || "Could not save."); } finally { setBusy(false); }
  }
  async function removePayment(p) {
    if (!window.confirm(`Remove the payment of ${fullMoney(p.amount)}?`)) return;
    try { onChanged(await apiRequest(`/customers/${encodeURIComponent(customerId)}/payments/${p.id}`, { method: "DELETE", token })); } catch (err) { setError(err.message); }
  }

  return (
    <section className="rounded-[14px] bg-white ring-1 ring-slate-200">
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="flex items-center gap-2 text-[14.5px] font-bold text-slate-900"><span className="h-3.5 w-1 rounded-full bg-emerald-500" />Money</h2>
        {canEdit ? (
          <span className="flex gap-1">
            <button type="button" onClick={() => { setDraft({ total_value: money.contract_value, billing_cycle: money.billing_cycle || "", next_payment_date: money.next_payment_date ? String(money.next_payment_date).slice(0, 10) : "" }); setEditing((v) => !v); }} className="rounded-[8px] px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-100">{editing ? "Close" : "Edit billing"}</button>
            <button type="button" onClick={() => onRecord()} className="rounded-[8px] bg-emerald-600 px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-emerald-700">+ Payment</button>
          </span>
        ) : null}
      </header>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-3 gap-2">
          {[["Contract", money.contract_value, "text-slate-900", "#3b6fd8"], ["Received", money.paid, "text-emerald-700", "#059669"], ["Pending", money.pending, money.pending ? "text-orange-700" : "text-slate-400", "#e06a10"]].map(([label, value, tone, color]) => (
            <div key={label} className="rounded-[10px] p-2.5" style={{ background: `${color}12` }}>
              <p className="text-[11.5px] font-medium text-slate-500">{label}</p>
              <p className={`text-[17px] font-bold tabular-nums ${tone}`}>{fullMoney(value)}</p>
            </div>
          ))}
        </div>
        <div>
          <div className="flex justify-between text-[11.5px] text-slate-500"><span>{pct}% collected</span>{money.extra_paid ? <span className="font-semibold text-sky-700">{fullMoney(money.extra_paid)} paid above contract</span> : null}</div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
        </div>
        {money.pending > 0 ? (
          <div className={`flex items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-[12.5px] ${late ? "bg-rose-50 text-rose-800 ring-1 ring-rose-100" : "bg-amber-50 text-amber-900 ring-1 ring-amber-100"}`}>
            <span>{money.next_payment_date ? <>Next payment {late ? <b>{-due} days late</b> : due === 0 ? <b>due today</b> : <>due in <b>{due} days</b></>} · {day(money.next_payment_date)}</> : "No due date set for the pending amount"}</span>
            {money.billing_cycle ? <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold">{titleize(money.billing_cycle)}</span> : null}
          </div>
        ) : money.contract_value ? <p className="rounded-[10px] bg-emerald-50 px-3 py-2 text-[12.5px] font-semibold text-emerald-800">Fully paid. Nothing pending.</p> : null}
        {money.lead_advance > 0 && canEdit ? (
          <button type="button" onClick={() => onRecord(money.lead_advance)} className="w-full rounded-[10px] border border-dashed border-sky-300 bg-sky-50 px-3 py-2 text-left text-[12.5px] text-sky-900 hover:bg-sky-100">
            <b>{fullMoney(money.lead_advance)}</b> advance was noted on the lead. Add it as the first payment →
          </button>
        ) : null}

        {editing ? (
          <div className="space-y-2 rounded-[12px] bg-slate-50 p-3 ring-1 ring-slate-100">
            <label className="block text-[12px] font-semibold text-slate-600">Contract value (₹)<input type="number" min="0" value={draft.total_value} onChange={(e) => setDraft((d) => ({ ...d, total_value: e.target.value }))} className="mt-1 h-9 w-full rounded-[8px] border border-slate-200 bg-white px-2.5 text-[13px]" /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[12px] font-semibold text-slate-600">Billing<select value={draft.billing_cycle} onChange={(e) => setDraft((d) => ({ ...d, billing_cycle: e.target.value }))} className="mt-1 h-9 w-full rounded-[8px] border border-slate-200 bg-white px-2 text-[13px]">{CYCLES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
              <label className="block text-[12px] font-semibold text-slate-600">Next payment due<input type="date" value={draft.next_payment_date} onChange={(e) => setDraft((d) => ({ ...d, next_payment_date: e.target.value }))} className="mt-1 h-9 w-full rounded-[8px] border border-slate-200 bg-white px-2 text-[13px]" /></label>
            </div>
            <div className="flex justify-end"><button type="button" onClick={saveBilling} disabled={busy} className="rounded-[8px] bg-brand-700 px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save"}</button></div>
          </div>
        ) : null}
        {error ? <p role="alert" className="text-[12.5px] text-rose-700">{error}</p> : null}

        <div>
          <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wider text-slate-400">Payments ({money.payments.length})</p>
          {money.payments.length ? (
            <ul className="max-h-[260px] divide-y divide-slate-100 overflow-y-auto">
              {money.payments.map((p) => (
                <li key={p.id} className="group flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold tabular-nums text-slate-900">{fullMoney(p.amount)} <span className="ml-1 rounded-full bg-slate-100 px-1.5 text-[10.5px] font-semibold text-slate-600">{titleize(p.mode)}</span></span>
                    <span className="block truncate text-[11.5px] text-slate-500">{day(p.paid_on)}{p.reference ? ` · ${p.reference}` : ""}{p.recorded_by_name ? ` · ${p.recorded_by_name}` : ""}{p.note ? ` · ${p.note}` : ""}</span>
                  </span>
                  {money.can_delete ? <button type="button" onClick={() => removePayment(p)} className="shrink-0 text-[11.5px] font-semibold text-slate-300 opacity-100 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100">Remove</button> : null}
                </li>
              ))}
            </ul>
          ) : <p className="text-[12.5px] text-slate-400">No payments recorded yet.</p>}
        </div>
      </div>
    </section>
  );
}
