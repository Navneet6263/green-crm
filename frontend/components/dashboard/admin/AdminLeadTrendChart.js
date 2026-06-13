"use client";

import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AdminChartTooltip from "./AdminChartTooltip";

export default function AdminLeadTrendChart({ data, onPointClick }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          onClick={(state) => {
            const point = state?.activePayload?.[0]?.payload;
            if (point && onPointClick) onPointClick(point);
          }}
        >
          <defs>
            <linearGradient id="adminLeadTrendFillLight" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
          <Tooltip content={<AdminChartTooltip />} cursor={{ stroke: "rgba(59,130,246,0.15)", strokeDasharray: "4 4" }} />
          <Area type="monotone" dataKey="total" fill="url(#adminLeadTrendFillLight)" stroke="none" />
          <Line
            type="monotone"
            dataKey="total"
            name="Leads"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ r: 4, fill: "#ffffff", stroke: "#3b82f6", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 2, className: "drop-shadow-[0_4px_8px_rgba(59,130,246,0.5)]" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
