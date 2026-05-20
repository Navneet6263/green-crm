import { T } from "./edit-lead-tokens";

export function EditPipelineSection({ form, productChoices, teamSelectionPending, productEmptyMessage, onChange }) {
  return (
    <article className={T.panel}>
      <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-blue-200 bg-blue-50 text-sm font-bold text-blue-600">2</span>
        <div>
          <h3 className="text-base font-bold text-slate-900">Pipeline Details</h3>
          <p className="text-xs text-slate-500">Status, workflow, and value</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className={T.kicker}>Status</span>
          <select className={T.input} value={form.status} onChange={(e) => onChange("status", e.target.value)}>
            <option value="new">New</option>
            <option value="pending">Pending</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="proposal">Proposal</option>
            <option value="negotiation">Negotiation</option>
            <option value="booked-demo">Booked Demo</option>
            <option value="demo-done">Demo Done</option>
            <option value="trial-started">Trial Started</option>
            <option value="closed-won">Closed Won</option>
            <option value="closed-lost">Closed Lost</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className={T.kicker}>Priority</span>
          <select className={T.input} value={form.priority} onChange={(e) => onChange("priority", e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className={T.kicker}>Workflow Stage</span>
          <select className={T.input} value={form.workflow_stage} onChange={(e) => onChange("workflow_stage", e.target.value)}>
            <option value="sales">Sales</option>
            <option value="legal">Legal</option>
            <option value="finance">Finance</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className={T.kicker}>Product</span>
          <select className={T.input} value={form.product_id} onChange={(e) => onChange("product_id", e.target.value)} disabled={teamSelectionPending} required>
            <option value="">Select product</option>
            {productChoices.map((product) => (
              <option key={product.product_id} value={product.product_id}>
                {product.name}
              </option>
            ))}
          </select>
          {productEmptyMessage ? <small className="text-xs font-medium text-slate-500">{productEmptyMessage}</small> : null}
        </label>
        <label className="space-y-2">
          <span className={T.kicker}>Estimated Value</span>
          <input className={T.input} type="number" value={form.estimated_value} onChange={(e) => onChange("estimated_value", e.target.value)} placeholder="0" />
        </label>
        <label className="space-y-2">
          <span className={T.kicker}>Number of Units</span>
          <input className={T.input} type="number" min="0" step="1" value={form.number_of_units} onChange={(e) => onChange("number_of_units", e.target.value)} placeholder="0" />
        </label>
        <label className="space-y-2">
          <span className={T.kicker}>Follow-up Date</span>
          <input className={T.input} type="date" value={form.follow_up_date?.split('T')[0] || ''} onChange={(e) => onChange("follow_up_date", e.target.value)} />
        </label>
        <label className="space-y-2">
          <span className={T.kicker}>Follow-up Time (Optional)</span>
          <input className={T.input} type="time" value={form.follow_up_date?.split('T')[1]?.substring(0, 5) || ''} onChange={(e) => {
            const date = form.follow_up_date?.split('T')[0] || '';
            onChange("follow_up_date", date && e.target.value ? `${date}T${e.target.value}` : date);
          }} />
        </label>
      </div>
    </article>
  );
}
