"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Chip, HEALTH, P, STATUS_CHIP, ago, money, num, pct, titleize } from "./platform-ui";

const SORTS = {
  leads: (a, b) => b.leads_period - a.leads_period || b.leads_total - a.leads_total,
  won: (a, b) => b.won_value_period - a.won_value_period,
  people: (a, b) => b.users_active - a.users_active,
  seen: (a, b) => new Date(b.last_login_at || 0) - new Date(a.last_login_at || 0),
  newest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
  name: (a, b) => String(a.name).localeCompare(String(b.name)),
};
const HEADERS = [["name", "Company"], [null, "Health"], ["people", "People"], ["leads", "Leads"], ["won", "Won"], ["seen", "Last sign-in"], [null, "Modules"]];

/** Every tenant with its health and numbers for the period: search, filter by health or plan, sort by any number. */
export default function CompanyTable({ companies = [], days }) {
  const [search, setSearch] = useState("");
  const [health, setHealth] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("leads");
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies
      .filter((c) => (!q || `${c.name} ${c.slug || ""} ${c.industry || ""}`.toLowerCase().includes(q)) && (!health || c.health === health) && (!status || c.status === status))
      .sort(SORTS[sort]);
  }, [companies, search, health, status, sort]);
  const visible = showAll ? rows : rows.slice(0, 12);

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_130px]">
        <input className={P.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, slug or industry" />
        <select className={P.input} value={health} onChange={(e) => setHealth(e.target.value)} aria-label="Health">
          <option value="">Any health</option>
          {Object.entries(HEALTH).map(([key, h]) => <option key={key} value={key}>{h.label}</option>)}
        </select>
        <select className={P.input} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Plan status">
          <option value="">Any plan</option>
          {["active", "trial", "suspended"].map((s) => <option key={s} value={s}>{titleize(s)}</option>)}
        </select>
      </div>

      <div className="mt-3 overflow-x-auto rounded-[12px] ring-1 ring-slate-100">
        <table className="w-full min-w-[880px] text-left text-[12.5px]">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              {HEADERS.map(([key, label]) => (
                <th key={label} className="px-3 py-2.5 font-bold">
                  {key ? <button type="button" onClick={() => setSort(key)} className={`inline-flex items-center gap-1 uppercase ${sort === key ? "text-slate-800" : "hover:text-slate-700"}`}>{label}{sort === key ? " ↓" : ""}</button> : label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((c) => {
              const h = HEALTH[c.health] || HEALTH.quiet;
              return (
                <tr key={c.company_id} className="transition hover:bg-slate-50/70">
                  <td className="px-3 py-2.5">
                    <Link href="/super-admin/companies" className="font-semibold text-slate-900 hover:text-brand-700">{c.name}</Link>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Chip className={STATUS_CHIP[c.status] || STATUS_CHIP.trial}>{titleize(c.status)}</Chip>
                      {c.industry ? <span className="truncate">{c.industry}</span> : null}
                      <span>· since {new Date(c.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5"><span className="inline-flex items-center gap-1.5 font-semibold text-slate-700" title={h.text}><i className={`h-2 w-2 rounded-full ${h.dot}`} />{h.label}</span></td>
                  <td className="px-3 py-2.5">
                    <b className="tabular-nums text-slate-900">{num(c.users_active)}</b>
                    <span className="block text-[11px] text-slate-400">{num(c.users_seen_7d)} this week · {num(c.admins)} admin{c.admins === 1 ? "" : "s"}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <b className="tabular-nums text-slate-900">{num(c.leads_period)}</b>
                    <span className="block text-[11px] text-slate-400">{num(c.leads_total)} total · last {ago(c.last_lead_at)}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <b className="tabular-nums text-slate-900">{money(c.won_value_period)}</b>
                    <span className="block text-[11px] text-slate-400">{num(c.won_period)} deals</span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{ago(c.last_login_at)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-brand-600" style={{ width: `${pct(c.modules_on, c.modules_total)}%` }} /></span>
                      <span className="tabular-nums text-slate-500">{c.modules_on}/{c.modules_total}</span>
                    </div>
                    {c.developer_api ? <span className="mt-1 block text-[11px] font-semibold text-brand-700">Developer API on</span> : null}
                  </td>
                </tr>
              );
            })}
            {!visible.length ? <tr><td colSpan={7} className="px-3 py-10 text-center text-[13px] text-slate-500">No company matches.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12px] text-slate-500">
        <span>{rows.length} of {companies.length} companies · numbers for the last {days} days</span>
        {rows.length > 12 ? <button type="button" className={P.small} onClick={() => setShowAll((v) => !v)}>{showAll ? "Show fewer" : `Show all ${rows.length}`}</button> : null}
      </div>
    </div>
  );
}
