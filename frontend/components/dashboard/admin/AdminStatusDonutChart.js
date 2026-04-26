"use client";

import { Cell, Label, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import AdminChartTooltip from "./AdminChartTooltip";
import { formatDashboardCount, formatDashboardPercent, normalizeStatusDistribution } from "./adminDashboardUtils";

export default function AdminStatusDonutChart({ data, onSegmentClick }) {
  const normalized = normalizeStatusDistribution(data);
  const total = normalized.reduce((sum, item) => sum + Number(item.total || 0), 0);

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<AdminChartTooltip />} />
            <Pie
              data={normalized}
              dataKey="total"
              nameKey="label"
              innerRadius={76}
              outerRadius={116}
              paddingAngle={2}
              stroke="rgba(255,255,255,0.92)"
              strokeWidth={4}
              onClick={(entry) => onSegmentClick?.(entry)}
            >
              <Label
                content={({ viewBox }) => {
                  const cx = Number(viewBox?.cx || 0);
                  const cy = Number(viewBox?.cy || 0);

                  return (
                    <g>
                      <text x={cx} y={cy - 6} textAnchor="middle" className="fill-[#0f172a] text-[26px] font-black">
                        {formatDashboardCount(total)}
                      </text>
                      <text x={cx} y={cy + 18} textAnchor="middle" className="fill-[#64748b] text-[11px] font-semibold uppercase tracking-[0.22em]">
                        Total Leads
                      </text>
                    </g>
                  );
                }}
              />
              {normalized.map((entry) => (
                <Cell key={entry.status} fill={`url(#status-gradient-${entry.status})`} />
              ))}
            </Pie>
            <defs>
              {normalized.map((entry) => (
                <linearGradient key={entry.status} id={`status-gradient-${entry.status}`} x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor={entry.color} stopOpacity="0.94" />
                  <stop offset="100%" stopColor={entry.color} stopOpacity="0.62" />
                </linearGradient>
              ))}
            </defs>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        {normalized.map((item) => (
          <button
            key={item.status}
            type="button"
            className="flex w-full cursor-pointer items-center justify-between rounded-[22px] border border-white/70 bg-white/78 px-4 py-3 text-left shadow-[0_14px_30px_rgba(33,48,74,0.08)] backdrop-blur-xl transition duration-200 ease-out hover:scale-[1.02] hover:border-[#ddd0be] hover:bg-white"
            onClick={() => onSegmentClick?.(item)}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate text-sm font-semibold text-[#0f172a]">{item.label}</span>
              </div>
              <p className="mt-1 text-xs text-[#64748b]">{formatDashboardPercent(item.total, total)} of visible lead base</p>
            </div>
            <strong className="text-lg font-black text-[#0f172a]">{formatDashboardCount(item.total)}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}
