"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import CompanyTable from "./dashboard/CompanyTable";
import GrowthChart from "./dashboard/GrowthChart";
import { ActivityPanels, AdoptionPanel, AttentionPanel, HealthPanel, MixPanel } from "./dashboard/PlatformPanels";
import { COLORS, P, Panel, Spark, money, num, pct } from "./dashboard/platform-ui";

const RANGES = [[7, "7 days"], [30, "30 days"], [90, "90 days"]];

function Stat({ label, value, hint, color, spark, href }) {
  const body = (
    <>
      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500"><i className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</p>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <p className="min-w-0 break-words text-[19px] font-bold leading-tight tabular-nums tracking-tight text-slate-900 sm:text-[24px] sm:leading-none">{value}</p>
        <span className="hidden sm:block"><Spark values={spark} color={color} /></span>
      </div>
      {hint ? <p className="mt-1.5 truncate text-[11.5px] text-slate-500">{hint}</p> : null}
    </>
  );
  const cls = "block rounded-[14px] bg-white px-4 py-3.5 ring-1 ring-slate-200 transition";
  return href ? <Link href={href} className={`${cls} hover:ring-brand-200`}>{body}</Link> : <div className={cls}>{body}</div>;
}

/** The platform console home: growth, every company's health, module use and what needs attention. */
export default function SuperAdminDashboardContent({ session }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isSuper = session?.user?.role === "super-admin";

  const load = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError("");
    try {
      setData(await apiRequest(`/super-admin/overview?days=${days}`, { token: session.token, fresh: true }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session?.token, days]);

  useEffect(() => { load(); }, [load]);

  const t = data?.totals || {};
  const series = data?.series || [];
  const spark = (key) => series.map((p) => p[key]);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="tw-buttons min-w-0 space-y-4 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-3 pt-1">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-slate-500">{greeting}, {String(session?.user?.name || "").split(" ")[0] || "there"}</p>
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Platform overview</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">Every company on GreenCRM: growth, health and what needs a look.{data?.generated_at ? ` Updated ${new Date(data.generated_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}.` : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-[10px] bg-slate-100 p-0.5">
            {RANGES.map(([value, label]) => (
              <button key={value} type="button" onClick={() => setDays(value)} aria-pressed={days === value}
                className={`rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold transition ${days === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{label}</button>
            ))}
          </div>
          <button type="button" className={P.small} onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
          <Link href="/super-admin/companies" className="inline-flex h-8 items-center rounded-[8px] bg-brand-700 px-3 text-[12px] font-semibold text-white hover:bg-brand-800">Companies</Link>
        </div>
      </header>

      {error ? <p className="rounded-[12px] bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-800 ring-1 ring-rose-100">{error}</p> : null}

      {!data && loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <div key={i} className={`${P.panel} h-[104px] animate-pulse`} />)}</div>
      ) : data ? (
        <>
          <div className={`grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6 ${loading ? "opacity-60" : ""}`}>
            <Stat label="Companies" value={num(t.companies)} hint={`${num(t.companies_active)} active · ${num(t.companies_trial)} trial · +${num(t.companies_new)} new`} color={COLORS[3]} spark={spark("companies")} href="/super-admin/companies" />
            <Stat label="People" value={num(t.users_active)} hint={`${num(t.users_seen_7d)} signed in this week (${pct(t.users_seen_7d, t.users_active)}%)`} color={COLORS[4]} spark={spark("users")} href="/super-admin/users" />
            <Stat label="New leads" value={num(t.leads_new)} hint={`${num(t.leads)} leads in total`} color={COLORS[0]} spark={spark("leads")} />
            <Stat label="Won value" value={money(t.won_value)} hint={`${num(t.leads_won)} deals won`} color={COLORS[1]} spark={spark("won")} />
            <Stat label="Customers" value={num(t.customers)} hint={t.developer_companies ? `${num(t.developer_companies)} companies use the API` : "Across all companies"} color={COLORS[2]} />
            <Stat label="Overdue tasks" value={num(t.tasks_overdue)} hint={`${num(t.tasks_pending)} open tasks`} color={COLORS[5]} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <Panel title="Growth" subtitle={`Per day, last ${data.days} days`}>
              <GrowthChart series={series} />
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-4">
                {[
                  ["Leads per day", num(Math.round((t.leads_new || 0) / Math.max(1, data.days)))],
                  ["Win rate", `${pct(t.leads_won, t.leads_new)}%`],
                  ["New people", num(t.users_new)],
                  ["New companies", num(t.companies_new)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[10px] bg-slate-50 px-3 py-2 ring-1 ring-slate-100"><p className="truncate text-[11px] text-slate-500">{label}</p><p className="text-[16px] font-bold tabular-nums text-slate-900">{value}</p></div>
                ))}
              </div>
            </Panel>
            <AttentionPanel data={data} />
          </div>

          <Panel title="Companies" subtitle="Who is using GreenCRM and who has gone quiet">
            <CompanyTable companies={data.companies} days={data.days} />
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <HealthPanel health={data.health} total={data.companies.length} />
            <MixPanel roles={data.roles} sources={data.sources} days={data.days} />
            <AdoptionPanel adoption={data.adoption} total={data.companies.length} />
          </div>

          {data.developer && (data.developer.api_7d || data.developer.capture_7d) ? (
            <div className={`${P.panel} flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-[12.5px] text-slate-600`}>
              <span className="font-bold text-slate-900">Developer API · last 7 days</span>
              <span><b className="text-slate-900">{num(data.developer.api_7d)}</b> API calls</span>
              <span><b className="text-slate-900">{num(data.developer.capture_7d)}</b> lead-link posts</span>
              <span><b className={data.developer.failed_7d ? "text-rose-700" : "text-slate-900"}>{num(data.developer.failed_7d)}</b> failed</span>
              <span><b className="text-slate-900">{num(t.developer_companies)}</b> companies switched on</span>
            </div>
          ) : null}

          {isSuper ? <ActivityPanels demos={data.demos} audit={data.audit} /> : null}
        </>
      ) : null}
    </div>
  );
}
