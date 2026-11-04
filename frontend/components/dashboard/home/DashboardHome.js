"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardShell from "../DashboardShell";
import ReportDrawer, { DownloadIcon } from "../../reports/ReportDrawer";
import { useReportLayout } from "../../reports/useReportLayout";
import { API_BASE } from "../../../lib/api";
import { ROLE_HOME_ROUTE } from "../../../lib/roles";
import { loadSession } from "../../../lib/session";
import { loadProductsForScope, loadTeamsForCompany, loadUsersForScope, resolveSessionCompanyId, teamSelectLabel } from "../../../lib/teamScope";
import CustomWidget from "./CustomWidget";
import DashboardCustomizer from "./DashboardCustomizer";
import { WidgetSlot } from "./charts";
import { FunnelWidget, KpiWidget, PaymentsWidget, ProductsWidget, SourcesWidget, TrendWidget, WorkflowWidget } from "./LeadWidgets";
import { MyDayWidget, RecentWidget, TeamWidget, UsageWidget } from "./PeopleWidgets";
import { useDashboard } from "./useDashboard";
import { RANGES, TEAM_ROLES, istToday, rangeFor, rangeText } from "./widgetCatalog";

const UNIFIED_ROLES = ["admin", "manager", "sales", "marketing", "legal-team", "finance-team", "support", "viewer"];
const SELECT = "h-9 rounded-[10px] border border-slate-200 bg-white px-2.5 text-[13px] font-medium text-slate-800 outline-none focus:border-brand-400";
const REPORT_PRESETS = [
  { key: "summary", label: "Sales summary", description: "Headline numbers, sources and status", layout: { sheets: ["summary", "sources", "funnel"] } },
  { key: "team", label: "Team review", description: "People grouped by team, and CRM use", layout: { sheets: ["summary", "owners", "usage"], options: { owners: { group: "team" } } } },
  { key: "matrix", label: "Source × person", description: "Each person's leads from each source", layout: { sheets: ["sourceOwner", "sources"], options: { sourceOwner: { rows: "owner", measure: "total" } } } },
  { key: "all", label: "Everything", description: "All sheets with the usual columns", layout: { sheets: ["summary", "sources", "sourceOwner", "owners", "products", "funnel", "trend", "usage"] } },
];
const greeting = () => { const h = new Date(Date.now() + 330 * 60000).getUTCHours(); return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening"; };

export default function DashboardHome() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [customizing, setCustomizing] = useState(false);
  const [editingChart, setEditingChart] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [teams, setTeams] = useState([]);
  const [people, setPeople] = useState([]);
  const [products, setProducts] = useState([]);
  const dash = useDashboard(session);
  const canTeam = TEAM_ROLES.includes(dash.role);
  const report = useReportLayout({ token: session?.token, catalogPath: "/dashboard/report/columns", storageKey: `greencrm:dashboard-report:${session?.user?.user_id || "me"}`, presets: canTeam ? REPORT_PRESETS : REPORT_PRESETS.slice(0, 1) });

  useEffect(() => {
    const s = loadSession();
    if (!s) { router.replace("/login"); return; }
    if (!UNIFIED_ROLES.includes(s.user?.role)) { router.replace(ROLE_HOME_ROUTE[s.user?.role] || "/login"); return; }
    setSession(s);
  }, [router]);

  const companyId = session ? resolveSessionCompanyId(session) : "";
  useEffect(() => {
    if (!session?.token || !canTeam) return;
    loadTeamsForCompany(session.token, companyId).then(setTeams).catch(() => setTeams([]));
  }, [session?.token, canTeam, companyId]);
  useEffect(() => {
    if (!session?.token) return;
    if (canTeam) loadUsersForScope(session.token, { companyId, teamId: dash.filters.team_ids }).then(setPeople).catch(() => setPeople([]));
    loadProductsForScope(session.token, { companyId, teamId: dash.filters.team_ids }).then(setProducts).catch(() => setProducts([]));
  }, [session?.token, canTeam, companyId, dash.filters.team_ids]);

  const person = people.find((p) => p.user_id === dash.filters.assigned_to);
  const team = teams.find((t) => t.team_id === dash.filters.team_ids);
  const scopeLabel = person ? `${person.name}'s work` : team ? `${team.name} team` : canTeam ? (dash.role === "admin" ? "Whole company" : "Your teams") : "Your work";
  const filterLabel = [scopeLabel, products.find((p) => p.product_id === dash.filters.product_id)?.name].filter(Boolean).join(" · ");
  const pickPerson = (userId) => { dash.setFilter("assigned_to", userId); window.scrollTo({ top: 0, behavior: "smooth" }); };

  async function download() {
    setDownloading(true);
    setReportError("");
    try {
      const params = new URLSearchParams({ ...dash.query, filter_label: filterLabel });
      const response = await fetch(`${API_BASE}/dashboard/report?${params}&${report.query}`, { headers: { Authorization: `Bearer ${session.token}` }, cache: "no-store" });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "The report could not be created.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") || "")?.[1] || "GreenCRM-dashboard.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setReportError(err.message);
    } finally {
      setDownloading(false);
    }
  }

  const render = {
    kpis: () => <KpiWidget state={dash.data.kpis} range={dash.range} canTeam={canTeam} showMoney={dash.available.some((w) => w.key === "payments")} />,
    myday: () => <MyDayWidget state={dash.data.myday} />,
    team: (item) => <TeamWidget state={dash.data.team} onPickPerson={pickPerson} size={item.size} session={session} />,
    sources: () => <SourcesWidget state={dash.data.sources} range={dash.range} />,
    trend: () => <TrendWidget state={dash.data.trend} />,
    funnel: () => <FunnelWidget state={dash.data.funnel} range={dash.range} />,
    products: () => <ProductsWidget state={dash.data.products} />,
    usage: () => <UsageWidget state={dash.data.usage} onPickPerson={pickPerson} />,
    payments: () => <PaymentsWidget state={dash.data.payments} />,
    workflow: () => <WorkflowWidget state={dash.data.workflow} />,
    recent: () => <RecentWidget token={session?.token} range={dash.range} query={dash.query} />,
  };
  const renderItem = (item) => (item.custom
    ? <CustomWidget token={session?.token} item={item} range={dash.range} query={dash.query} seed={dash.seed} />
    : render[item.key]?.(item));
  const openEditor = (key) => { setEditingChart(key); setCustomizing(true); };
  const closeCustomizer = () => { setCustomizing(false); setEditingChart(null); };

  const firstName = (session?.user?.name || "").split(" ")[0];
  const filtersOn = dash.filters.team_ids || dash.filters.assigned_to || dash.filters.product_id;

  return (
    <DashboardShell session={session} title="Dashboard" hideTitle heroStats={[]}>
      <div className="tw-buttons min-w-0 space-y-4 pb-10">
        <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-slate-900">{greeting()}{firstName ? `, ${firstName}` : ""}</h1>
            <p className="mt-0.5 text-[13px] text-slate-500">{scopeLabel} · {rangeText(dash.range)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {session && (person || !canTeam) ? (
              <Link href={`/people/${encodeURIComponent(person?.user_id || session.user.user_id)}`} prefetch={false} className="inline-flex h-9 items-center rounded-[10px] bg-white px-3 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                {person ? `${person.name.split(" ")[0]}'s full report` : "My report"}
              </Link>
            ) : null}
            <button type="button" onClick={dash.refresh} aria-label="Refresh" title="Refresh" className="grid h-9 w-9 place-items-center rounded-[10px] bg-white text-slate-500 ring-1 ring-slate-200 hover:text-brand-700">
              <svg className={`h-4 w-4 ${dash.loading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>
            </button>
            <button type="button" onClick={() => setCustomizing(true)} className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-white px-3 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M17.5 14v7M14 17.5h7" /></svg>Customize
            </button>
            <button type="button" onClick={() => setReportOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white shadow-sm hover:bg-brand-800"><DownloadIcon />Report</button>
          </div>
        </div>

        <section className="flex flex-wrap items-center gap-2 rounded-[14px] bg-white p-3 ring-1 ring-slate-200">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Period">
            {RANGES.map(([key, name]) => (
              <button key={key} type="button" aria-pressed={dash.preset === key} onClick={() => (key === "custom" ? dash.setCustom(dash.custom || (dash.range.all ? rangeFor("30d") : dash.range)) : dash.setPreset(key))}
                className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${dash.preset === key ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{name}</button>
            ))}
          </div>
          {dash.preset === "custom" ? (
            <span className="flex items-center gap-1.5">
              <input type="date" aria-label="From date" max={istToday()} value={dash.range.from} onChange={(e) => e.target.value && dash.setCustom({ ...dash.range, from: e.target.value })} className={SELECT} />
              <span className="text-[12px] text-slate-400">to</span>
              <input type="date" aria-label="To date" max={istToday()} value={dash.range.to} onChange={(e) => e.target.value && dash.setCustom({ ...dash.range, to: e.target.value })} className={SELECT} />
            </span>
          ) : null}
          <span className="flex-1" />
          {canTeam && teams.length ? (
            <select aria-label="Team" value={dash.filters.team_ids} onChange={(e) => dash.setFilter("team_ids", e.target.value)} className={SELECT}>
              <option value="">{dash.role === "admin" ? "All teams" : "All my teams"}</option>
              {teams.map((t) => <option key={t.team_id} value={t.team_id}>{teamSelectLabel(t)}</option>)}
            </select>
          ) : null}
          {canTeam ? (
            <select aria-label="Person" value={dash.filters.assigned_to} onChange={(e) => dash.setFilter("assigned_to", e.target.value)} className={SELECT}>
              <option value="">Everyone</option>
              {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
            </select>
          ) : null}
          {products.length > 1 ? (
            <select aria-label="Product" value={dash.filters.product_id} onChange={(e) => dash.setFilter("product_id", e.target.value)} className={SELECT}>
              <option value="">All products</option>
              {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
            </select>
          ) : null}
          {filtersOn ? <button type="button" onClick={dash.clearFilters} className="px-1 text-[12.5px] font-semibold text-brand-700 hover:underline">Clear</button> : null}
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {dash.layout.map((item) => (
            <div key={item.key} className={`min-w-0 ${item.key === "kpis" || item.size === "full" ? "lg:col-span-2" : ""}`}>
              <WidgetSlot.Provider value={{ size: item.size, onRemove: () => dash.removeWidget(item.key), onResize: () => dash.resizeWidget(item.key), onEdit: item.custom ? () => openEditor(item.key) : null }}>
                {renderItem(item)}
              </WidgetSlot.Provider>
            </div>
          ))}
          {dash.layout.length ? (
            <button type="button" onClick={() => setCustomizing(true)} className="flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-[14px] border-2 border-dashed border-slate-300 bg-white/60 text-slate-500 hover:border-brand-400 hover:text-brand-700">
              <span className="text-[22px] leading-none">+</span>
              <span className="text-[13px] font-semibold">Add a widget or build your own chart</span>
              <span className="text-[11.5px] text-slate-400">Leads by city, won by person, payment pending and more</span>
            </button>
          ) : null}
        </div>
        {!dash.layout.length && session ? (
          <div className="rounded-[14px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <p className="text-[15px] font-semibold text-slate-800">Your dashboard is empty</p>
            <button type="button" onClick={() => setCustomizing(true)} className="mt-3 rounded-[10px] bg-brand-700 px-4 py-2 text-[13px] font-semibold text-white">Add widgets</button>
          </div>
        ) : null}
      </div>

      <DashboardCustomizer open={customizing} onClose={closeCustomizer} role={dash.role} available={dash.available} layout={dash.layout} onChange={dash.setLayout} onReset={dash.resetLayout}
        onAddChart={dash.addChart} onUpdateChart={dash.updateChart} editing={editingChart} setEditing={setEditingChart} />
      <ReportDrawer open={reportOpen} onClose={() => setReportOpen(false)} title="Dashboard report" report={report} onDownload={download} downloading={downloading} error={reportError}
        subtitle={`${filterLabel} · ${rangeText(dash.range, { day: "numeric", month: "short" })} · uses the filters on the dashboard`} />
    </DashboardShell>
  );
}
