"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
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
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-600">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900">₹{formatDashboardCount(payload[0].value)}</p>
    </div>
  );
};

export default function AdminPaymentTrendChart({ data = [] }) {
  if (!data?.length) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-slate-100 bg-slate-50">
        <span className="text-sm font-medium text-slate-500">No payment data available</span>
      </div>
    );
  }

  const peak = findPeakDay(data);
  const total = getTotalPayments(data);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {total > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Total</span>
            <span className="text-[13px] font-black text-slate-900">₹{formatDashboardCount(total)}</span>
          </div>
        )}
        {peak && Number(peak.total) > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <span className="text-sm">🔥</span>
            <span className="text-[11px] font-bold text-emerald-700">
              Peak: ₹{formatDashboardCount(peak.total)} on {peak.label}
            </span>
          </div>
        )}
      </div>
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="lightPaymentFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }}
              tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} width={55} />
            <Tooltip content={<LightTooltip />} cursor={{ stroke: "rgba(16,185,129,0.15)", strokeDasharray: "4 4" }} />
            <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2.5} fillOpacity={1}
              fill="url(#lightPaymentFill)" activeDot={{ r: 6, strokeWidth: 2, fill: "#10b981", stroke: "#ffffff", className: "drop-shadow-[0_4px_8px_rgba(16,185,129,0.5)]" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
