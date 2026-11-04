"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "./ContactList";

function Fact({ label, value, copy }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="min-w-0 rounded-[10px] bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
      <p className="text-[11px] font-semibold text-slate-400">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <p className={`truncate text-[13px] font-medium ${value ? "text-slate-800" : "text-slate-400"}`}>{value || "Not on file"}</p>
        {copy && value ? (
          <button type="button" title={`Copy ${label.toLowerCase()}`} aria-label={`Copy ${label.toLowerCase()}`}
            onClick={() => navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200); })}
            className="shrink-0 text-[11px] font-semibold text-slate-400 hover:text-brand-700">{copied ? "Copied" : "Copy"}</button>
        ) : null}
      </div>
    </div>
  );
}

/** Who you are writing to: name, company, status, owner and how to reach them. */
export default function ContactHeader({ record, onBack }) {
  const href = record.entity_type === "lead" ? `/leads/${encodeURIComponent(record.entity_id)}` : `/customers/${encodeURIComponent(record.entity_id)}`;
  return (
    <div className="border-b border-slate-100 bg-white px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3">
        {onBack ? <button type="button" onClick={onBack} aria-label="Back to contacts" className="-ml-1 mt-2 grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-slate-500 hover:bg-slate-100 lg:hidden">‹</button> : null}
        <Avatar record={record} size="h-12 w-12 text-[15px]" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-[17px] font-bold text-slate-900">{record.title}</h2>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${record.entity_type === "lead" ? "bg-sky-50 text-sky-700" : "bg-violet-50 text-violet-700"}`}>{record.entity_type === "lead" ? "Lead" : "Customer"}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{record.status}</span>
          </div>
          <p className="truncate text-[13px] text-slate-500">{record.subtitle} · Owner {record.owner}{record.product && !/^No product/.test(record.product) ? ` · ${record.product}` : ""}</p>
        </div>
        <Link href={href} prefetch={false} className="hidden shrink-0 rounded-[10px] px-3 py-2 text-[12.5px] font-semibold text-brand-700 ring-1 ring-slate-200 hover:bg-slate-50 sm:inline-flex">Open {record.entity_type}</Link>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Fact label="Email" value={record.email} copy />
        <Fact label="Phone" value={record.phone} copy />
      </div>
    </div>
  );
}
