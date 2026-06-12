import React from "react";
import AdminMetricCard from "./AdminMetricCard";

export default function AdminMetricCards({ metricCards }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {metricCards.map((card) => (
        <AdminMetricCard key={card.label} {...card} />
      ))}
    </div>
  );
}
