"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../../components/dashboard/DashboardShell";
import { apiRequest } from "../../lib/api";
import { loadSession } from "../../lib/session";
import { AnalyticsWorkspace } from "./analytics-ui";
import { ROLES, buildAnalyticsCsv, qp } from "./analytics-utils";
import { buildServerDeck, buildServerFocus } from "./server-analytics";

const EMPTY_FILTERS = { query: "", owner: "all", priority: "all", source: "all", product: "all" };

export default function AnalyticsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [range, setRange] = useState("month");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState("");
  const [report, setReport] = useState(null);
  const [customerCount, setCustomerCount] = useState(null);
  const [recent, setRecent] = useState([]);
  const [statusFocus, setStatusFocus] = useState("");
  const [workflowFocus, setWorkflowFocus] = useState("");
  const [focus, setFocus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [focusLoading, setFocusLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusError, setFocusError] = useState("");
  const [refreshSeed, setRefreshSeed] = useState(0);

  useEffect(() => {
    const active = loadSession();
    if (!active) return router.replace("/login");
    if (!ROLES.includes(active.user?.role)) return router.replace("/dashboard");
    setSession(active);
  }, [router]);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(filters.query.trim()), 300);
    return () => clearTimeout(timer);
  }, [filters.query]);

  const path = useMemo(() => qp("/leads/analytics", {
    range, search,
    assigned_to: filters.owner === "all" ? undefined : filters.owner,
    priority: filters.priority === "all" ? undefined : filters.priority,
    lead_source: filters.source === "all" ? undefined : filters.source,
    product_id: filters.product === "all" ? undefined : filters.product,
  }), [range, search, filters.owner, filters.priority, filters.source, filters.product]);

  useEffect(() => {
    if (!session?.token) return;
    const controller = new AbortController();
    setLoading(true); setError(""); setReport(null);
    apiRequest(path, { token: session.token, signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setReport(result); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, session?.token, refreshSeed]);

  useEffect(() => {
    if (!session?.token) return;
    const controller = new AbortController();
    const options = { token: session.token, signal: controller.signal };
    apiRequest("/customers?page_size=1", options).then(r => { if (!controller.signal.aborted) setCustomerCount(Number(r.meta?.total || 0)); })
      .catch(() => { if (!controller.signal.aborted) setCustomerCount(null); });
    apiRequest("/notifications?page_size=8", options).then(r => {
      if (!controller.signal.aborted) setRecent((r.items || []).map(n => ({
        activity_id: n.notif_id, activity_type: n.type, message: n.message, company_name: n.title, created_at: n.created_at,
      })));
    }).catch(() => { if (!controller.signal.aborted) setRecent([]); });
    return () => controller.abort();
  }, [session?.token, refreshSeed]);

  const deck = useMemo(() => buildServerDeck(report, customerCount, recent), [report, customerCount, recent]);
  useEffect(() => {
    if (!report) return;
    if (!deck.statusMix.some(r => r.key === statusFocus)) setStatusFocus(deck.focusDefaults.status);
    if (!deck.workflowMix.some(r => r.key === workflowFocus)) setWorkflowFocus(deck.focusDefaults.workflow);
  }, [report, deck, statusFocus, workflowFocus]);

  useEffect(() => {
    if (!session?.token || !report) return;
    const controller = new AbortController();
    setFocus(null); setFocusLoading(true); setFocusError("");
    const focusPath = path.replace("/analytics?", "/analytics/focus?") +
      `&status=${encodeURIComponent(statusFocus)}&workflow_stage=${encodeURIComponent(workflowFocus)}`;
    apiRequest(focusPath, { token: session.token, signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setFocus(result); })
      .catch(e => { if (!controller.signal.aborted) setFocusError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setFocusLoading(false); });
    return () => controller.abort();
  }, [path, report, statusFocus, workflowFocus, session?.token]);
  const focusDeck = useMemo(() => buildServerFocus(focus), [focus]);

  function exportCsv() {
    if (loading || focusLoading || !report || error || focusError) return;
    const payload = buildAnalyticsCsv(deck, range, focusDeck);
    const url = URL.createObjectURL(new Blob([payload.content], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = payload.name; link.click(); URL.revokeObjectURL(url);
  }

  return <DashboardShell session={session} title="Analytics" hideTitle heroStats={[]}>
    <p className="mx-auto mb-3 max-w-[1320px] text-xs text-slate-500">SQL Server summaries cover all accessible matches, filtered by lead creation date (UTC). Focus shows up to 20 leads; its counts cover all matches. Export includes summaries and this preview.</p>
    {focusLoading && <p className="text-sm text-slate-500" role="status">Loading focused leads…</p>}
    <AnalyticsWorkspace deck={deck} focusDeck={focusDeck} range={range} statusFocus={statusFocus} workflowFocus={workflowFocus}
      filters={filters} loading={loading} exportDisabled={focusLoading || !report || !focus} error={error || focusError} onRangeChange={setRange}
      onRefresh={() => setRefreshSeed(n => n + 1)} onExport={exportCsv} onStatusFocus={setStatusFocus} onWorkflowFocus={setWorkflowFocus}
      onFilterChange={(key, value) => setFilters(current => ({ ...current, [key]: value }))} onResetFilters={() => setFilters(EMPTY_FILTERS)} />
  </DashboardShell>;
}
