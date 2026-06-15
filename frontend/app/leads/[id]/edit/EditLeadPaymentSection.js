import { T } from "./edit-lead-tokens";

export function EditPaymentSection({ form, onChange }) {
  return (
    <article className={T.panel}>
      <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-600">₹</span>
        <div>
          <h3 className="text-base font-bold text-slate-900">Payment Details</h3>
          <p className="text-xs text-slate-500">Amounts, mode, and subscription dates</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className={T.kicker}>Advance Received (₹)</span>
          <input className={T.input} type="number" value={form.advance_received} onChange={(e) => onChange("advance_received", e.target.value)} placeholder="0" />
        </label>
        <label className="space-y-2">
          <span className={T.kicker}>Remaining Payment (₹)</span>
          <input className={T.input} type="number" value={Number(form.estimated_value || 0) - Number(form.advance_received || 0)} disabled placeholder="0" />
        </label>

        <label className="space-y-2">
          <span className={T.kicker}>Mode of Payment</span>
          <select className={T.input} value={form.payment_mode || ""} onChange={(e) => onChange("payment_mode", e.target.value)}>
            <option value="">Select payment mode</option>
            <option value="upi">UPI</option>
            <option value="credit_debit_card">Credit/Debit Card</option>
            <option value="neft_company">NEFT/Company Account</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className={T.kicker}>Payment Received Date</span>
          <input className={T.input} type="date" value={form.payment_date ? String(form.payment_date).split('T')[0] : ""} onChange={(e) => onChange("payment_date", e.target.value)} />
        </label>

        <label className="space-y-2">
          <span className={T.kicker}>Subscription Start Date</span>
          <input className={T.input} type="date" value={form.subscription_start_date ? String(form.subscription_start_date).split('T')[0] : ""} onChange={(e) => onChange("subscription_start_date", e.target.value)} />
        </label>

        <label className="space-y-2">
          <span className={T.kicker}>Client Tenure (End Date)</span>
          <div className="flex gap-2">
            <select 
              className={T.input} 
              style={{ width: '130px', flexShrink: 0 }} 
              onChange={(e) => {
                const months = parseInt(e.target.value, 10);
                if (months) {
                  const d = form.subscription_start_date ? new Date(form.subscription_start_date) : new Date();
                  d.setMonth(d.getMonth() + months);
                  const yyyy = d.getFullYear();
                  const mm = String(d.getMonth() + 1).padStart(2, '0');
                  const dd = String(d.getDate()).padStart(2, '0');
                  onChange("client_tenure", `${yyyy}-${mm}-${dd}`);
                }
              }}
            >
              <option value="">Custom</option>
              <option value="1">1 Month</option>
              <option value="3">3 Months</option>
              <option value="6">6 Months</option>
              <option value="12">12 Months</option>
            </select>
            <input 
              className={T.input} 
              type="date" 
              value={form.client_tenure ? String(form.client_tenure).split('T')[0] : ""} 
              onChange={(e) => onChange("client_tenure", e.target.value)} 
            />
          </div>
        </label>

        <label className="space-y-2">
          <span className={T.kicker}>Next Payment Date</span>
          <input className={T.input} type="date" value={form.next_payment_date ? String(form.next_payment_date).split('T')[0] : ""} onChange={(e) => onChange("next_payment_date", e.target.value)} />
        </label>
      </div>
    </article>
  );
}
