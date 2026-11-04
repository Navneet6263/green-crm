"use client";

import { useEffect, useState } from "react";
import { colorFor } from "../dashboard/home/widgetCatalog";

export const initials = (text) => String(text || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export function Avatar({ record, size = "h-10 w-10 text-[13px]" }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${size}`} style={{ background: colorFor(record.key) }} aria-hidden="true">
      {initials(record.title)}
    </span>
  );
}

const FILTERS = [["all", "All"], ["lead", "Leads"], ["customer", "Customers"]];
const STEP = 40;

/** Left pane: every lead and customer you can reach, searchable, newest picks stay highlighted. */
export default function ContactList({ w }) {
  const [visible, setVisible] = useState(STEP);
  useEffect(() => setVisible(STEP), [w.search, w.entityFilter]);
  const counts = { all: w.records.length, lead: w.leads.length, customer: w.customers.length };
  const rows = w.filteredRecords.slice(0, visible);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2.5 border-b border-slate-100 p-3">
        <label className="flex h-10 items-center gap-2 rounded-[10px] border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-brand-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-50">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={w.search} onChange={(e) => w.setSearch(e.target.value)} placeholder="Search name, company, email, phone" aria-label="Search contacts"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400" />
        </label>
        <div className="grid grid-cols-3 gap-1 rounded-[10px] bg-slate-100 p-1" role="group" aria-label="Show">
          {FILTERS.map(([key, name]) => (
            <button key={key} type="button" aria-pressed={w.entityFilter === key} onClick={() => w.setEntityFilter(key)}
              className={`rounded-[8px] py-1.5 text-[12.5px] font-semibold ${w.entityFilter === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
              {name} <span className="text-slate-400">{counts[key]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length ? (
          <ul className="p-1.5">
            {rows.map((r) => {
              const active = w.selectedKey === r.key;
              return (
                <li key={r.key}>
                  <button type="button" onClick={() => w.setSelectedKey(r.key)} aria-current={active ? "true" : undefined}
                    className={`flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition ${active ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-slate-50"}`}>
                    <Avatar record={r} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13.5px] font-semibold text-slate-900">{r.title}</span>
                        <span className={`shrink-0 rounded-full px-1.5 py-px text-[10.5px] font-bold ${r.entity_type === "lead" ? "bg-sky-50 text-sky-700" : "bg-violet-50 text-violet-700"}`}>{r.entity_type === "lead" ? "Lead" : "Customer"}</span>
                      </span>
                      <span className="flex items-center justify-between gap-2 text-[12px] text-slate-500">
                        <span className="truncate">{r.subtitle}</span>
                        <span className="flex shrink-0 items-center gap-1" aria-label={`${r.email ? "has email" : "no email"}, ${r.phone ? "has phone" : "no phone"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${r.email ? "bg-emerald-500" : "bg-slate-300"}`} title={r.email ? "Email on file" : "No email"} />
                          <span className={`h-1.5 w-1.5 rounded-full ${r.phone ? "bg-sky-500" : "bg-slate-300"}`} title={r.phone ? "Phone on file" : "No phone"} />
                          <span className="ml-1 text-[11px] text-slate-400">{r.status}</span>
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : <p className="px-4 py-10 text-center text-[13px] text-slate-400">{w.search ? "No one matches your search." : "No leads or customers yet."}</p>}
        {w.filteredRecords.length > visible ? (
          <div className="p-3 pt-0"><button type="button" onClick={() => setVisible((v) => v + STEP)} className="w-full rounded-[10px] py-2 text-[12.5px] font-semibold text-brand-700 hover:bg-slate-50">Show more ({w.filteredRecords.length - visible} left)</button></div>
        ) : null}
      </div>
      <p className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400"><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />email <span className="ml-2 mr-1 inline-block h-1.5 w-1.5 rounded-full bg-sky-500" />phone on file</p>
    </div>
  );
}
