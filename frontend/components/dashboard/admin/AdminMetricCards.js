import React from "react";
import AdminMetricCard from "./AdminMetricCard";

export default function AdminMetricCards({ metricCards }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {metricCards.map((card) => (
        <AdminMetricCard key={card.label} {...card} />
      ))}
    </div>
  );
}
