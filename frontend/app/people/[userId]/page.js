"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import EmailButton from "../../../components/email/EmailButton";
import { DownloadIcon } from "../../../components/reports/ReportDrawer";
import { ActivityCard, NotesCard, OverdueCard, PersonHeader } from "../../../components/reports/person/PersonSections";
import { FunnelWidget, KpiWidget, PaymentsWidget, ProductsWidget, SourcesWidget, TrendWidget } from "../../../components/dashboard/home/LeadWidgets";
import { RANGES, istToday, periodQuery, rangeFor, rangeText } from "../../../components/dashboard/home/widgetCatalog";
import { API_BASE, apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";
import { loadUsersForScope, resolveSessionCompanyId } from "../../../lib/teamScope";

const TEAM_ROLES = ["admin", "manager"];
const SELECT = "h-9 rounded-[10px] border border-slate-200 bg-white px-2.5 text-[13px] font-medium text-slate-800 outline-none focus:border-brand-400";

/** One person's report: the dashboard numbers for their leads, their activity, overdue follow-ups, Excel and (admins) email. */
export default function PersonReportPage() {
  const router = useRouter();
  const { userId } = useParams();
  const [session, setSession] = useState(null);
  const [preset, setPreset] = useState("all");
  const [custom, setCustom] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [people, setPeople] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const range = useMemo(() => rangeFor(preset, custom), [preset, custom]);
  const query = useMemo(() => new URLSearchParams(periodQuery(range)).toString(), [range]);

  useEffect(() => {
    const s = loadSession();
    if (!s) { router.replace(`/login?next=/people/${encodeURIComponent(userId)}`); return; }
    setSession(s);
  }, [router, userId]);

  useEffect(() => {
    if (!session?.token || !TEAM_ROLES.includes(session.user?.role)) return;
    loadUsersForScope(session.token, { companyId: resolveSessionCompanyId(session), pageSize: 300 }).then(setPeople).catch(() => setPeople([]));
  }, [session]);

  useEffect(() => {
    if (!session?.token) return undefined;
    let cancelled = false;
    setReport(null);
    setError("");
    apiRequest(`/reports/person/${encodeURIComponent(userId)}?${query}`, { token: session.token, fresh: true })
      .then((data) => { if (!cancelled) setReport(data); })
      .catch((err) => { if (!cancelled) setError(err.message || "The report could not load."); });
    return () => { cancelled = true; };
  }, [session?.token, userId, query]);

  async function download() {
    setDownloading(true);
    try {
      const response = await fetch(`${API_BASE}/reports/person/${encodeURIComponent(userId)}/excel?${query}`, { headers: { Authorization: `Bearer ${session.token}` }, cache: "no-store" });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "The Excel could not be created.");
      const url = URL.createObjectURL(await response.blob());
      const link = Object.assign(document.createElement("a"), { href: url, download: /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") || "")?.[1] || "GreenCRM-person-report.xlsx" });
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  }

  const w = report?.widgets || {};
  const person = report?.person;
  const canTeam = TEAM_ROLES.includes(session?.user?.role);

  return (
    <DashboardShell session={session} title="Person report" hideTitle heroStats={[]}>
      <div className="tw-buttons min-w-0 space-y-4 pb-10">
        {error ? <p role="alert" className="rounded-[12px] bg-rose-50 px-4 py-3 text-[13px] text-rose-700">{error}</p> : null}
        {person ? (
          <PersonHeader person={person} activity={report.activity} actions={(
            <>
              {canTeam && people.length ? (
                <select aria-label="Switch person" value={person.user_id} onChange={(e) => router.push(`/people/${encodeURIComponent(e.target.value)}`)} className={SELECT}>
                  {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
                </select>
              ) : null}
              <button type="button" onClick={download} disabled={downloading} className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-white px-3 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"><DownloadIcon />{downloading ? "Preparing…" : "Excel"}</button>
              <EmailButton session={session} label="Email report" kind="person" person={person} defaultTo={[person.user_id]} period={range.all ? { period: "all" } : { from: range.from, to: range.to }} />
            </>
          )} />
        ) : !error ? <div className="h-[104px] animate-pulse rounded-[14px] bg-white ring-1 ring-slate-200" /> : null}

        <section className="flex flex-wrap items-center gap-2 rounded-[14px] bg-white p-3 ring-1 ring-slate-200">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Period">
            {RANGES.map(([key, name]) => (
              <button key={key} type="button" aria-pressed={preset === key} onClick={() => { if (key === "custom") setCustom(custom || (range.all ? rangeFor("30d") : range)); setPreset(key); }}
                className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${preset === key ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{name}</button>
            ))}
          </div>
          {preset === "custom" && custom ? (
            <span className="flex items-center gap-1.5">
              <input type="date" aria-label="From date" max={istToday()} value={custom.from} onChange={(e) => e.target.value && setCustom({ ...custom, from: e.target.value })} className={SELECT} />
              <span className="text-[12px] text-slate-400">to</span>
              <input type="date" aria-label="To date" max={istToday()} value={custom.to} onChange={(e) => e.target.value && setCustom({ ...custom, to: e.target.value })} className={SELECT} />
            </span>
          ) : null}
          <span className="ml-auto text-[12.5px] text-slate-500">{rangeText(range)}</span>
        </section>

        <KpiWidget state={w.kpis || (report ? { error: "Not available" } : null)} range={range} canTeam showMoney={Boolean(w.payments)} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {report ? <div className="min-w-0"><OverdueCard overdue={report.overdue} session={session} person={person} /></div> : null}
          {report ? <div className="min-w-0"><ActivityCard activity={report.activity} range={range} /></div> : null}
          {w.sources ? <div className="min-w-0"><SourcesWidget state={w.sources} range={range} /></div> : null}
          {w.trend ? <div className="min-w-0"><TrendWidget state={w.trend} /></div> : null}
          {w.funnel ? <div className="min-w-0"><FunnelWidget state={w.funnel} range={range} /></div> : null}
          {w.payments ? <div className="min-w-0"><PaymentsWidget state={w.payments} /></div> : null}
          {w.products ? <div className="min-w-0"><ProductsWidget state={w.products} /></div> : null}
          {report ? <div className="min-w-0"><NotesCard notes={report.recent_notes || []} /></div> : null}
        </div>
      </div>
    </DashboardShell>
  );
}
