"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import AdminChartTooltip from "./AdminChartTooltip";

export default function AdminDemoTrendChart({ data, onBarClick }) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          onClick={(state) => {
            const point = state?.activePayload?.[0]?.payload;
            if (point && onBarClick) {
              onBarClick(point);
            }
          }}
        >
          <defs>
            <linearGradient id="adminDemoBar" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#67e8f9" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <Tooltip content={<AdminChartTooltip />} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
          <Bar dataKey="total" name="Booked demos" fill="url(#adminDemoBar)" radius={[12, 12, 4, 4]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
