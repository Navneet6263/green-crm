"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../components/dashboard/DashboardShell";
import { apiRequest } from "../../lib/api";
import { loadSession } from "../../lib/session";
import { AnalyticsWorkspace } from "./analytics-ui";
import {
  ANALYTICS_PAGE_BATCH,
  ANALYTICS_PAGE_SIZE,
  ROLES,
  buildAnalyticsCsv,
  buildAnalyticsDeck,
  buildFocusDeck,
  qp,
} from "./analytics-utils";

export default function AnalyticsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [range, setRange] = useState("month");
  const [filters, setFilters] = useState({
    query: "",
    owner: "all",
    priority: "all",
    source: "all",
    product: "all",
  });
  const [summary, setSummary] = useState({});
  const [leads, setLeads] = useState([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [statusFocus, setStatusFocus] = useState("");
  const [workflowFocus, setWorkflowFocus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAllLeadPages(token) {
    const firstResponse = await apiRequest(
      qp("/leads", { page: 1, page_size: ANALYTICS_PAGE_SIZE, analytics: 1 }),
      { token }
    );
    const totalPages = Number(firstResponse.meta?.total_pages || 1);
    const allItems = [...(firstResponse.items || [])];

    for (let page = 2; page <= totalPages; page += ANALYTICS_PAGE_BATCH) {
      const batch = [];
      for (let currentPage = page; currentPage < page + ANALYTICS_PAGE_BATCH && currentPage <= totalPages; currentPage += 1) {
        batch.push(apiRequest(qp("/leads", { page: currentPage, page_size: ANALYTICS_PAGE_SIZE, analytics: 1 }), { token }));
      }
      const responses = await Promise.all(batch);
      responses.forEach((response) => allItems.push(...(response.items || [])));
    }

    return allItems;
  }

  async function loadAnalytics(activeSession) {
    setLoading(true);
    setError("");
    try {
      const [summaryRes, leadItems, customerRes, notificationRes] = await Promise.all([
        apiRequest("/dashboard/summary", { token: activeSession.token }),
        loadAllLeadPages(activeSession.token),
        apiRequest("/customers?page=1&page_size=1", { token: activeSession.token }),
        apiRequest("/notifications?page_size=12", { token: activeSession.token }),
      ]);
      setSummary(summaryRes || {});
      setLeads(leadItems || []);
      setCustomerCount(Number(customerRes.meta?.total || customerRes.items?.length || 0));
      setNotifications(notificationRes.items || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) {
      router.replace("/login");
      return;
    }
    if (!ROLES.includes(activeSession.user?.role)) {
      router.replace("/dashboard");
      return;
    }
    setSession(activeSession);
    loadAnalytics(activeSession);
  }, [router]);

  const deck = useMemo(
    () => buildAnalyticsDeck(leads, range, customerCount, summary, notifications, filters),
    [customerCount, filters, leads, notifications, range, summary]
  );
  const focusDeck = useMemo(
    () => buildFocusDeck(deck.filteredLeads, statusFocus, workflowFocus),
    [deck.filteredLeads, statusFocus, workflowFocus]
  );

  useEffect(() => {
    if (!deck.statusMix.length || !deck.workflowMix.length) {
      return;
    }
    if (!deck.statusMix.some((item) => item.key === statusFocus)) {
      setStatusFocus(deck.focusDefaults.status);
    }
    if (!deck.workflowMix.some((item) => item.key === workflowFocus)) {
      setWorkflowFocus(deck.focusDefaults.workflow);
    }
  }, [deck.focusDefaults.status, deck.focusDefaults.workflow, deck.statusMix, deck.workflowMix, statusFocus, workflowFocus]);

  function exportCsv() {
    const payload = buildAnalyticsCsv(deck, range, focusDeck);
    const blob = new Blob([payload.content], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = payload.name;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters({
      query: "",
      owner: "all",
      priority: "all",
      source: "all",
      product: "all",
    });
  }

  return (
    <DashboardShell session={session} title="Analytics" hideTitle heroStats={[]}>
      <AnalyticsWorkspace
        deck={deck}
        focusDeck={focusDeck}
        range={range}
        statusFocus={statusFocus}
        workflowFocus={workflowFocus}
        filters={filters}
        loading={loading}
        error={error}
        onRangeChange={setRange}
        onRefresh={() => session?.token && loadAnalytics(session)}
        onExport={exportCsv}
        onStatusFocus={setStatusFocus}
        onWorkflowFocus={setWorkflowFocus}
        onFilterChange={updateFilter}
        onResetFilters={resetFilters}
      />
    </DashboardShell>
  );
}
