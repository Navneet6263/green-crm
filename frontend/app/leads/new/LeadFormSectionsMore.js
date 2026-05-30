"use client";

import { T, Label, SectionCard } from "./lead-form-tokens";

export function LeadFormSection2({ form, errors, INDUSTRY_OPTIONS, LEAD_SOURCE_OPTIONS, PRIORITY_OPTIONS, minimumDateTime, onChange }) {
  return (
    <SectionCard step="02" title="Lead Details" sub="Source, priority, value, financials, follow-up">
      <Label label="Industry">
        <select className={T.input} value={form.industry} onChange={e => onChange("industry", e.target.value)}>
          {INDUSTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Label>
      <Label label="Lead Source">
        <select className={T.input} value={form.lead_source} onChange={e => onChange("lead_source", e.target.value)}>
          {LEAD_SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Label>
      {form.lead_source === "other" ? (
        <Label label="Custom Source" error={errors.custom_lead_source} span="sm:col-span-2">
          <input className={T.input} value={form.custom_lead_source} onChange={e => onChange("custom_lead_source", e.target.value)} />
        </Label>
      ) : null}
      <Label label="Priority">
        <select className={T.input} value={form.priority} onChange={e => onChange("priority", e.target.value)}>
          {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Label>
      <Label label="Estimated Value (₹)">
        <input className={T.input} type="number" value={form.estimated_value} onChange={e => onChange("estimated_value", e.target.value)} placeholder="50000" />
      </Label>
      <Label label="Number of Units" error={errors.number_of_units}>
        <input className={T.input} type="number" min={0} step={1} value={form.number_of_units} onChange={e => onChange("number_of_units", e.target.value)} placeholder="25" />
      </Label>
      <Label label="Follow-up Date">
        <input className={T.input} type="datetime-local" min={minimumDateTime} value={form.follow_up_date} onChange={e => onChange("follow_up_date", e.target.value)} />
      </Label>

      {/* Financial Fields */}
      <Label label="Advance Received (₹)">
        <input className={T.input} type="number" value={form.advance_received} onChange={e => onChange("advance_received", e.target.value)} placeholder="30000" />
      </Label>
      <Label label="Remaining Payment (₹)">
        <input className={T.input} type="number" value={Number(form.estimated_value || 0) - Number(form.advance_received || 0)} disabled placeholder="20000" />
      </Label>

      <Label label="Requirements / Notes" span="sm:col-span-2">
        <textarea className={`${T.input} min-h-[100px] resize-y`} rows={3} value={form.requirements} onChange={e => onChange("requirements", e.target.value)} placeholder="Describe the requirement, urgency, or product expectation…" />
      </Label>
    </SectionCard>
  );
}

export function LeadFormSection3({ form, onChange }) {
  return (
    <SectionCard step="03" title="Location" sub="Address details for account context">
      <Label label="Street Address" span="sm:col-span-2">
        <input className={T.input} value={form.address_street} onChange={e => onChange("address_street", e.target.value)} placeholder="123 Business Park" />
      </Label>
      <Label label="City"><input className={T.input} value={form.address_city} onChange={e => onChange("address_city", e.target.value)} placeholder="Mumbai" /></Label>
      <Label label="State"><input className={T.input} value={form.address_state} onChange={e => onChange("address_state", e.target.value)} placeholder="Maharashtra" /></Label>
      <Label label="Postal Code"><input className={T.input} value={form.address_zip} onChange={e => onChange("address_zip", e.target.value)} placeholder="400001" /></Label>
      <Label label="Country"><input className={T.input} value={form.address_country} onChange={e => onChange("address_country", e.target.value)} placeholder="India" /></Label>
    </SectionCard>
  );
}
