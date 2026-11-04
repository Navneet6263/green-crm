"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../../components/dashboard/DashboardShell";
import FollowUpActivityModal from "../../components/customers/FollowUpActivityModal";
import RecordPaymentModal from "../../components/customers/money/RecordPaymentModal";
import CustomerKpis from "../../components/customers/workspace/CustomerKpis";
import CustomerTable from "../../components/customers/workspace/CustomerTable";
import { COLUMNS, DEFAULT_COLUMNS, QUICK_FILTERS, REPORT_PRESETS, SORTS } from "../../components/customers/workspace/customerConfig";
import ReportDrawer, { DownloadIcon } from "../../components/reports/ReportDrawer";
import { useReportLayout } from "../../components/reports/useReportLayout";
import { AlertError, AlertSuccess } from "../../components/ui/Alert";
import { API_BASE, apiRequest } from "../../lib/api";
import { loadSession } from "../../lib/session";
import { formatScopedError, isPlatformConsoleRole, loadTeamScopeResources, resolveSessionCompanyId, teamSelectLabel } from "../../lib/teamScope";

const ALLOWED_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager", "sales", "marketing", "support", "viewer", "finance-team"];
const DELETE_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager"];
const SELECT = "h-9 rounded-[10px] border border-slate-200 bg-white px-2.5 text-[13px] font-medium text-slate-700 outline-none focus:border-brand-400";
const LABELS = Object.fromEntries(COLUMNS.map((c) => [c.key, c.label]));
const colsKey = (id) => `greencrm:customer-columns:${id || "me"}`;

