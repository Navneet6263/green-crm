"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../../../lib/api";
import { fullMoney, pendingOf } from "../workspace/customerConfig";

const MODES = [["upi", "UPI"], ["bank-transfer", "Bank transfer"], ["cash", "Cash"], ["cheque", "Cheque"], ["card", "Card"], ["other", "Other"]];
const FIELD = "h-10 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-[13.5px] text-slate-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50";
const todayIst = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);

/** Record money received from a customer. Pending, paid and the next due date update everywhere after. */
export default function RecordPaymentModal({ open, onClose, token, customer, suggested, onSaved }) {
  const pending = customer ? pendingOf(customer) : 0;
  const [form, setForm] = useState({ amount: "", mode: "upi", paid_on: todayIst(), reference: "", note: "", next_payment_date: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    setError("");
    setForm({ amount: suggested ? String(suggested) : pending ? String(pending) : "", mode: "upi", paid_on: todayIst(), reference: "", note: "", next_payment_date: customer?.next_payment_date ? String(customer.next_payment_date).slice(0, 10) : "" });
  }, [open, customer?.customer_id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);
  if (!open || !customer) return null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const amount = Number(form.amount || 0);
  const after = Math.max(0, pending - amount);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = { amount, mode: form.mode, paid_on: form.paid_on, reference: form.reference, note: form.note };
      if (form.next_payment_date || customer.next_payment_date) body.next_payment_date = after > 0 ? form.next_payment_date || null : null;
      const res = await apiRequest(`/customers/${encodeURIComponent(customer.customer_id)}/payments`, { method: "POST", body, token });
      onSaved?.(res);
      onClose();
    } catch (err) {
      setError(err.message || "The payment could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onClick={() => !busy && onClose()}>
      <form role="dialog" aria-label="Record payment" onSubmit={save} onClick={(e) => e.stopPropagation()} className="tw-buttons w-full max-w-[480px] overflow-hidden rounded-t-[18px] bg-white shadow-2xl sm:rounded-[18px]">
        <header className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-[16px] font-bold text-slate-900">Record payment</h2>
          <p className="text-[12.5px] text-slate-500">{customer.company_name} · {pending ? `${fullMoney(pending)} pending` : "Nothing pending"}</p>
        </header>
        <div className="space-y-3 px-5 py-4">
          <label className="block text-[12px] font-semibold text-slate-600">Amount received (₹)
            <input autoFocus type="number" min="1" step="0.01" required value={form.amount} onChange={set("amount")} className={`${FIELD} mt-1 text-[16px] font-bold`} />
          </label>
          {pending ? (
            <div className="flex flex-wrap gap-1.5">
              {[[pending, "Full pending"], [Math.round(pending / 2), "Half"], ...(suggested ? [[suggested, "Advance from lead"]] : [])].map(([v, name]) => (
                <button key={name} type="button" onClick={() => setForm((f) => ({ ...f, amount: String(v) }))} className="rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-semibold text-slate-600 hover:bg-slate-200">{name} · {fullMoney(v)}</button>
              ))}
            </div>
          ) : null}
          <div>
            <p className="mb-1 text-[12px] font-semibold text-slate-600">Paid by</p>
            <div className="grid grid-cols-3 gap-1.5">
              {MODES.map(([key, name]) => (
                <button key={key} type="button" aria-pressed={form.mode === key} onClick={() => setForm((f) => ({ ...f, mode: key }))}
                  className={`rounded-[10px] py-2 text-[12.5px] font-semibold ${form.mode === key ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>{name}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[12px] font-semibold text-slate-600">Date<input type="date" max={todayIst()} value={form.paid_on} onChange={set("paid_on")} className={`${FIELD} mt-1`} /></label>
            <label className="block text-[12px] font-semibold text-slate-600">Reference / UTR<input value={form.reference} onChange={set("reference")} maxLength={120} placeholder="Optional" className={`${FIELD} mt-1`} /></label>
          </div>
          <label className="block text-[12px] font-semibold text-slate-600">Note<input value={form.note} onChange={set("note")} maxLength={500} placeholder="Optional" className={`${FIELD} mt-1`} /></label>
          {after > 0 ? (
            <label className="block rounded-[10px] bg-amber-50 p-3 text-[12px] font-semibold text-amber-900 ring-1 ring-amber-100">
              {fullMoney(after)} will still be pending. When is the next payment due?
              <input type="date" value={form.next_payment_date} onChange={set("next_payment_date")} className={`${FIELD} mt-1.5`} />
            </label>
          ) : amount > 0 ? <p className="rounded-[10px] bg-emerald-50 px-3 py-2 text-[12.5px] font-semibold text-emerald-800">This clears everything pending.</p> : null}
          {error ? <p role="alert" className="text-[12.5px] text-rose-700">{error}</p> : null}
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-[10px] px-3 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
          <button type="submit" disabled={busy || !amount} className="rounded-[10px] bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{busy ? "Saving…" : `Save ${amount ? fullMoney(amount) : "payment"}`}</button>
        </footer>
      </form>
    </div>
  );
}
