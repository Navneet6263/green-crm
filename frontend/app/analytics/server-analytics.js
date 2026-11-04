import { compact, money, titleize, STATUS_TONE, WORKFLOW_TONE } from "./analytics-utils.js";

// Categorical colours, in a fixed order (checked for colour-blind separation).
export const COLORS = ["#009a8c", "#3b6fd8", "#d9467c", "#b98300", "#8a55e6", "#e06a10"];

export function buildServerDeck(response, customerCount, recent = []) {
  const rows = response?.rows || [];
  const groups = dimension => rows.filter(row => row.dimension === dimension);
  const total = groups("total")[0] || {};
  const mix = (dimension, tones = {}) => groups(dimension).sort((a, b) => b.leads - a.leads).map((row, i) => ({
    key: row.key, label: row.label || titleize(row.key), value: Number(row.leads), won: Number(row.won || 0),
    amount: Number(row.value || 0), openValue: Number(row.open_value || 0), wonValue: Number(row.won_value || 0),
    color: COLORS[i % COLORS.length], tone: tones[row.key] || "bg-slate-100 text-slate-700 ring-slate-200",
  }));
  const statusMix = mix("status", STATUS_TONE);
  const workflowMix = mix("workflow", WORKFLOW_TONE);
  const sourceMix = mix("source");
  const options = dimension => (response?.options || []).filter(row => row.dimension === dimension)
    .map(row => ({ value: row.key, label: row.label || titleize(row.key) })).sort((a, b) => a.label.localeCompare(b.label));
  const days = new Map(groups("day").map(row => [row.key, row]));
  const trend = [];
  if (response?.from_date && response?.to_date) {
    const cursor = new Date(response.from_date);
    cursor.setUTCHours(0, 0, 0, 0);
    const end = new Date(response.to_date);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      const row = days.get(key) || {};
      trend.push({ label: key, leads: Number(row.leads || 0), closed: Number(row.won || 0), value: Number(row.value || 0) });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  // Keep charts readable on small screens: at most 13 monthly or 5 weekly bars.
  let chartTrend = trend;
  if (trend.length > 35) {
    const months = new Map();
    trend.forEach(row => {
      const key = row.label.slice(0, 7);
      const item = months.get(key) || { label: key, leads: 0, closed: 0, value: 0 };
      item.leads += row.leads; item.closed += row.closed; item.value += row.value;
      months.set(key, item);
    });
    chartTrend = [...months.values()];
  } else if (trend.length > 8) {
    chartTrend = [];
    for (let i = 0; i < trend.length; i += 7) {
      const batch = trend.slice(i, i + 7);
      chartTrend.push({ label: batch[0].label.slice(5), leads: batch.reduce((n,r)=>n+r.leads,0), closed: batch.reduce((n,r)=>n+r.closed,0), value: batch.reduce((n,r)=>n+r.value,0) });
    }
  } else chartTrend = trend.map(row => ({ ...row, label: row.label.slice(5) }));
  return {
    filterOptions: { owners: options("owner"), products: options("product"), priorities: options("priority"), sources: options("source") },
    statusMix, workflowMix, sourceMix, trend: chartTrend, recent,
    focusDefaults: { status: statusMix[0]?.key || "", workflow: workflowMix[0]?.key || "" },
    ownerBoard: groups("owner").sort((a, b) => b.leads - a.leads).slice(0, 8).map(row => ({ key: row.key, label: row.label || "Unassigned", leads: Number(row.leads), won: Number(row.won || 0), value: Number(row.value), openValue: Number(row.open_value || 0), wonValue: Number(row.won_value || 0) })),
    // Raw numbers and the day-by-day series (weeks past 62 days, months past 120) for the charts.
    totals: { leads: Number(total.leads || 0), won: Number(total.won || 0), open: Number(total.open_leads || 0), value: Number(total.value || 0), wonValue: Number(total.won_value || 0), openValue: Number(total.open_value || 0), customers: customerCount },
    series: seriesFor(trend),
    kpis: [
      { label: "Matching Leads", value: compact(total.leads), hint: "All accessible matches", icon: "users" },
      { label: "Won Lead Value", value: money(total.won_value), hint: "Current won status; created in range", icon: "finance" },
      { label: "Open Pipeline", value: money(total.open_value), hint: "Excludes won and lost leads", icon: "workflow" },
      { label: "Customers", value: customerCount === null ? "—" : compact(customerCount), hint: "Accessible customers, all time", icon: "customers" },
    ],
    topCards: [
      { label: "Won Share", value: `${total.leads ? Math.round(100 * total.won / total.leads) : 0}%`, hint: "Won / leads created in range" },
      { label: "Avg Won Deal", value: money(total.won ? total.won_value / total.won : 0), hint: "Estimated value, not collections" },
      { label: "Active Sources", value: compact(sourceMix.length), hint: "Sources in current matches" },
      { label: "Open Leads", value: compact(total.open_leads), hint: "Excludes won and lost leads" },
    ],
  };
}

/** Daily points, rolled into weeks or months when the period is long. */
function seriesFor(trend) {
  if (trend.length <= 62) return trend.map((r) => ({ ...r, date: r.label }));
  const byMonth = trend.length > 120;
  const map = new Map();
  for (const r of trend) {
    const d = new Date(`${r.label}T00:00:00Z`);
    if (!byMonth) d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const key = byMonth ? r.label.slice(0, 7) + "-01" : d.toISOString().slice(0, 10);
    const item = map.get(key) || { date: key, label: key, leads: 0, closed: 0, value: 0, unit: byMonth ? "month" : "week" };
    item.leads += r.leads; item.closed += r.closed; item.value += r.value;
    map.set(key, item);
  }
  return [...map.values()];
}

export function buildServerFocus(response) {
  const m = response?.metrics || {};
  return { leads: response?.items || [], metrics: [
    { label: "Focused Leads", value: compact(m.total) },
    { label: "Focused Value", value: money(m.value) },
    { label: "Overdue Follow-up", value: compact(m.overdue) },
    { label: "No Owner", value: compact(m.no_owner) },
  ] };
}
