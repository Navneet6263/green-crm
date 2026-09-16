import { compact, money, titleize, STATUS_TONE, WORKFLOW_TONE } from "./analytics-utils.js";

const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4"];

export function buildServerDeck(response, customerCount, recent = []) {
  const rows = response?.rows || [];
  const groups = dimension => rows.filter(row => row.dimension === dimension);
  const total = groups("total")[0] || {};
  const mix = (dimension, tones = {}) => groups(dimension).sort((a, b) => b.leads - a.leads).map((row, i) => ({
    key: row.key, label: row.label || titleize(row.key), value: Number(row.leads),
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
    ownerBoard: groups("owner").sort((a, b) => b.leads - a.leads).slice(0, 6).map(row => ({ label: row.label, leads: Number(row.leads), value: Number(row.value) })),
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

export function buildServerFocus(response) {
  const m = response?.metrics || {};
  return { leads: response?.items || [], metrics: [
    { label: "Focused Leads", value: compact(m.total) },
    { label: "Focused Value", value: money(m.value) },
    { label: "Overdue Follow-up", value: compact(m.overdue) },
    { label: "No Owner", value: compact(m.no_owner) },
  ] };
}
