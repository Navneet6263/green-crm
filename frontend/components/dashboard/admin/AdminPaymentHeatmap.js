"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { formatDashboardCount } from "./adminDashboardUtils";

function findPeakDay(data) {
  if (!data?.length) return null;
  return data.reduce((best, item) => (Number(item.total || 0) > Number(best.total || 0) ? item : best), data[0]);
}

function getTotalPayments(data) {
  return (data || []).reduce((sum, item) => sum + Number(item.total || 0), 0);
}

const LightTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900">₹{formatDashboardCount(payload[0].value)}</p>
    </div>
  );
};

export default function AdminPaymentHeatmap({ data = [] }) {
  if (!data?.length) return null;

  const peak = findPeakDay(data);
  const peakValue = Number(peak?.total || 0);
  const totalPayments = getTotalPayments(data);
  const avgPayment = data.length > 0 ? Math.round(totalPayments / data.length) : 0;

  if (peakValue <= 0 && totalPayments <= 0) return null;

  const chartData = data.map((item) => ({
    ...item,
    isPeak: item.key === peak?.key && peakValue > 0,
  }));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Payment Analytics</p>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Daily Revenue Map</h3>
        </div>
        <div className="flex items-center gap-3">
          {peakValue > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5">
              <span className="text-sm">🔥</span>
              <span className="text-[11px] font-black text-emerald-700">
                Best: ₹{formatDashboardCount(peakValue)} · {peak.label}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Total</p>
          <p className="mt-0.5 text-lg font-black text-slate-900">₹{formatDashboardCount(totalPayments)}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Avg/Day</p>
          <p className="mt-0.5 text-lg font-black text-slate-900">₹{formatDashboardCount(avgPayment)}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Days</p>
          <p className="mt-0.5 text-lg font-black text-slate-900">{data.length}</p>
        </div>
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }}
              tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} width={50} />
            <Tooltip content={<LightTooltip />} cursor={{ fill: "rgba(59,130,246,0.04)" }} />
            {avgPayment > 0 && (
              <ReferenceLine y={avgPayment} stroke="#94a3b8" strokeDasharray="4 4" strokeOpacity={0.6} />
            )}
            <Bar dataKey="total" radius={[8, 8, 2, 2]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.isPeak ? "#10b981" : "#3b82f6"} fillOpacity={entry.isPeak ? 0.9 : 0.4} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
