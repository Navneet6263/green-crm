"use client";

import { useState } from "react";
import DeleteLeadDialog from "../DeleteLeadDialog";
import { formatDay } from "../workspace/leadWorkspaceConfig";

const longDate = { day: "numeric", month: "short", year: "numeric" };
const nice = (v) => String(v || "").replace(/_/g, "-").split("-").filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1)).join(" ");

export function Row({ name, children }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 text-[13px]">
      <dt className="shrink-0 text-slate-500">{name}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-slate-800">{children}</dd>
    </div>
  );
}

/** The lead's contact and company facts, and the requirement. */
export default function LeadDetailsCard({ lead, token, canDelete, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  return (
    <section className="rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
      <h2 className="pb-1 text-[12px] font-bold uppercase tracking-wider text-slate-500">Details</h2>
      <dl className="divide-y divide-slate-100">
        <Row name="Contact person">{lead.contact_person}</Row>
        <Row name="Phone">{lead.phone}</Row>
        <Row name="Email">{lead.email}</Row>
        <Row name="Source">{nice(lead.lead_source)}</Row>
        <Row name="Industry">{lead.industry}</Row>
        <Row name="Location">{[lead.address_street, lead.address_city, lead.address_state, lead.address_zip].filter(Boolean).join(", ")}</Row>
        <Row name="Units">{lead.number_of_units}</Row>
        <Row name="Employees">{lead.no_of_employees}</Row>
        <Row name="Active users">{lead.active_users}</Row>
        <Row name="Created">{`${formatDay(lead.created_at, longDate)}${lead.created_by_name ? ` · ${lead.created_by_name}` : ""}`}</Row>
        <Row name="Last changed">{formatDay(lead.updated_at, longDate)}</Row>
        <Row name="Lead ID">{lead.lead_id}</Row>
      </dl>
      {lead.requirements ? (
        <div className="mt-2 rounded-[10px] bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Requirement</p>
          <p className="mt-0.5 whitespace-pre-line text-[13px] leading-relaxed text-slate-700">{lead.requirements}</p>
        </div>
      ) : null}
      {canDelete ? (
        <>
          <button type="button" onClick={() => setDeleting(true)} className="mt-3 w-full rounded-[10px] py-2 text-[12.5px] font-semibold text-rose-600 ring-1 ring-rose-100 hover:bg-rose-50">Delete this lead</button>
          <DeleteLeadDialog open={deleting} lead={lead} token={token} onClose={() => setDeleting(false)} onDone={onDeleted} />
        </>
      ) : null}
    </section>
  );
}
