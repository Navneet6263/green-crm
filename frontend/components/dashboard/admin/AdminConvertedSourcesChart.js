"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const LIGHT_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#f43f5e", "#06b6d4"];

const LightTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl flex items-center gap-3">
      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: payload[0].payload.fill }} />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{payload[0].name}</p>
        <p className="text-base font-black text-slate-900">{payload[0].value} Converted</p>
      </div>
    </div>
  );
};

export default function AdminConvertedSourcesChart({ data = [] }) {
  if (!data?.length) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-slate-100 bg-slate-50">
        <span className="text-sm font-medium text-slate-500">No conversion sources</span>
      </div>
    );
  }

  const chartData = data.map((item, index) => ({
    name: item.lead_source || "Unknown",
    value: Number(item.total),
    fill: LIGHT_COLORS[index % LIGHT_COLORS.length],
  }));

  return (
    <div className="h-[280px] w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<LightTooltip />} />
          <Legend verticalAlign="bottom" height={36} iconType="circle"
            wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }} />
          <Pie data={chartData} cx="50%" cy="45%" innerRadius={62} outerRadius={88}
            paddingAngle={3} dataKey="value" stroke="#ffffff" strokeWidth={2} isAnimationActive={true}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.9} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-9">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Sources</p>
      </div>
    </div>
  );
}
