"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../../components/dashboard/DashboardShell";
import SimpleView, { StatRow } from "../../components/updates/SimpleView";
import AdvancedView from "../../components/updates/AdvancedView";
import ReportDrawer, { DownloadIcon } from "../../components/reports/ReportDrawer";
import { useReportLayout } from "../../components/reports/useReportLayout";
import { UPDATE_PRESETS } from "../../components/updates/reportPresets";
import { PRESETS, downloadReport, fmtDay, prepare, presetRange, summarise, todayKey } from "../../components/updates/updateUtils";
import { apiRequest } from "../../lib/api";
import { loadSession } from "../../lib/session";
import { loadProductsForScope, loadTeamsForCompany, loadUsersForScope, resolveSessionCompanyId, teamSelectLabel } from "../../lib/teamScope";

const MODE_KEY = "greencrm:updates-view";
const FETCH_LIMIT = 5000;
const TEAM_ROLES = ["admin", "manager", "super-admin", "platform-admin", "platform-manager"];
const SELECT = "h-9 rounded-[10px] border border-slate-200 bg-white px-2.5 text-[13px] font-medium text-slate-800 outline-none focus:border-brand-400";

export default function RecentUpdatesPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [mode, setMode] = useState("simple");
  const [preset, setPreset] = useState("7d");
  const [range, setRange] = useState(() => presetRange("7d"));
  const [type, setType] = useState("all");
  const [teamId, setTeamId] = useState("");
  const [personId, setPersonId] = useState("");
  const [productId, setProductId] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [teams, setTeams] = useState([]);
  const [people, setPeople] = useState([]);
  const [products, setProducts] = useState([]);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const report = useReportLayout({ token: session?.token, catalogPath: "/recent-activity/report/columns", storageKey: "greencrm:updates-report", presets: UPDATE_PRESETS });

  useEffect(() => {
    const stored = loadSession();
    if (!stored) { router.replace("/login"); return; }
    setSession(stored);
    try { if (window.localStorage.getItem(MODE_KEY) === "advanced") setMode("advanced"); } catch (_error) { /* storage unavailable */ }
  }, [router]);

  const role = session?.user?.role || "";
  const canSeeTeam = TEAM_ROLES.includes(role);
  const isAdmin = canSeeTeam && role !== "manager";
  const companyId = session ? resolveSessionCompanyId(session) : "";

  // Choices for the filters; the server limits managers to their own teams.
  useEffect(() => {
    if (!session?.token || !canSeeTeam) return;
    loadTeamsForCompany(session.token, companyId).then(setTeams).catch(() => setTeams([]));
  }, [session?.token, canSeeTeam, companyId]);
  useEffect(() => {
    if (!session?.token) return;
    if (canSeeTeam) loadUsersForScope(session.token, { companyId, teamId }).then(setPeople).catch(() => setPeople([]));
    loadProductsForScope(session.token, { companyId, teamId }).then(setProducts).catch(() => setProducts([]));
  }, [session?.token, canSeeTeam, companyId, teamId]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useMemo(() => {
    const params = new URLSearchParams({ fromDate: range.from, toDate: range.to, type });
    if (teamId) params.set("team_id", teamId);
    if (personId) params.set("users", personId);
    if (productId) params.set("products", productId);
    if (debounced) params.set("search", debounced);
    return params.toString();
  }, [range.from, range.to, type, teamId, personId, productId, debounced]);

  useEffect(() => {
    if (!session?.token || range.from > range.to) return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");
    apiRequest(`/recent-activity/notes?${query}&limit=${FETCH_LIMIT}&page=1`, { token: session.token, fresh: true })
      .then((res) => {
        if (cancelled) return;
        const items = res?.items || res?.data || [];
        setRows(items);
        setTotal(Number(res?.meta?.total ?? res?.total ?? items.length));
      })
      .catch((err) => { if (!cancelled) { setRows([]); setTotal(0); setError(err.message || "Updates could not be loaded."); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session?.token, query, range.from, range.to, refreshKey]);

  const notes = useMemo(() => prepare(rows), [rows]);
  const summary = useMemo(() => summarise(notes), [notes]);

  const choosePreset = (key) => {
    setPreset(key);
    if (key !== "custom") setRange(presetRange(key));
  };
  const chooseMode = (key) => {
    setMode(key);
    try { window.localStorage.setItem(MODE_KEY, key); } catch (_error) { /* ignore */ }
  };
  const changeTeam = (value) => { setTeamId(value); setPersonId(""); setProductId(""); };
  const pickTeamByName = (name) => { const team = teams.find((t) => t.name === name); if (team) changeTeam(team.team_id); };
  const filtersOn = type !== "all" || teamId || personId || productId || debounced || kindFilter;
  const clearFilters = () => { setType("all"); changeTeam(""); setSearch(""); setKindFilter(""); };

  const download = useCallback(async () => {
    setDownloading(true);
    setDownloadError("");
    try {
      await downloadReport(`${query}&${report.query}`, session.token);
    } catch (err) {
      setDownloadError(err.message);
    } finally {
      setDownloading(false);
    }
  }, [query, report.query, session?.token]);

  const person = people.find((p) => p.user_id === personId);
  const scopeText = !canSeeTeam ? "Your own updates on leads and customers"
    : person ? `Updates written by ${person.name}`
      : teamId ? `Updates on ${teams.find((t) => t.team_id === teamId)?.name || "this team"}'s leads and customers`
        : isAdmin ? "Every update across the company, team by team" : "Updates from the teams you manage";

  return (
    <DashboardShell session={session} title="Recent Updates" hideTitle>
      <div className="tw-buttons mx-auto max-w-[1400px] space-y-4 px-1 pb-10 sm:px-2">
        <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Recent updates</h1>
            <p className="mt-0.5 text-[13px] text-slate-500">{scopeText} · {fmtDay(range.from)}{range.from !== range.to ? ` – ${fmtDay(range.to)}` : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-[12px] bg-slate-100 p-1" role="tablist" aria-label="Page view">
              {[["simple", "Timeline"], ["advanced", "Insights & reports"]].map(([key, name]) => (
                <button key={key} type="button" role="tab" aria-selected={mode === key} onClick={() => chooseMode(key)}
                  className={`rounded-[9px] px-4 py-1.5 text-[13px] font-semibold transition ${mode === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                  {name}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setRefreshKey((k) => k + 1)} title="Refresh" aria-label="Refresh"
              className="grid h-9 w-9 place-items-center rounded-[10px] bg-white text-slate-500 ring-1 ring-slate-200 hover:text-brand-700">
              <svg className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>
            </button>
            <button type="button" onClick={() => setReportOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white shadow-sm hover:bg-brand-800">
              <DownloadIcon />Excel report
            </button>
          </div>
        </div>

        <section className="space-y-3 rounded-[14px] border border-slate-200 bg-white p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESETS.map(([key, name]) => (
              <button key={key} type="button" onClick={() => choosePreset(key)} aria-pressed={preset === key}
                className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition ${preset === key ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {name}
              </button>
            ))}
            {preset === "custom" ? (
              <span className="flex flex-wrap items-center gap-2 pl-1">
                <input type="date" value={range.from} max={todayKey()} onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))} className={SELECT} aria-label="From date" />
                <span className="text-[12px] text-slate-400">to</span>
                <input type="date" value={range.to} max={todayKey()} onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))} className={SELECT} aria-label="To date" />
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[220px] flex-1 sm:max-w-[320px]">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search note, company, contact or phone"
                className="h-9 w-full rounded-[10px] border border-slate-200 bg-white pl-9 pr-3 text-[13px] text-slate-800 outline-none focus:border-brand-400" />
            </label>
            <div className="flex rounded-[10px] bg-slate-100 p-0.5">
              {[["all", "All"], ["leads", "Leads"], ["customers", "Customers"]].map(([key, name]) => (
                <button key={key} type="button" onClick={() => setType(key)} aria-pressed={type === key}
                  className={`rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold ${type === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{name}</button>
              ))}
            </div>
            {canSeeTeam && teams.length ? (
              <select value={teamId} onChange={(e) => changeTeam(e.target.value)} className={SELECT} aria-label="Team">
                <option value="">{isAdmin ? "All teams" : "All my teams"}</option>
                {teams.map((t) => <option key={t.team_id} value={t.team_id}>{teamSelectLabel(t)}</option>)}
              </select>
            ) : null}
            {canSeeTeam ? (
              <select value={personId} onChange={(e) => setPersonId(e.target.value)} className={SELECT} aria-label="Person">
                <option value="">Everyone</option>
                {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
              </select>
            ) : null}
            {products.length ? (
              <select value={productId} onChange={(e) => setProductId(e.target.value)} className={SELECT} aria-label="Product">
                <option value="">All products</option>
                {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
              </select>
            ) : null}
            {filtersOn ? <button type="button" onClick={clearFilters} className="px-2 text-[12.5px] font-semibold text-brand-700 hover:underline">Clear filters</button> : null}
          </div>
        </section>

        {error ? <div role="alert" className="rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">{error}</div> : null}
        {range.from > range.to ? <div className="rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">The from date is after the to date.</div> : null}
        {total > rows.length && !loading ? (
          <div className="rounded-[12px] border border-gold-200 bg-gold-50 px-4 py-2.5 text-[13px] text-gold-900">
            Showing the latest {rows.length.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")} updates. Pick fewer days or a team to see everything.
          </div>
        ) : null}

        {loading && !rows.length ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-[104px] animate-pulse rounded-[14px] bg-white ring-1 ring-slate-200" />)}</div>
            {[0, 1, 2].map((i) => <div key={i} className="h-[120px] animate-pulse rounded-[14px] bg-white ring-1 ring-slate-200" />)}
          </div>
        ) : (
          <div className={`space-y-4 transition-opacity ${loading ? "opacity-60" : ""}`}>
            <StatRow totals={summary.totals} canSeeTeam={canSeeTeam} />
            {mode === "simple" ? (
              <SimpleView notes={notes} summary={summary} canSeeTeam={canSeeTeam} personFilter={personId} onPickPerson={setPersonId} kindFilter={kindFilter} setKindFilter={setKindFilter} />
            ) : (
              <AdvancedView notes={notes} summary={summary} range={range} canSeeTeam={canSeeTeam} showTeams={!teamId} personFilter={personId} onPickPerson={setPersonId}
                onPickTeam={pickTeamByName} onDownload={download} downloading={downloading} downloadError={downloadError} total={total} report={report} />
            )}
          </div>
        )}
      </div>
      <ReportDrawer open={reportOpen} onClose={() => setReportOpen(false)} title="Download Excel report" report={report} onDownload={download} downloading={downloading} error={downloadError}
        subtitle={`${fmtDay(range.from, { day: "numeric", month: "short", year: "numeric" })} – ${fmtDay(range.to, { day: "numeric", month: "short", year: "numeric" })} · ${total.toLocaleString("en-IN")} updates · uses the filters on this page`} />
    </DashboardShell>
  );
}
