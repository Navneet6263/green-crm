"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import AdminTeamSwitcher from "../../../components/dashboard/admin/AdminTeamSwitcher";
import AdminAdvancedFilters from "../../../components/dashboard/admin/AdminAdvancedFilters";
import AdminHeroStats from "../../../components/dashboard/admin/AdminHeroStats";
import AdminWorkflowFinancials from "../../../components/dashboard/admin/AdminWorkflowFinancials";
import AdminDashboardCharts from "../../../components/dashboard/admin/AdminDashboardCharts";
import AdminMetricCards from "../../../components/dashboard/admin/AdminMetricCards";
import AdminInsightCards from "../../../components/dashboard/admin/AdminInsightCards";
import AdminChartPanel from "../../../components/dashboard/admin/AdminChartPanel";
import AdminPaymentTrendChart from "../../../components/dashboard/admin/AdminPaymentTrendChart";
import AdminSourceIntelligence from "../../../components/dashboard/admin/AdminSourceIntelligence";
import { buildMetricCards, buildInsightCards } from "../../../components/dashboard/admin/adminDashboardCards";
import {
  buildLeadDrilldownHref,
  formatDashboardCount,
  formatDashboardPercent,
  getStatusTotal,
  buildDateHref,
} from "../../../components/dashboard/admin/adminDashboardUtils";

const EMPTY_FILTERS = { from_date: "", to_date: "", status: "", priority: "", lead_source: "", product_id: "" };

export default function AdminDashboard() {
  const router = useRouter();
  const [selectedTeamId, setSelectedTeamId] = useState("all");
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const resetFilters = () => setFilters(EMPTY_FILTERS);

  const getFilterQueryString = () => {
    const params = new URLSearchParams();
    if (selectedTeamId !== "all") params.set("team_ids", selectedTeamId);
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  };

  return (
    <WorkspacePage
      title="Admin Dashboard"
      eyebrow="Company Workspace"
      hideTitle
      allowedRoles={["admin"]}
      requestBuilder={() => [{ key: "summary", path: `/dashboard/summary?${getFilterQueryString()}` }]}
      requestDeps={[selectedTeamId, filters]}
      heroStats={() => []}
    >
      {({ session, data, error, loading }) => (
        <AdminDashboardContent
          session={session} data={data} error={error} loading={loading}
          filters={filters} setFilters={setFilters} resetFilters={resetFilters}
          selectedTeamId={selectedTeamId} setSelectedTeamId={setSelectedTeamId}
          router={router}
        />
      )}
    </WorkspacePage>
  );
}

function AdminDashboardContent({
  session, data, error, loading,
  filters, setFilters, resetFilters,
  selectedTeamId, setSelectedTeamId, router,
}) {
  const summary = data?.summary || {};
  const kpis = summary.kpis || {};
  const charts = summary.charts || {};
  const insights = summary.insights || {};
  const leadTrend = charts.lead_trend || [];
  const demoTrend = charts.demo_trend || [];
  const paymentTrend = charts.payment_trend || [];
  const funnel = charts.funnel || [];
  const statusDistribution = charts.status_distribution || summary.lead_counts || [];
  const convertedSourceMix = summary.converted_source_mix || [];
  const sourceMix = summary.source_mix || [];
  const totalVisibleLeads = statusDistribution.reduce((s, i) => s + Number(i.total || 0), 0);
  const todayKey = leadTrend[leadTrend.length - 1]?.key || "";
  const firstTrendKey = leadTrend[0]?.key || todayKey;
  const demoDoneCount = getStatusTotal(statusDistribution, "demo-done");
  const bookedDemoCount = getStatusTotal(statusDistribution, "booked-demo");
  const closedWonCount = Number(kpis.closed_won || 0);
  const bookedDemoCardMeta = `${formatDashboardCount(kpis.booked_demo_today)} today`;
  const winRate = formatDashboardPercent(closedWonCount, totalVisibleLeads);
  const demoCompletionRate = formatDashboardPercent(demoDoneCount, bookedDemoCount + demoDoneCount);

  const filterMeta = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ""));
  const metricCards = buildMetricCards(kpis, todayKey, firstTrendKey, filterMeta, bookedDemoCardMeta);
  const insightCards = buildInsightCards(insights, filterMeta);

  function openLeadList(href) { router.push(href); }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-16 shadow-sm">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span className="text-sm font-medium text-slate-500">Building command center...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</div>}

      {/* Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Command Center</h2>
          <p className="text-xs text-slate-500">Real-time pipeline intelligence</p>
        </div>
        <AdminTeamSwitcher session={session} selectedTeamId={selectedTeamId} onTeamChange={setSelectedTeamId} />
      </div>

      <AdminAdvancedFilters filters={filters} setFilters={setFilters} onReset={resetFilters}
        products={summary.recent_products || []} />

      {/* KPI Strip + Hero Stats */}
      <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminMetricCards metricCards={metricCards} />
        <AdminHeroStats totalVisibleLeads={totalVisibleLeads} winRate={winRate}
          demoDoneCount={demoDoneCount} demoCompletionRate={demoCompletionRate} />
      </div>

      {/* Payment Analytics + Source Intelligence */}
      <div className="grid gap-3 xl:grid-cols-2">
        <AdminChartPanel eyebrow="Financial" title="Payment Trend" copy="Daily inflow of advance payments.">
          <AdminPaymentTrendChart data={paymentTrend} />
        </AdminChartPanel>
        <AdminSourceIntelligence sourceMix={sourceMix} convertedSourceMix={convertedSourceMix} />
      </div>

      <AdminWorkflowFinancials workflowSummary={summary.workflow_summary} />

      <AdminDashboardCharts
        leadTrend={leadTrend} funnel={funnel} statusDistribution={statusDistribution}
        demoTrend={demoTrend} paymentTrend={paymentTrend} convertedSourceMix={convertedSourceMix}
        openLeadList={openLeadList} buildDateHref={buildDateHref} filterMeta={filterMeta}
      />

      <AdminInsightCards insightCards={insightCards} />
    </div>
  );
}
