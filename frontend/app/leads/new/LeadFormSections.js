"use client";

import Link from "next/link";
import DashboardIcon from "../../../components/dashboard/icons";
import { T, Label, SectionCard } from "./lead-form-tokens";
import { teamBadgeLabel, teamSelectLabel } from "../../../lib/teamScope";

export function LeadFormHeader({ selectedCompany, selectedTeam, selectedProduct, selectedAssignee, isPlatformConsole, session, form }) {
  const avLetter = (form.contact_person || form.company_name || "L").slice(0, 1).toUpperCase();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className={T.kicker}>Lead Intake</p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">Create New Lead</h1>
        <p className="mt-0.5 text-sm text-slate-400">Capture the opportunity, map the product, assign the owner.</p>
      </div>
    </div>
  );
}

export function LeadPreviewStrip({ form, selectedProduct, selectedTeam, selectedAssignee, session, isPlatformConsole }) {
  const avLetter = (form.contact_person || form.company_name || "L").slice(0, 1).toUpperCase();
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-white px-5 py-4">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-600 text-sm font-bold text-white">{avLetter}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-900">{form.contact_person || "Contact name"}</p>
        <p className="truncate text-xs text-slate-400">{form.company_name || "Company name"}{form.email ? ` · ${form.email}` : ""}</p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {selectedProduct ? <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 font-semibold text-amber-800">{selectedProduct.name}</span> : null}
        {selectedTeam ? <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-600">{teamBadgeLabel(selectedTeam)}</span> : null}
        {form.estimated_value ? <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 font-semibold text-emerald-700">₹{Number(form.estimated_value).toLocaleString("en-IN")}</span> : null}
      </div>
    </div>
  );
}

export function LeadFormSection1({ form, errors, companies, teams, assignableUsers, products: filteredProducts, isPlatformConsole, canAssign, teamSelectorVisible, teamSelectionPending, resourceLoading, teamAssignment, ownerHelperMessage, productHelperMessage, canOpenTeamWorkspace, onChange }) {
  return (
    <SectionCard step="01" title="Identity & Ownership" sub="Contact, company, team, product, and owner">
      {isPlatformConsole ? (
        <Label label="Company (Tenant)" error={errors.company_id} span="sm:col-span-2" fieldId="company_id">
          <select className={T.input} value={form.company_id} onChange={e => onChange("company_id", e.target.value)}>
            <option value="">Select company</option>
            {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.name}</option>)}
          </select>
        </Label>
      ) : null}

      <Label label="Contact Person *" error={errors.contact_person} fieldId="contact_person">
        <input className={T.input} value={form.contact_person} onChange={e => onChange("contact_person", e.target.value)} placeholder="John Doe" />
      </Label>
      <Label label="Company Name *" error={errors.company_name} fieldId="company_name">
        <input className={T.input} value={form.company_name} onChange={e => onChange("company_name", e.target.value)} placeholder="Acme Corp" />
      </Label>
      <Label label="Email *" error={errors.email} fieldId="email">
        <input className={T.input} type="email" value={form.email} onChange={e => onChange("email", e.target.value)} placeholder="john@acme.com" />
      </Label>
      <Label label="Phone *" error={errors.phone} fieldId="phone">
        <input className={T.input} value={form.phone} onChange={e => onChange("phone", e.target.value)} placeholder="+91 98765 43210" />
      </Label>

      {teamSelectorVisible ? (
        <Label label="Team" error={errors.team_id} hint={teamAssignment.description} fieldId="team_id">
          <select className={T.input} value={form.team_id} onChange={e => onChange("team_id", e.target.value)}>
            <option value="">Select team</option>
            {teams.map(t => <option key={t.team_id} value={t.team_id}>{teamSelectLabel(t)}</option>)}
          </select>
        </Label>
      ) : null}

      <Label label="Product / Service *" error={errors.product_id} hint={productHelperMessage} fieldId="product_id">
        <select className={T.input} value={form.product_id} onChange={e => onChange("product_id", e.target.value)} disabled={resourceLoading || teamSelectionPending}>
          <option value="">Choose product</option>
          {filteredProducts.map(p => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
        </select>
      </Label>

      {canAssign ? (
        <Label label="Assign Owner" error={errors.assigned_to} hint={ownerHelperMessage} fieldId="assigned_to">
          <select className={T.input} value={form.assigned_to} onChange={e => onChange("assigned_to", e.target.value)} disabled={resourceLoading || teamSelectionPending}>
            <option value="">Keep with me</option>
            {assignableUsers.map(u => <option key={u.user_id} value={u.user_id}>{u.name} · {u.role}</option>)}
          </select>
        </Label>
      ) : null}

      {teamAssignment.mode === "none" && canOpenTeamWorkspace ? (
        <div className="sm:col-span-2">
          <Link href="/settings/teams" className={T.ghost}>
            <DashboardIcon name="users" className="h-4 w-4" />Open Teams
          </Link>
        </div>
      ) : null}
    </SectionCard>
  );
}

export function LeadFormSection2({ form, errors, INDUSTRY_OPTIONS, LEAD_SOURCE_OPTIONS, PRIORITY_OPTIONS, minimumDateTime, onChange }) {
  return (
    <SectionCard step="02" title="Lead Details" sub="Source, priority, value, follow-up">
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
