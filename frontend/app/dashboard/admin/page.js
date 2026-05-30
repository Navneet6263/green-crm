"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import AdminChartPanel from "../../../components/dashboard/admin/AdminChartPanel";
import AdminDemoTrendChart from "../../../components/dashboard/admin/AdminDemoTrendChart";
import AdminFunnelChart from "../../../components/dashboard/admin/AdminFunnelChart";
import AdminInsightCard from "../../../components/dashboard/admin/AdminInsightCard";
import AdminLeadTrendChart from "../../../components/dashboard/admin/AdminLeadTrendChart";
import AdminMetricCard from "../../../components/dashboard/admin/AdminMetricCard";
import AdminStatusDonutChart from "../../../components/dashboard/admin/AdminStatusDonutChart";
import {
  buildLeadDrilldownHref,
  formatDashboardCount,
  formatDashboardPercent,
} from "../../../components/dashboard/admin/adminDashboardUtils";
import { LEAD_OPEN_STATUSES } from "../../../lib/leadStatus";

const PAGE_SURFACE =
  "relative overflow-hidden rounded-[30px] border border-white/75 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.13),transparent_28%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(250,244,235,0.96)_52%,rgba(247,240,229,0.98)_100%)] p-5 text-[#0f172a] shadow-[0_22px_60px_rgba(33,48,74,0.10)] backdrop-blur-xl md:p-6";

const HERO_STAT_CARD =
  "rounded-[26px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(247,241,233,0.92))] p-5 shadow-[0_18px_42px_rgba(33,48,74,0.10)] backdrop-blur-xl transition duration-200 ease-out hover:scale-[1.02] hover:border-[#dbcdb8] hover:shadow-[0_24px_52px_rgba(33,48,74,0.14)]";

function getStatusTotal(items = [], status) {
  return Number(items.find((item) => item.status === status)?.total || 0);
}

function buildDateHref(fromDate, toDate, extra = {}) {
  if (!fromDate || !toDate) {
    return buildLeadDrilldownHref(extra);
  }

  return buildLeadDrilldownHref({
    from_date: fromDate,
    to_date: toDate,
    ...extra,
  });
}

