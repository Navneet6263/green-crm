import React from "react";
import AdminChartPanel from "./AdminChartPanel";
import AdminLeadTrendChart from "./AdminLeadTrendChart";
import AdminFunnelChart from "./AdminFunnelChart";
import AdminStatusDonutChart from "./AdminStatusDonutChart";
import AdminDemoTrendChart from "./AdminDemoTrendChart";
import { buildLeadDrilldownHref } from "./adminDashboardUtils";

export default function AdminDashboardCharts({
  leadTrend,
  funnel,
  statusDistribution,
  demoTrend,
  openLeadList,
  buildDateHref,
  filterMeta,
}) {
  function handleFunnelClick(item) {
    const mapping = {
      new: buildLeadDrilldownHref({ status: "new", ...filterMeta }),
      contacted: buildLeadDrilldownHref({ quick_filter: "working", ...filterMeta }),
      "booked-demo": buildLeadDrilldownHref({ status: "booked-demo", ...filterMeta }),
      "demo-done": buildLeadDrilldownHref({ status: "demo-done", ...filterMeta }),
      "closed-won": buildLeadDrilldownHref({ status: "closed-won", ...filterMeta }),
    };

    openLeadList(mapping[item?.key] || "/leads");
  }

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-2">
        <AdminChartPanel
          eyebrow="Growth Trend"
          title="Lead Trend"
          copy="Track lead creation over time. Click any point to open that day's lead list."
        >
          <AdminLeadTrendChart
            data={leadTrend}
            onPointClick={(point) => openLeadList(buildDateHref(point.key, point.key, filterMeta))}
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
            onSegmentClick={(item) => openLeadList(buildLeadDrilldownHref({ status: item.status, ...filterMeta }))}
          />
        </AdminChartPanel>

        <AdminChartPanel
          eyebrow="Daily Comparison"
          title="Booked Demo Trend"
          copy="Compare booked demos day by day. Click a bar to drill into that day's booked demos."
        >
          <AdminDemoTrendChart
            data={demoTrend}
            onBarClick={(point) => openLeadList(buildDateHref(point.key, point.key, { status: "booked-demo", ...filterMeta }))}
          />
        </AdminChartPanel>
      </div>
    </>
  );
}
