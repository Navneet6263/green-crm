import { buildQueryPath } from "../../leads/shared/leadPageFormatters";
import { LEAD_STATUS_COLORS, getLeadStatusLabel } from "../../../lib/leadStatus";

const COMPACT_FORMATTER = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatDashboardCount(value) {
  const safeValue = Number(value || 0);
  return safeValue >= 1000 ? COMPACT_FORMATTER.format(safeValue) : safeValue.toLocaleString("en-IN");
}

export function formatDashboardPercent(value, total) {
  const safeTotal = Number(total || 0);
  if (!safeTotal) {
    return "0%";
  }

  return `${Math.round((Number(value || 0) / safeTotal) * 100)}%`;
}

export function buildLeadDrilldownHref(params = {}) {
  return buildQueryPath("/leads", params);
}

export function getStatusChartColor(status, index = 0) {
  const palette = ["#8b5cf6", "#33c5dc", "#d7a13d", "#10b981", "#f08441", "#4f8cff", "#22c55e", "#ef4444"];
  return LEAD_STATUS_COLORS[String(status || "").toLowerCase()] || palette[index % palette.length];
}

export function normalizeStatusDistribution(distribution = []) {
  return distribution.map((item, index) => ({
    ...item,
    label: getLeadStatusLabel(item.status),
    color: getStatusChartColor(item.status, index),
  }));
}
