"use client";

import { Cell, Label, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import AdminChartTooltip from "./AdminChartTooltip";
import { formatDashboardCount, formatDashboardPercent, normalizeStatusDistribution } from "./adminDashboardUtils";

export default function AdminStatusDonutChart({ data, onSegmentClick }) {
  const normalized = normalizeStatusDistribution(data);
  const total = normalized.reduce((sum, item) => sum + Number(item.total || 0), 0);

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<AdminChartTooltip />} />
            <Pie data={normalized} dataKey="total" nameKey="label" innerRadius={72} outerRadius={108}
              paddingAngle={2} stroke="#ffffff" strokeWidth={3}
              onClick={(entry) => onSegmentClick?.(entry)}>
              <Label
                content={({ viewBox }) => {
                  const cx = Number(viewBox?.cx || 0);
                  const cy = Number(viewBox?.cy || 0);
                  return (
                    <g>
                      <text x={cx} y={cy - 6} textAnchor="middle" className="fill-slate-900 text-[24px] font-black">
                        {formatDashboardCount(total)}
                      </text>
                      <text x={cx} y={cy + 16} textAnchor="middle" className="fill-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">
                        Total Leads
                      </text>
                    </g>
                  );
                }}
              />
              {normalized.map((entry) => (
                <Cell key={entry.status} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
        {normalized.map((item) => (
          <button key={item.status} type="button"
            className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
            onClick={() => onSegmentClick?.(item)}>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate text-sm font-semibold text-slate-900">{item.label}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">{formatDashboardPercent(item.total, total)} of pipeline</p>
            </div>
            <strong className="text-lg font-black text-slate-900">{formatDashboardCount(item.total)}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}
