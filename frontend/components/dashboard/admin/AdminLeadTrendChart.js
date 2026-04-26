"use client";

import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import AdminChartTooltip from "./AdminChartTooltip";

export default function AdminLeadTrendChart({ data, onPointClick }) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          onClick={(state) => {
            const point = state?.activePayload?.[0]?.payload;
            if (point && onPointClick) {
              onPointClick(point);
            }
          }}
        >
          <defs>
            <linearGradient id="adminLeadTrendStroke" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="adminLeadTrendFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <Tooltip content={<AdminChartTooltip />} cursor={{ stroke: "rgba(99,102,241,0.18)", strokeDasharray: "4 4" }} />
          <Area type="monotone" dataKey="total" fill="url(#adminLeadTrendFill)" stroke="none" />
          <Line
            type="monotone"
            dataKey="total"
            name="Leads"
            stroke="url(#adminLeadTrendStroke)"
            strokeWidth={3}
            dot={{ r: 4, fill: "#ffffff", stroke: "#38bdf8", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#6366f1", stroke: "#ffffff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
