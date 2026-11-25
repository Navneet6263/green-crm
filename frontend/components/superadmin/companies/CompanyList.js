"use client";

import { useMemo, useState } from "react";
import { ACCESS_FEATURES, PLAN_OPTIONS, planOf } from "../../../app/super-admin/companies/company-config";
import { avatar, countLimitRoles, describeSmtp, getEnabledFeatureCount } from "../../../app/super-admin/companies/company-utils";
import { formatDate } from "../format";
import { Badge, INPUT_CLASS } from "../ui";

const STATUS_TONE = { active: "emerald", trial: "amber", suspended: "rose" };
export const PLAN_LABEL = { full: "Full CRM", tracking: "Tracking only", custom: "Custom" };
export const PLAN_TONE = { full: "teal", tracking: "violet", custom: "slate" };

/** Every tenant in one table: search, filter by status or plan, click a row to open it. */
export default function CompanyList({ companies, selectedId, onOpen }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return companies
      .map((c) => ({ ...c, plan: planOf(c.access) }))
      .filter((c) => (!q || [c.name, c.slug, c.admin_email, c.industry, c.company_id].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
        && (!status || c.status === status) && (!plan || c.plan === plan));
  }, [companies, query, status, plan]);

  return (
    <div className="rounded-[14px] bg-white ring-1 ring-slate-200">
      <div className="grid gap-2 border-b border-slate-100 p-3 sm:grid-cols-[minmax(0,1fr)_150px_150px]">
        <input className={INPUT_CLASS} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, slug, admin email or ID" />
        <select className={INPUT_CLASS} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Any status</option>
          {["active", "trial", "suspended"].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select className={INPUT_CLASS} value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Plan">
          <option value="">Any plan</option>
          {[...PLAN_OPTIONS.map((p) => p.key), "custom"].map((p) => <option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-[12.5px]">
          <thead className="text-[11px] uppercase tracking-wider text-slate-400">
            <tr>{["Company", "Plan", "Status", "Modules", "Seats", "Email", "Since"].map((h) => <th key={h} className="px-4 py-2.5 font-bold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((c) => {
              const seats = countLimitRoles(c.settings?.staff_limits);
              return (
                <tr key={c.company_id} onClick={() => onOpen(c.company_id)} className={`cursor-pointer transition ${selectedId === c.company_id ? "bg-brand-50/60" : "hover:bg-slate-50"}`}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-brand-700 text-[11px] font-bold text-white">{avatar(c.name)}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900">{c.name}</span>
                        <span className="block truncate text-[11px] text-slate-400">{c.slug} · {c.admin_email || c.company_id}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5"><Badge tone={PLAN_TONE[c.plan]}>{PLAN_LABEL[c.plan]}</Badge></td>
                  <td className="px-4 py-2.5"><Badge tone={STATUS_TONE[c.status] || "amber"}>{c.status || "trial"}</Badge></td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-600">{getEnabledFeatureCount(c.access)}/{ACCESS_FEATURES.length}</td>
                  <td className="px-4 py-2.5 text-slate-600">{seats ? `${seats} limited` : "Open"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{describeSmtp(c)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{formatDate(c.created_at)}</td>
                </tr>
              );
            })}
            {!rows.length ? <tr><td colSpan={7} className="px-4 py-10 text-center text-[13px] text-slate-500">No company matches.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <p className="border-t border-slate-100 px-4 py-2.5 text-[12px] text-slate-500">{rows.length} of {companies.length} companies · click a row to manage it</p>
    </div>
  );
}
