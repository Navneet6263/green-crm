import React from "react";
import AdminChartPanel from "./AdminChartPanel";
import AdminLeadTrendChart from "./AdminLeadTrendChart";
import AdminFunnelChart from "./AdminFunnelChart";
import AdminStatusDonutChart from "./AdminStatusDonutChart";
import AdminDemoTrendChart from "./AdminDemoTrendChart";
import { buildLeadDrilldownHref } from "./adminDashboardUtils";

export default function AdminDashboardCharts({
  leadTrend, funnel, statusDistribution, demoTrend,
  paymentTrend, convertedSourceMix, openLeadList, buildDateHref, filterMeta,
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
    <div className="space-y-3">
      {/* Row 1: Lead Trend + Funnel */}
      <div className="grid gap-3 xl:grid-cols-2">
        <AdminChartPanel eyebrow="Growth" title="Lead Trend" copy="Track lead creation over time. Click any point to drill in.">
          <AdminLeadTrendChart data={leadTrend}
            onPointClick={(p) => openLeadList(buildDateHref(p.key, p.key, filterMeta))} />
        </AdminChartPanel>
        <AdminChartPanel eyebrow="Pipeline" title="Demo Funnel" copy="Lead distribution across funnel stages.">
          <AdminFunnelChart data={funnel} onStageClick={handleFunnelClick} />
        </AdminChartPanel>
      </div>

      {/* Row 2: Status Donut + Demo Trend */}
      <div className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <AdminChartPanel eyebrow="Distribution" title="Status Mix" copy="Where the pipeline is concentrated.">
          <AdminStatusDonutChart data={statusDistribution}
            onSegmentClick={(item) => openLeadList(buildLeadDrilldownHref({ status: item.status, ...filterMeta }))} />
        </AdminChartPanel>
        <AdminChartPanel eyebrow="Daily" title="Booked Demo Trend" copy="Day-by-day booked demo comparison.">
          <AdminDemoTrendChart data={demoTrend}
            onBarClick={(p) => openLeadList(buildDateHref(p.key, p.key, { status: "booked-demo", ...filterMeta }))} />
        </AdminChartPanel>
      </div>

    </div>
  );
}
