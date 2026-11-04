"use client";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../lib/api";
import { AnalyticsWorkspace } from "../analytics/analytics-ui";
import { qp } from "../analytics/analytics-utils";
import { buildServerDeck, buildServerFocus } from "../analytics/server-analytics";

const EMPTY_FILTERS = { query: "", owner: "all", priority: "all", source: "all", product: "all" };

/** Pipeline numbers for leads created in the period: trend, sources, status, stages, owners and a drill-down. */
export default function InsightsTab({ session, onQueryChange }) {
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
    const timer = setTimeout(() => setSearch(filters.query.trim()), 300);
    return () => clearTimeout(timer);
  }, [filters.query]);

  const params = useMemo(() => ({
    range, search: search || undefined,
    assigned_to: filters.owner === "all" ? undefined : filters.owner,
    priority: filters.priority === "all" ? undefined : filters.priority,
    lead_source: filters.source === "all" ? undefined : filters.source,
    product_id: filters.product === "all" ? undefined : filters.product,
  }), [range, search, filters.owner, filters.priority, filters.source, filters.product]);
  const path = useMemo(() => qp("/leads/analytics", params), [params]);
  useEffect(() => { onQueryChange?.(params); }, [params, onQueryChange]);

  useEffect(() => {
    if (!session?.token) return;
    const controller = new AbortController();
    setLoading(true); setError(""); setReport(null);
    apiRequest(path, { token: session.token, signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setReport(result); })
      .catch((e) => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, session?.token, refreshSeed]);

  useEffect(() => {
    if (!session?.token) return;
    const controller = new AbortController();
    const options = { token: session.token, signal: controller.signal };
    apiRequest("/customers?page_size=1", options).then((r) => { if (!controller.signal.aborted) setCustomerCount(Number(r.meta?.total || 0)); })
      .catch(() => { if (!controller.signal.aborted) setCustomerCount(null); });
    apiRequest("/notifications?page_size=8", options).then((r) => {
      if (!controller.signal.aborted) setRecent((r.items || []).map((n) => ({
        activity_id: n.notif_id, activity_type: n.type, message: n.message, company_name: n.title, created_at: n.created_at,
      })));
    }).catch(() => { if (!controller.signal.aborted) setRecent([]); });
    return () => controller.abort();
  }, [session?.token, refreshSeed]);

  const deck = useMemo(() => buildServerDeck(report, customerCount, recent), [report, customerCount, recent]);
  useEffect(() => {
    if (!report) return;
    if (!deck.statusMix.some((r) => r.key === statusFocus)) setStatusFocus(deck.focusDefaults.status);
    if (!deck.workflowMix.some((r) => r.key === workflowFocus)) setWorkflowFocus(deck.focusDefaults.workflow);
  }, [report, deck, statusFocus, workflowFocus]);

  useEffect(() => {
    if (!session?.token || !report) return;
    const controller = new AbortController();
    setFocus(null); setFocusLoading(true); setFocusError("");
    const focusPath = path.replace("/analytics?", "/analytics/focus?") +
      `&status=${encodeURIComponent(statusFocus)}&workflow_stage=${encodeURIComponent(workflowFocus)}`;
    apiRequest(focusPath, { token: session.token, signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setFocus(result); })
      .catch((e) => { if (!controller.signal.aborted) setFocusError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setFocusLoading(false); });
    return () => controller.abort();
  }, [path, report, statusFocus, workflowFocus, session?.token]);
  const focusDeck = useMemo(() => buildServerFocus(focus), [focus]);

  return (
    <AnalyticsWorkspace deck={deck} focusDeck={focusDeck} range={range} statusFocus={statusFocus} workflowFocus={workflowFocus}
      filters={filters} loading={loading} focusLoading={focusLoading} error={error || focusError} onRangeChange={setRange}
      onRefresh={() => setRefreshSeed((n) => n + 1)} onStatusFocus={setStatusFocus} onWorkflowFocus={setWorkflowFocus}
      onFilterChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))} onResetFilters={() => setFilters(EMPTY_FILTERS)} />
  );
}
