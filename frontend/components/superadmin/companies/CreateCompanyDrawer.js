"use client";

import { useState } from "react";
import SideDrawer from "../../ui/SideDrawer";
import { CREATE_FORM_GROUPS, PLAN_OPTIONS } from "../../../app/super-admin/companies/company-config";
import { INPUT_CLASS, Notice, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "../ui";

function Field({ field, value, onChange }) {
  const control = field.type === "select"
    ? <select className={INPUT_CLASS} value={value} onChange={(e) => onChange(field.key, e.target.value)}>{field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
    : <input className={INPUT_CLASS} type={field.type || "text"} value={value} onChange={(e) => onChange(field.key, e.target.value)} placeholder={field.placeholder} required={field.required} />;
  return (
    <label className={`block space-y-1 ${field.full ? "sm:col-span-2" : ""}`}>
      <span className="block text-[12px] font-semibold text-slate-600">{field.label}{field.required ? <span className="text-rose-500"> *</span> : null}</span>
      {control}
      {field.hint ? <span className="block text-[11px] text-slate-400">{field.hint}</span> : null}
    </label>
  );
}

function PlanCard({ plan, selected, onPick }) {
  return (
    <button type="button" onClick={onPick} aria-pressed={selected}
      className={`flex h-full flex-col rounded-[14px] p-4 text-left ring-1 transition ${selected ? "bg-brand-50 ring-2 ring-brand-600" : "bg-white ring-slate-200 hover:ring-brand-200"}`}>
      <span className="flex items-center justify-between gap-2">
        <span className="text-[15px] font-bold text-slate-900">{plan.label}</span>
        <span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${selected ? "border-brand-700 bg-brand-700" : "border-slate-300"}`}>
          {selected ? <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg> : null}
        </span>
      </span>
      <span className="mt-0.5 text-[12px] text-slate-500">{plan.tagline}</span>
      <ul className="mt-3 space-y-1.5">
        {plan.includes.map((item) => (
          <li key={item} className="flex gap-2 text-[12.5px] text-slate-700"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />{item}</li>
        ))}
      </ul>
    </button>
  );
}

/** New company: pick the plan, then the company and its first admin; mail settings are optional. */
export default function CreateCompanyDrawer({ open, onClose, form, onFieldChange, onSubmit, submitting, notice }) {
  const [showDelivery, setShowDelivery] = useState(false);
  const [basics, delivery] = CREATE_FORM_GROUPS;
  const plan = PLAN_OPTIONS.find((p) => p.key === form.plan) || PLAN_OPTIONS[0];

  return (
    <SideDrawer open={open} onClose={onClose} width="max-w-[720px]" title="New company" subtitle="Pick a plan, add the company and its first admin"
      footer={(
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px] text-slate-500">Plan: <b className="text-slate-800">{plan.label}</b>{plan.seats ? " · seats limited" : ""}</span>
          <div className="flex gap-2">
            <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={onClose}>Cancel</button>
            <button type="submit" form="create-company" className={PRIMARY_BUTTON_CLASS} disabled={submitting}>{submitting ? "Creating…" : "Create company"}</button>
          </div>
        </div>
      )}>
      <form id="create-company" onSubmit={onSubmit} className="space-y-4">
        <Notice tone={notice?.tone} text={notice?.text} />
        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">1. Plan</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {PLAN_OPTIONS.map((p) => <PlanCard key={p.key} plan={p} selected={form.plan === p.key} onPick={() => onFieldChange("plan", p.key)} />)}
          </div>
          <p className="mt-2 text-[12px] text-slate-500">You can upgrade later from the company&apos;s page. Their data stays as it is.</p>
        </section>

        <section className="rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">2. Company and first admin</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {basics.fields.map((f) => <Field key={f.key} field={f} value={form[f.key] ?? ""} onChange={onFieldChange} />)}
          </div>
        </section>

        <section className="rounded-[14px] bg-white ring-1 ring-slate-200">
          <button type="button" onClick={() => setShowDelivery((v) => !v)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
            <span><span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">3. Login link and email (optional)</span><span className="block text-[12px] text-slate-500">Leave closed to use GreenCRM&apos;s own mail.</span></span>
            <svg className={`h-4 w-4 text-slate-400 transition ${showDelivery ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          {showDelivery ? (
            <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2">
              {delivery.fields.map((f) => <Field key={f.key} field={f} value={form[f.key] ?? ""} onChange={onFieldChange} />)}
            </div>
          ) : null}
        </section>
      </form>
    </SideDrawer>
  );
}
