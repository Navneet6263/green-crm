"use client";

import Link from "next/link";
import LeadTrendChart from "./LeadTrendChart";
import StageFunnelChart from "./StageFunnelChart";
import ManagerLeadSources from "./ManagerLeadSources";
import ManagerPipelineCards from "./ManagerPipelineCards";
import { compact, countByStatus, titleize } from "./manager-utils";
import { ChartCard, ProgressRow } from "./ManagerDashboardPrimitives";

const STAGE_COLORS = ["#7C3AED", "#6D28D9", "#3B82F6", "#14B8A6", "#F59E0B", "#EF4444", "#8B5CF6", "#8B5CF6", "#22C55E"];

function FullReportBtn({ href }) {
  return (
    <Link href={href} prefetch={false} className="rounded-xl border border-[#F59E0B] px-3 py-1.5 text-xs font-semibold text-[#F59E0B] transition hover:bg-amber-50">
      Full Report
    </Link>
  );
}

function SectionHeader({ title, meta, href }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {meta ? <p className="mt-0.5 text-xs font-semibold text-[#7C3AED]">{meta}</p> : null}
      </div>
      {href ? <FullReportBtn href={href} /> : null}
    </div>
  );
}

function TotalLeadsCard({ trendData }) {
  return (
    <ChartCard>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Total Leads Overview</h2>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F59E0B]">
            <span className="inline-block h-0.5 w-5 rounded-full bg-[#F59E0B]" />
            This period
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <span className="inline-block h-0 w-5 border-t-2 border-dashed border-slate-300" />
            By stage
          </span>
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 outline-none">
            <option>This Month</option>
          </select>
        </div>
      </div>
      <LeadTrendChart data={trendData} color="#F59E0B" />
    </ChartCard>
  );
}

function StageFunnelCard({ funnelData }) {
  return (
    <ChartCard>
      <SectionHeader title="Stage Funnel" meta="pipeline flow" href="/workflow" />
      <StageFunnelChart data={funnelData} />
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {funnelData.slice(0, 5).map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
            {item.label} <b className="text-slate-950">{compact(item.value)}</b>
          </span>
        ))}
      </div>
    </ChartCard>
  );
}

function StageBreakdownCard({ funnelData, totalLeads }) {
  return (
    <ChartCard>
      <SectionHeader title="Stage Breakdown" href="/workflow" />
      <div className="space-y-3">
        {funnelData.map((item) => (
          <ProgressRow
            key={item.label}
            color={item.color}
            label={item.label}
            dot
            percent={totalLeads ? Math.round((item.value / totalLeads) * 100) : 0}
            value={compact(item.value)}
          />
        ))}
      </div>
    </ChartCard>
  );
}

export default function ManagerChartsSection(props) {
  const funnelData = props.statusOrder.map((status, index) => ({
    label: titleize(status),
    value: countByStatus(props.leadCounts, status),
    color: STAGE_COLORS[index % STAGE_COLORS.length],
  }));
  const trendData = funnelData.map((item) => ({ label: item.label.slice(0, 4), value: item.value }));

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <TotalLeadsCard trendData={trendData} />
        <StageFunnelCard funnelData={funnelData} />
        <ManagerLeadSources sourceMix={props.sourceMix} />
      </div>
      <div className="space-y-4">
        <StageBreakdownCard funnelData={funnelData} totalLeads={props.totalLeads} />
        <ManagerPipelineCards {...props} />
      </div>
    </div>
  );
}
