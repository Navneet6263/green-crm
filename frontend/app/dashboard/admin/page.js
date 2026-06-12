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
import { buildMetricCards, buildInsightCards } from "../../../components/dashboard/admin/adminDashboardCards";
import {
  buildLeadDrilldownHref,
  formatDashboardCount,
  formatDashboardPercent,
  getStatusTotal,
  buildDateHref,
} from "../../../components/dashboard/admin/adminDashboardUtils";

const PAGE_SURFACE =
  "relative overflow-hidden rounded-[30px] border border-white/75 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.13),transparent_28%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(250,244,235,0.96)_52%,rgba(247,240,229,0.98)_100%)] p-5 text-[#0f172a] shadow-[0_22px_60px_rgba(33,48,74,0.10)] backdrop-blur-xl md:p-6";

export default function AdminDashboard() {
  const router = useRouter();
  const [selectedTeamId, setSelectedTeamId] = useState("all");
  const [filters, setFilters] = useState({
    from_date: "",
    to_date: "",
    status: "",
    priority: "",
    lead_source: "",
    product_id: "",
  });

  const resetFilters = () => {
    setFilters({
      from_date: "",
      to_date: "",
      status: "",
      priority: "",
      lead_source: "",
      product_id: "",
    });
  };

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
      requestBuilder={() => [
        { 
          key: "summary", 
          path: `/dashboard/summary?${getFilterQueryString()}` 
        }
      ]}
      requestDeps={[selectedTeamId, filters]}
      heroStats={() => []}
    >
      {({ session, data, error, loading }) => {
        const summary = data?.summary || {};
        const kpis = summary.kpis || {};
        const charts = summary.charts || {};
        const insights = summary.insights || {};
        const leadTrend = charts.lead_trend || [];
        const demoTrend = charts.demo_trend || [];
        const funnel = charts.funnel || [];
        const statusDistribution = charts.status_distribution || summary.lead_counts || [];
        const totalVisibleLeads = statusDistribution.reduce((sum, item) => sum + Number(item.total || 0), 0);
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

        function openLeadList(href) {
          router.push(href);
        }

        if (loading) {
          return (
            <div className={PAGE_SURFACE}>
              <div className="flex items-center gap-3 py-10 text-sm text-[#64748b]">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" />
                Building the admin command center...
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-5">
            {error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}

            <div className="flex justify-end mb-2">
              <AdminTeamSwitcher session={session} selectedTeamId={selectedTeamId} onTeamChange={setSelectedTeamId} />
            </div>

            <AdminAdvancedFilters 
              filters={filters} 
              setFilters={setFilters} 
              onReset={resetFilters} 
              products={summary.recent_products || []}
            />

            <section className={PAGE_SURFACE}>
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_22%)]" />
              <div className="relative grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#93816a]">Revenue Pulse</p>
                    <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-[#0f172a] md:text-4xl">
                      See lead growth, demo momentum, and pipeline action in one scan.
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-[#64748b]">
                      Every number here is driven from lead status. Admins can spot inflow, booked demos, demo completions, and closure pressure without opening five screens.
                    </p>
                  </div>

                  <AdminMetricCards metricCards={metricCards} />
                </div>

                <AdminHeroStats 
                  totalVisibleLeads={totalVisibleLeads}
                  winRate={winRate}
                  demoDoneCount={demoDoneCount}
                  demoCompletionRate={demoCompletionRate}
                />
              </div>
            </section>

            <AdminWorkflowFinancials workflowSummary={summary.workflow_summary} />

            <AdminDashboardCharts 
              leadTrend={leadTrend}
              funnel={funnel}
              statusDistribution={statusDistribution}
              demoTrend={demoTrend}
              openLeadList={openLeadList}
              buildDateHref={buildDateHref}
              filterMeta={filterMeta}
            />

            <AdminInsightCards insightCards={insightCards} />
          </div>
        );
      }}
    </WorkspacePage>
  );
}
