"use client";

const INPUT = "w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-[13.5px] text-slate-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50";
const LABEL = "text-[12px] font-semibold text-slate-600";
const PLANS = [1, 3, 6, 12, 24, 36];
const MODES = [["upi", "UPI"], ["neft_company", "NEFT / company account"], ["credit_debit_card", "Credit / debit card"], ["cash", "Cash"], ["cheque", "Cheque"]];
const todayIst = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);

export function addMonths(dateKey, months) {
  if (!dateKey || !months) return "";
  const [y, m, d] = dateKey.split("-").map(Number);
  const end = new Date(Date.UTC(y, m - 1 + Number(months), d));
  return end.toISOString().slice(0, 10);
}
const nice = (key) => (key ? new Date(`${key}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }) : "");

/** Starting values for the "won" form, from what the lead already has. */
export function wonDefaults(lead) {
  const start = lead?.subscription_start_date ? String(lead.subscription_start_date).slice(0, 10) : todayIst();
  return {
    deal_value: lead?.estimated_value ? String(lead.estimated_value) : "", advance_received: lead?.advance_received ? String(lead.advance_received) : "",
    payment_mode: lead?.payment_mode || "upi", payment_date: lead?.payment_date ? String(lead.payment_date).slice(0, 10) : todayIst(),
    subscription_start_date: start, plan_months: 12, client_tenure: lead?.client_tenure ? String(lead.client_tenure).slice(0, 10) : addMonths(start, 12),
    next_payment_date: lead?.next_payment_date ? String(lead.next_payment_date).slice(0, 10) : "",
  };
}
export const wonMissing = (won) => !(Number(won.deal_value) > 0) || !won.subscription_start_date || !won.client_tenure || won.client_tenure <= won.subscription_start_date;

/** The PATCH fields and a line for the update note. */
export function wonPayload(won) {
  const pending = Math.max(0, Number(won.deal_value) - Number(won.advance_received || 0));
  return {
    body: {
      estimated_value: Number(won.deal_value), advance_received: Number(won.advance_received || 0),
      payment_mode: Number(won.advance_received) > 0 ? won.payment_mode : undefined, payment_date: Number(won.advance_received) > 0 ? won.payment_date : undefined,
      subscription_start_date: won.subscription_start_date, client_tenure: won.client_tenure, next_payment_date: pending > 0 ? won.next_payment_date || null : null,
    },
    note: `Won: ₹${Number(won.deal_value).toLocaleString("en-IN")} · Advance ₹${Number(won.advance_received || 0).toLocaleString("en-IN")} · Plan ${nice(won.subscription_start_date)} → ${nice(won.client_tenure)}`,
  };
}

/** Deal value, payment and plan dates, asked when a lead is marked Closed Won. */
export default function LeadWonFields({ won, setWon, saving }) {
  const set = (key) => (e) => setWon((w) => ({ ...w, [key]: e.target.value }));
  const pending = Math.max(0, Number(won.deal_value || 0) - Number(won.advance_received || 0));
  const remindOn = won.client_tenure ? (() => { const d = new Date(`${won.client_tenure}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - 10); return nice(d.toISOString().slice(0, 10)); })() : "";
  const pickPlan = (months) => setWon((w) => ({ ...w, plan_months: months, client_tenure: addMonths(w.subscription_start_date, months) }));
  return (
    <div className="mt-4 space-y-3 rounded-[14px] bg-emerald-50/60 p-4 ring-1 ring-emerald-100">
      <p className="text-sm font-bold text-emerald-900">🎉 Deal won: fill the payment and plan</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5"><span className={LABEL}>Deal value (₹) *</span><input className={INPUT} type="number" min="1" value={won.deal_value} onChange={set("deal_value")} disabled={saving} /></label>
        <label className="space-y-1.5"><span className={LABEL}>Advance received (₹)</span><input className={INPUT} type="number" min="0" value={won.advance_received} onChange={set("advance_received")} disabled={saving} placeholder="0" /></label>
        {Number(won.advance_received) > 0 ? (
          <>
            <label className="space-y-1.5"><span className={LABEL}>Paid by</span><select className={INPUT} value={won.payment_mode} onChange={set("payment_mode")} disabled={saving}>{MODES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
            <label className="space-y-1.5"><span className={LABEL}>Payment date</span><input className={INPUT} type="date" max={todayIst()} value={won.payment_date} onChange={set("payment_date")} disabled={saving} /></label>
          </>
        ) : null}
        <label className="space-y-1.5"><span className={LABEL}>Plan starts *</span><input className={INPUT} type="date" value={won.subscription_start_date} onChange={(e) => setWon((w) => ({ ...w, subscription_start_date: e.target.value, client_tenure: w.plan_months ? addMonths(e.target.value, w.plan_months) : w.client_tenure }))} disabled={saving} /></label>
        <label className="space-y-1.5"><span className={LABEL}>Plan ends *</span><input className={INPUT} type="date" min={won.subscription_start_date} value={won.client_tenure} onChange={(e) => setWon((w) => ({ ...w, plan_months: 0, client_tenure: e.target.value }))} disabled={saving} /></label>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={LABEL}>Plan length</span>
        {PLANS.map((m) => (
          <button key={m} type="button" onClick={() => pickPlan(m)} aria-pressed={Number(won.plan_months) === m}
            className={`rounded-full px-3 py-1 text-xs font-bold ${Number(won.plan_months) === m ? "bg-emerald-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{m < 12 ? `${m} mo` : `${m / 12} yr`}</button>
        ))}
      </div>
      {pending > 0 ? (
        <label className="block space-y-1.5"><span className={LABEL}>₹{pending.toLocaleString("en-IN")} still pending · next payment due</span><input className={INPUT} type="date" value={won.next_payment_date} onChange={set("next_payment_date")} disabled={saving} /></label>
      ) : null}
      {won.client_tenure ? <p className="rounded-[12px] bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-emerald-100">🔔 A renewal reminder goes on the owner&apos;s calendar on <b>{remindOn}</b>, 10 days before the plan ends on <b>{nice(won.client_tenure)}</b>. They also get a notification and an email that day.</p> : null}
    </div>
  );
}
