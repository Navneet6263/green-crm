"use client";

import Link from "next/link";
import { colorFor } from "../../dashboard/home/widgetCatalog";
import { telHref, whatsappHref } from "../../leads/workspace/LeadsTable";
import { HEALTH, day, titleize } from "../workspace/customerConfig";

const initials = (t) => String(t || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const BTN = "inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-white px-3 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50";

/** Top of the customer page: who they are, how healthy the account is, and the main actions. */
export default function CustomerHeader({ customer, health, canEdit, onPayment, onLog }) {
  const h = HEALTH[health?.level] || HEALTH.inactive;
  return (
    <section className="rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start gap-4">
        <Link href="/customers" prefetch={false} aria-label="Back to customers" className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50">‹</Link>
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-[18px] font-bold text-white" style={{ background: colorFor(customer.customer_id) }}>{initials(customer.company_name || customer.name)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[20px] font-bold tracking-tight text-slate-900">{customer.company_name || customer.name}</h1>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${customer.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{titleize(customer.status || "active")}</span>
            {customer.product_name ? <span className="rounded-full bg-gold-50 px-2 py-0.5 text-[11px] font-semibold text-gold-800">{customer.product_name}</span> : null}
          </div>
          <p className="mt-0.5 text-[13px] text-slate-500">{[customer.name, customer.phone, customer.email].filter(Boolean).join(" · ")}</p>
          <p className="mt-1 text-[12px] text-slate-500">Owner <b className="font-semibold text-slate-700">{customer.assigned_to_name || "Unassigned"}</b>{customer.team_name ? ` · ${customer.team_name}` : ""} · customer since {day(customer.created_at)}{customer.converted_from_lead_id ? <> · <Link href={`/leads/${customer.converted_from_lead_id}`} prefetch={false} className="font-semibold text-brand-700 hover:underline">from lead</Link></> : null}</p>
        </div>
        <div className={`rounded-[12px] px-3 py-2 ring-1 ${h.tone}`} title={(health?.reasons || []).join(" · ")}>
          <p className="flex items-center gap-1.5 text-[12px] font-bold"><span className={`h-2 w-2 rounded-full ${h.dot}`} />{h.label}{health?.score !== null && health?.score !== undefined ? ` · ${health.score}/100` : ""}</p>
          <p className="mt-0.5 max-w-[240px] text-[11.5px] opacity-80">{health?.reasons?.length ? health.reasons.join(" · ") : "Nothing needs attention"}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
        {customer.phone ? <a href={telHref(customer.phone)} className={BTN}>Call</a> : null}
        {customer.phone ? <a href={whatsappHref(customer.phone)} target="_blank" rel="noreferrer" className={BTN}>WhatsApp</a> : null}
        <Link href={`/email?tab=write&entity=customer&id=${encodeURIComponent(customer.customer_id)}`} prefetch={false} className={BTN}>Email</Link>
        {canEdit ? <button type="button" onClick={onLog} className={BTN}>Log activity</button> : null}
        {canEdit ? <Link href={`/customers/${customer.customer_id}/edit`} prefetch={false} className={BTN}>Edit</Link> : null}
        {canEdit ? <button type="button" onClick={onPayment} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-emerald-600 px-3.5 text-[13px] font-semibold text-white shadow-sm hover:bg-emerald-700">+ Record payment</button> : null}
      </div>
    </section>
  );
}
