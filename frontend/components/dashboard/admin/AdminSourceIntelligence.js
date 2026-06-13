"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const LIGHT_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#f43f5e", "#06b6d4", "#6366f1"];

function getConversionRate(sourceData, convertedData) {
  const convertedMap = {};
  (convertedData || []).forEach((item) => {
    convertedMap[String(item.lead_source || "").toLowerCase()] = Number(item.total || 0);
  });

  return (sourceData || []).map((item, index) => {
    const source = String(item.lead_source || "Unknown");
    const total = Number(item.total || 0);
    const converted = convertedMap[source.toLowerCase()] || 0;
    const rate = total > 0 ? Math.round((converted / total) * 100) : 0;
    return { source, total, converted, rate, color: LIGHT_COLORS[index % LIGHT_COLORS.length] };
  });
}

const LightTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600">{d.source}</p>
      <p className="mt-1 text-sm text-slate-900">
        Total: <strong>{d.total}</strong> → Won: <strong className="text-emerald-600">{d.converted}</strong>
      </p>
      <p className="mt-0.5 text-xs text-slate-500">Conversion: {d.rate}%</p>
    </div>
  );
};

export default function AdminSourceIntelligence({ sourceMix = [], convertedSourceMix = [] }) {
  const enriched = getConversionRate(sourceMix, convertedSourceMix);

  if (!enriched.length) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-slate-100 bg-slate-50">
        <span className="text-sm font-medium text-slate-500">No source data available</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Source Intelligence</p>
        <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Where Leads Convert</h3>
        <p className="mt-1 text-xs text-slate-500">Total leads by source vs closed-won conversions.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={enriched} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <XAxis dataKey="source" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} interval={0} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
              <Tooltip content={<LightTooltip />} cursor={{ fill: "rgba(59,130,246,0.04)" }} />
              <Bar dataKey="total" name="Total" radius={[6, 6, 0, 0]} fillOpacity={0.2}>
                {enriched.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
              <Bar dataKey="converted" name="Won" radius={[6, 6, 0, 0]}>
                {enriched.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          {enriched.map((item) => (
            <div key={item.source} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 transition-all duration-200 hover:bg-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-sm font-medium text-slate-900 truncate">{item.source}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-slate-500">{item.total}→{item.converted}</span>
                <span className="rounded-full px-2 py-0.5 text-[11px] font-black"
                  style={{
                    color: item.rate >= 20 ? "#059669" : item.rate >= 10 ? "#d97706" : "#e11d48",
                    backgroundColor: item.rate >= 20 ? "#d1fae5" : item.rate >= 10 ? "#fef3c7" : "#ffe4e6",
                  }}>
                  {item.rate}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
