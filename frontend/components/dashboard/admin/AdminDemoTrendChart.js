"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AdminChartTooltip from "./AdminChartTooltip";

export default function AdminDemoTrendChart({ data, onBarClick }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          onClick={(state) => {
            const point = state?.activePayload?.[0]?.payload;
            if (point && onBarClick) onBarClick(point);
          }}
        >
          <defs>
            <linearGradient id="adminDemoBarLight" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
          <Tooltip content={<AdminChartTooltip />} cursor={{ fill: "rgba(245,158,11,0.06)" }} />
          <Bar dataKey="total" name="Booked demos" fill="url(#adminDemoBarLight)" radius={[8, 8, 2, 2]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
