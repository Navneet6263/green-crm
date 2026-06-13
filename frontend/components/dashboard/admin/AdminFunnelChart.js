"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AdminChartTooltip from "./AdminChartTooltip";
import { getStatusChartColor } from "./adminDashboardUtils";

export default function AdminFunnelChart({ data, onStageClick }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 12, left: 12, bottom: 0 }}
          onClick={(state) => {
            const point = state?.activePayload?.[0]?.payload;
            if (point && onStageClick) onStageClick(point);
          }}
        >
          <CartesianGrid stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
          <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} width={92}
            tick={{ fill: "#0f172a", fontSize: 12, fontWeight: 600 }} />
          <Tooltip content={<AdminChartTooltip />} cursor={{ fill: "rgba(59,130,246,0.04)" }} />
          <Bar dataKey="total" name="Leads" radius={[0, 10, 10, 0]}>
            {data.map((entry, index) => (
              <Cell key={`${entry.key}-${entry.total}`} fill={getStatusChartColor(entry.status, index)} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