/** Customers: who is onboarding, who owes money, whose plan is ending, with Excel for all of it. */
export default function CustomersPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [quick, setQuick] = useState("all");
  const [kpi, setKpi] = useState(null);
  const [filters, setFilters] = useState({ status: "all", sort: "recent", team: "all", company: "all", created_by: "all" });
  const [page, setPage] = useState(1);
  const [teams, setTeams] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [colMenu, setColMenu] = useState(false);
  const [payFor, setPayFor] = useState(null);
  const [logFor, setLogFor] = useState(null);
  const [savingLog, setSavingLog] = useState(false);
  const [saving, setSaving] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [seed, setSeed] = useState(0);
  const request = useRef(0);

  const role = session?.user?.role || "viewer";
  const platform = isPlatformConsoleRole(role);
  const canManage = role !== "viewer";
  const report = useReportLayout({ token: session?.token, catalogPath: "/customers/export/columns", storageKey: `greencrm:customer-report:${session?.user?.user_id || "me"}`, presets: REPORT_PRESETS });

  useEffect(() => {
    const s = loadSession();
    if (!s) { router.replace("/login?next=/customers"); return; }
    if (!ALLOWED_ROLES.includes(s.user?.role)) { router.replace("/dashboard"); return; }
    setSession(s);
    try { const saved = JSON.parse(window.localStorage.getItem(colsKey(s.user?.user_id)) || "null"); if (Array.isArray(saved) && saved.length) setColumns(["customer", ...saved.filter((k) => LABELS[k] && k !== "customer")]); } catch (_e) { /* ignore */ }
    if (isPlatformConsoleRole(s.user?.role)) apiRequest("/companies?page_size=120", { token: s.token }).then((r) => setCompanies(r.items || [])).catch(() => {});
  }, [router]);

  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  const quickParams = useMemo(() => ({ ...(QUICK_FILTERS.find(([k]) => k === quick)?.[2] || {}), ...(kpi?.filter || {}) }), [quick, kpi]);
  const params = useMemo(() => Object.fromEntries(Object.entries({
    search: debounced, status: filters.status, sort: filters.sort, team_ids: filters.team, created_by: filters.created_by,
    company_id: platform ? filters.company : undefined, ...quickParams,
  }).filter(([, v]) => v && v !== "all")), [debounced, filters, quickParams, platform]);
  const paramKey = JSON.stringify(params);
  useEffect(() => { setPage(1); }, [paramKey]);

  useEffect(() => {
    if (!session?.token) return;
    const version = ++request.current;
    setLoading(true);
    apiRequest(`/customers?${new URLSearchParams({ ...params, page: String(page), page_size: "25", include_summary: "1" })}`, { token: session.token, fresh: true })
      .then((r) => { if (version !== request.current) return; setRows(r.items || []); setMeta(r.meta || { total: 0, total_pages: 1 }); setError(""); })
      .catch((e) => { if (version === request.current) { setError(formatScopedError(e, "Could not load customers.")); setRows([]); } })
      .finally(() => { if (version === request.current) setLoading(false); });
  }, [session?.token, paramKey, page, seed]); // eslint-disable-line react-hooks/exhaustive-deps

  const teamCompany = platform ? (filters.company !== "all" ? filters.company : "") : resolveSessionCompanyId(session);
  useEffect(() => {
    if (!session?.token || !teamCompany) { setTeams([]); return; }
    loadTeamScopeResources(session.token, { companyId: teamCompany }).then(({ teams: t }) => setTeams(t || [])).catch(() => setTeams([]));
  }, [session?.token, teamCompany]);

  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  const saveColumns = (next) => { setColumns(next); try { window.localStorage.setItem(colsKey(session?.user?.user_id), JSON.stringify(next)); } catch (_e) { /* ignore */ } };
  const refresh = () => setSeed((s) => s + 1);

  async function remove(c) {
    if (!window.confirm(`Delete customer "${c.company_name}"?`)) return;
    setSaving(c.customer_id);
    try { await apiRequest(`/customers/${c.customer_id}`, { method: "DELETE", token: session.token }); setNotice(`${c.company_name} deleted.`); refresh(); } catch (e) { setError(formatScopedError(e, "Could not delete this customer.")); } finally { setSaving(""); }
  }

  async function saveLog({ activityType, remarks }) {
    setSavingLog(true);
    try {
      await apiRequest(`/customers/${logFor.customer_id}/notes`, { method: "POST", token: session.token, body: { content: `[${activityType.toUpperCase()}] ${remarks.trim()}` } });
      setNotice(`Saved for ${logFor.company_name}.`); setLogFor(null); refresh();
    } catch (e) { setError(formatScopedError(e, "Could not save activity.")); return false; } finally { setSavingLog(false); }
  }

  async function download() {
    setDownloading(true);
    setReportError("");
    try {
      const label = [QUICK_FILTERS.find(([k]) => k === quick)?.[1], kpi?.label, debounced && `“${debounced}”`].filter((x) => x && x !== "All").join(" · ");
      const response = await fetch(`${API_BASE}/customers/export?${new URLSearchParams({ ...params, filter_label: label })}&${report.query}`, { headers: { Authorization: `Bearer ${session.token}` }, cache: "no-store" });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "The Excel could not be created.");
      const url = URL.createObjectURL(await response.blob());
      const link = Object.assign(document.createElement("a"), { href: url, download: /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") || "")?.[1] || "GreenCRM-customers.xlsx" });
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setReportError(e.message); } finally { setDownloading(false); }
  }

  return (
    <DashboardShell session={session} title="Customers" hideTitle heroStats={[]}>
      <div className="tw-buttons min-w-0 space-y-4 pb-10">
        <AlertError message={error} onDismiss={() => setError("")} />
        {!error && notice ? <AlertSuccess message={notice} onDismiss={() => setNotice("")} /> : null}

        <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Customers</h1>
            <p className="text-[13px] text-slate-500">Onboarding, money received and pending, renewals and health, for every customer</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setReportOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-white px-3 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><DownloadIcon />Excel</button>
            {canManage ? <Link href="/customers/new" prefetch={false} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white shadow-sm hover:bg-brand-800">+ Add customer</Link> : null}
          </div>
        </div>

        <CustomerKpis summary={meta.summary} loading={loading} active={kpi?.key} onPick={(k) => { setKpi(k && Object.keys(k.filter).length ? k : null); if (k) setQuick("all"); }} />

        <section className="min-w-0 rounded-[14px] bg-white ring-1 ring-slate-200">
          <div className="space-y-3 border-b border-slate-100 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-[10px] border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-brand-300 focus-within:bg-white">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, contact, email or phone" aria-label="Search customers" className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-800 outline-none" />
              </label>
              {platform ? <select aria-label="Company" value={filters.company} onChange={setFilter("company")} className={SELECT}><option value="all">All companies</option>{companies.map((c) => <option key={c.company_id} value={c.company_id}>{c.name}</option>)}</select> : null}
              {teams.length > 1 ? <select aria-label="Team" value={filters.team} onChange={setFilter("team")} className={SELECT}><option value="all">All teams</option>{teams.map((t) => <option key={t.team_id} value={t.team_id}>{teamSelectLabel(t)}</option>)}</select> : null}
              <select aria-label="Status" value={filters.status} onChange={setFilter("status")} className={SELECT}><option value="all">Any status</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select>
              {DELETE_ROLES.includes(role) && (meta.creators || []).length > 1 ? <select aria-label="Created by" value={filters.created_by} onChange={setFilter("created_by")} className={SELECT}><option value="all">Anyone</option>{meta.creators.map((n) => <option key={n.user_id} value={n.user_id}>{n.name}</option>)}</select> : null}
              <select aria-label="Sort" value={filters.sort} onChange={setFilter("sort")} className={SELECT}>{SORTS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select>
              <div className="relative">
                <button type="button" onClick={() => setColMenu((v) => !v)} aria-expanded={colMenu} className="h-9 rounded-[10px] px-3 text-[13px] font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">Columns</button>
                {colMenu ? (
                  <div className="absolute right-0 top-10 z-20 w-56 rounded-[12px] bg-white p-2 shadow-lg ring-1 ring-slate-200">
                    {COLUMNS.filter((c) => !c.fixed).map((c) => (
                      <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50">
                        <input type="checkbox" checked={columns.includes(c.key)} onChange={() => saveColumns(columns.includes(c.key) ? columns.filter((k) => k !== c.key) : COLUMNS.map((x) => x.key).filter((k) => k === c.key || columns.includes(k)))} />{c.label}
                      </label>
                    ))}
                    <button type="button" onClick={() => saveColumns(DEFAULT_COLUMNS)} className="mt-1 w-full rounded-[8px] py-1.5 text-[12px] font-semibold text-brand-700 hover:bg-slate-50">Reset</button>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {QUICK_FILTERS.map(([key, name]) => (
                <button key={key} type="button" aria-pressed={quick === key && !kpi} onClick={() => { setQuick(key); setKpi(null); }}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${quick === key && !kpi ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{name}</button>
              ))}
              {kpi ? <button type="button" onClick={() => setKpi(null)} className="shrink-0 rounded-full bg-gold-100 px-3 py-1.5 text-[12.5px] font-semibold text-gold-900">{kpi.label} ×</button> : null}
            </div>
          </div>
          <CustomerTable rows={rows} columns={columns} labels={LABELS} loading={loading} onPayment={setPayFor} onFollowUp={setLogFor} onDelete={remove}
            canManage={canManage} canDelete={DELETE_ROLES.includes(role)} saving={saving} />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-[12.5px] text-slate-500">
            <span>{Number(meta.total || 0).toLocaleString("en-IN")} customers</span>
            <span className="flex items-center gap-2">
              <button type="button" disabled={loading || page <= 1} onClick={() => setPage(page - 1)} className="rounded-[8px] px-3 py-1.5 font-semibold ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40">Previous</button>
              <span>Page {page} of {meta.total_pages || 1}</span>
              <button type="button" disabled={loading || page >= (meta.total_pages || 1)} onClick={() => setPage(page + 1)} className="rounded-[8px] px-3 py-1.5 font-semibold ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40">Next</button>
            </span>
          </div>
        </section>
      </div>

      <RecordPaymentModal open={Boolean(payFor)} onClose={() => setPayFor(null)} token={session?.token} customer={payFor} onSaved={() => { setNotice(`Payment saved for ${payFor.company_name}.`); refresh(); }} />
      <FollowUpActivityModal isOpen={Boolean(logFor)} onClose={() => setLogFor(null)} onSave={saveLog} saving={savingLog} />
      <ReportDrawer open={reportOpen} onClose={() => setReportOpen(false)} title="Customers report" report={report} onDownload={download} downloading={downloading} error={reportError}
        subtitle={`${Number(meta.total || 0).toLocaleString("en-IN")} customers · uses the filters on the page`} />
    </DashboardShell>
  );
}