export default function AdminDashboard() {
  const router = useRouter();

  return (
    <WorkspacePage
      title="Admin Dashboard"
      eyebrow="Company Workspace"
      hideTitle
      allowedRoles={["admin"]}
      requestBuilder={() => [{ key: "summary", path: "/dashboard/summary" }]}
      heroStats={() => []}
    >
      {({ data, error, loading }) => {
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

        const metricCards = [
          {
            label: "Today Leads",
            value: kpis.today_leads,
            accent: "#5eead4",
            note: "Fresh inflow created today. Click to inspect today's lead list.",
            href: buildDateHref(todayKey, todayKey),
          },
          {
            label: "Last 7 Days",
            value: kpis.last_7_days_leads,
            accent: "#60a5fa",
            note: "Recent lead velocity across the last 7 India business days.",
            href: buildDateHref(firstTrendKey, todayKey),
          },
          {
            label: "Open Pipeline",
            value: kpis.open_pipeline,
            accent: "#f59e0b",
            note: "All leads still live in pipeline stages and pending closure.",
            href: buildLeadDrilldownHref({ quick_filter: "active" }),
          },
          {
            label: "Closed Won",
            value: kpis.closed_won,
            accent: "#34d399",
            note: "Deals that have already converted to revenue-ready wins.",
            href: buildLeadDrilldownHref({ status: "closed-won" }),
          },
          {
            label: "Booked Demo",
            value: kpis.booked_demo_total,
            accent: "#a78bfa",
            note: "Demo-ready leads waiting in booked stage. Click for the full list.",
            meta: bookedDemoCardMeta,
            href: buildLeadDrilldownHref({ status: "booked-demo" }),
          },
        ];

        const insightCards = [
          {
            label: "High Priority Leads",
            value: insights.high_priority,
            copy: "Fast-touch deals with higher urgency or revenue pressure.",
            accent: "#f97316",
            href: buildLeadDrilldownHref({ priority: "high", quick_filter: "active" }),
          },
          {
            label: "No Follow-up Leads",
            value: insights.no_follow_up,
            copy: "Open leads without the next action date locked in.",
            accent: "#38bdf8",
            href: buildLeadDrilldownHref({ quick_filter: "active" }),
          },
          {
            label: "Unassigned Leads",
            value: insights.unassigned,
            copy: "Pipeline entries still missing a clear owner.",
            accent: "#facc15",
            href: buildLeadDrilldownHref({ quick_filter: "unassigned" }),
          },
          {
            label: "Pending Demo",
            value: insights.pending_demo,
            copy: "Booked demos that are not marked demo done yet.",
            accent: "#8b5cf6",
            href: buildLeadDrilldownHref({ status: "booked-demo" }),
          },
        ];

        function openLeadList(href) {
          router.push(href);
        }

        function handleFunnelClick(item) {
          const mapping = {
            new: buildLeadDrilldownHref({ status: "new" }),
            contacted: buildLeadDrilldownHref({ quick_filter: "working" }),
            "booked-demo": buildLeadDrilldownHref({ status: "booked-demo" }),
            "demo-done": buildLeadDrilldownHref({ status: "demo-done" }),
            "closed-won": buildLeadDrilldownHref({ status: "closed-won" }),
          };

          openLeadList(mapping[item?.key] || "/leads");
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

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {metricCards.map((card) => (
                      <AdminMetricCard key={card.label} {...card} />
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={HERO_STAT_CARD}>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#93816a]">Visible Lead Base</p>
                    <strong className="mt-4 block text-4xl font-black tracking-tight text-[#0f172a]">{formatDashboardCount(totalVisibleLeads)}</strong>
                    <p className="mt-3 text-sm leading-6 text-[#64748b]">
                      Includes all currently visible statuses from new through closed stages.
                    </p>
                  </div>
                  <div className={HERO_STAT_CARD}>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#93816a]">Win Rate</p>
                    <strong className="mt-4 block text-4xl font-black tracking-tight text-[#5eead4]">{winRate}</strong>
                    <p className="mt-3 text-sm leading-6 text-[#64748b]">
                      Closed won share across the visible lead base.
                    </p>
                  </div>
                  <div className={HERO_STAT_CARD}>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#93816a]">Demo Done</p>
                    <strong className="mt-4 block text-4xl font-black tracking-tight text-[#34d399]">{formatDashboardCount(demoDoneCount)}</strong>
                    <p className="mt-3 text-sm leading-6 text-[#64748b]">
                      Leads already moved from booked demo into completed demo status.
                    </p>
                  </div>
                  <div className={HERO_STAT_CARD}>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#93816a]">Demo Completion</p>
                    <strong className="mt-4 block text-4xl font-black tracking-tight text-[#a78bfa]">{demoCompletionRate}</strong>
                    <p className="mt-3 text-sm leading-6 text-[#64748b]">
                      Share of demo-stage leads already marked demo done.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative mt-6 flex flex-wrap gap-3">
                <Link
                  href={buildLeadDrilldownHref({ quick_filter: "active" })}
                  prefetch={false}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#d7c9b5] bg-white/85 px-4 text-sm font-semibold text-[#0f172a] shadow-[0_10px_24px_rgba(33,48,74,0.08)] transition duration-200 ease-out hover:scale-[1.02] hover:bg-white"
                >
                  Open Pipeline
                </Link>
                <Link
                  href={buildLeadDrilldownHref({ status: "booked-demo" })}
                  prefetch={false}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#cfc2f3] bg-[linear-gradient(90deg,rgba(224,231,255,0.92),rgba(236,254,255,0.92))] px-4 text-sm font-semibold text-[#4338ca] shadow-[0_10px_24px_rgba(33,48,74,0.08)] transition duration-200 ease-out hover:scale-[1.02] hover:brightness-[1.02]"
                >
                  Review Booked Demos
                </Link>
              </div>
            </section>

            {summary.workflow_summary && summary.workflow_summary.total_workflow_leads > 0 ? (
              <section className={PAGE_SURFACE}>
                <div className="mb-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#93816a]">Workflow Overview</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#0f172a]">Expert Workflow Financials</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748b]">
                    Real-time metrics for leads routed to external experts. Shows advance collections and pending payouts.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className={HERO_STAT_CARD}>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#93816a]">Total Received (Advance)</p>
                    <strong className="mt-4 block text-3xl font-black tracking-tight text-[#0f8c53]">
                      ₹{Number(summary.workflow_summary.total_advance_received || 0).toLocaleString("en-IN")}
                    </strong>
                    <p className="mt-3 text-xs text-[#64748b]">Advance amount processed from workflow leads.</p>
                  </div>
                  <div className={HERO_STAT_CARD}>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#93816a]">Total Pending</p>
                    <strong className="mt-4 block text-3xl font-black tracking-tight text-orange-600">
                      ₹{Number(summary.workflow_summary.total_remaining_payment || 0).toLocaleString("en-IN")}
                    </strong>
                    <p className="mt-3 text-xs text-[#64748b]">Remaining values to be recovered.</p>
                  </div>
                  <div className={HERO_STAT_CARD}>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#93816a]">Active Workflows</p>
                    <strong className="mt-4 block text-3xl font-black tracking-tight text-blue-600">
                      {summary.workflow_summary.active_workflow_leads || 0}
                    </strong>
                    <p className="mt-3 text-xs text-[#64748b]">Leads currently in progress, review or revisions.</p>
                  </div>
                  <div className={HERO_STAT_CARD}>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#93816a]">Completed Deliverables</p>
                    <strong className="mt-4 block text-3xl font-black tracking-tight text-[#0f8c53]">
                      {summary.workflow_summary.completed_workflow_leads || 0}
                    </strong>
                    <p className="mt-3 text-xs text-[#64748b]">Approved or delivered expert projects.</p>
                  </div>
                </div>
              </section>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-2">
              <AdminChartPanel
                eyebrow="Growth Trend"
                title="Lead Trend"
                copy="Track lead creation across the last 7 India business days. Click any point to open that day's lead list."
              >
                <AdminLeadTrendChart
                  data={leadTrend}
                  onPointClick={(point) => openLeadList(buildDateHref(point.key, point.key))}
                />
              </AdminChartPanel>

              <AdminChartPanel
                eyebrow="Demo Pipeline"
                title="Demo Funnel"
                copy="See how much of the lead base is sitting in working, booked demo, demo done, and won stages."
              >
                <AdminFunnelChart data={funnel} onStageClick={handleFunnelClick} />
              </AdminChartPanel>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <AdminChartPanel
                eyebrow="Status Mix"
                title="Status Distribution"
                copy="Understand where the current lead base is concentrated. Booked demo and demo done are highlighted in the mix."
              >
                <AdminStatusDonutChart
                  data={statusDistribution}
                  onSegmentClick={(item) => openLeadList(buildLeadDrilldownHref({ status: item.status }))}
                />
              </AdminChartPanel>

              <AdminChartPanel
                eyebrow="Daily Comparison"
                title="Booked Demo Trend"
                copy="Compare booked demos day by day for the last 7 business days. Click a bar to drill into that day's booked demos."
              >
                <AdminDemoTrendChart
                  data={demoTrend}
                  onBarClick={(point) => openLeadList(buildDateHref(point.key, point.key, { status: "booked-demo" }))}
                />
              </AdminChartPanel>
            </div>

            <section className={PAGE_SURFACE}>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#93816a]">Smart Insights</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#0f172a]">What needs action now.</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748b]">
                    These cards point to the specific pockets of pipeline risk that deserve immediate admin attention.
                  </p>
                </div>
                <p className="rounded-full border border-[#e4d9ca] bg-white/80 px-4 py-2 text-xs font-semibold text-[#64748b]">
                  {formatDashboardCount(LEAD_OPEN_STATUSES.length)} tracked open statuses
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {insightCards.map((card) => (
                  <AdminInsightCard key={card.label} {...card} />
                ))}
              </div>
            </section>
          </div>
        );
      }}
    </WorkspacePage>
  );
}
