"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../components/dashboard/DashboardShell";
import DashboardIcon from "../../components/dashboard/icons";
import { apiRequest } from "../../lib/api";
import { loadSession } from "../../lib/session";

const ROLES = ["admin", "manager", "marketing"];
const COLORS = ["#2f6fdd", "#0f8c53", "#b96a00", "#c4356b", "#6d46d6", "#3e8bff"];

const money = (value) => `INR ${Number(value || 0).toLocaleString("en-IN")}`;
const short = (value) => String(value || "").split("-").filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function buildTrend(leads, range) {
  const now = new Date();
  if (range === "week") {
    return [...Array(7)].map((_, index) => {
      const date = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index)));
      const label = date.toLocaleDateString("en-IN", { weekday: "short" });
      const items = leads.filter((lead) => startOfDay(lead.created_at).getTime() === date.getTime());
      const converted = items.filter((lead) => ["closed-won", "converted", "closed"].includes(lead.status)).length;
      return { label, leads: items.length, converted, rate: items.length ? Math.round((converted / items.length) * 100) : 0 };
    });
  }

  const count = range === "month" ? 4 : range === "quarter" ? 3 : 6;
  return [...Array(count)].map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    const label = date.toLocaleDateString("en-IN", { month: "short" });
    const items = leads.filter((lead) => { const created = new Date(lead.created_at); return created.getMonth() === date.getMonth() && created.getFullYear() === date.getFullYear(); });
    const converted = items.filter((lead) => ["closed-won", "converted", "closed"].includes(lead.status)).length;
    return { label, leads: items.length, converted, rate: items.length ? Math.round((converted / items.length) * 100) : 0 };
  });
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null), [range, setRange] = useState("month"), [summary, setSummary] = useState({}), [leads, setLeads] = useState([]), [customers, setCustomers] = useState([]), [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");

  async function loadAnalytics(activeSession, nextRange = range) {
    setLoading(true); setError("");
    try {
      const [summaryRes, leadRes, customerRes, notificationRes] = await Promise.all([
        apiRequest("/dashboard/summary", { token: activeSession.token }),
        apiRequest("/leads?page_size=200", { token: activeSession.token }),
        apiRequest("/customers?page_size=200", { token: activeSession.token }),
        apiRequest("/notifications?page_size=12", { token: activeSession.token }),
      ]);
      setSummary(summaryRes || {}); setLeads(leadRes.items || []); setCustomers(customerRes.items || []); setNotifications(notificationRes.items || []);
      setRange(nextRange);
    } catch (requestError) { setError(requestError.message); } finally { setLoading(false); }
  }

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) return router.replace("/login");
    if (!ROLES.includes(activeSession.user?.role)) return router.replace("/dashboard");
    setSession(activeSession);
    loadAnalytics(activeSession, range);
  }, [router]);

  const filteredLeads = useMemo(() => {
    const now = new Date();
    const days = { week: 7, month: 31, quarter: 92, year: 365 }[range] || 31;
    return leads.filter((lead) => {
      const created = new Date(lead.created_at);
      return !Number.isNaN(created.getTime()) && now.getTime() - created.getTime() <= days * 86400000;
    });
  }, [leads, range]);

  const trend = useMemo(() => buildTrend(filteredLeads, range), [filteredLeads, range]);
  const sourceMix = useMemo(() => {
    const map = new Map();
    filteredLeads.forEach((lead) => { const key = lead.lead_source || "other"; map.set(key, (map.get(key) || 0) + 1); });
    return [...map.entries()].map(([name, value], index) => ({ name: short(name), value, color: COLORS[index % COLORS.length] })).sort((a, b) => b.value - a.value);
  }, [filteredLeads]);
  const sourceTotal = sourceMix.reduce((sum, item) => sum + item.value, 0);
  const sourceGradient = useMemo(() => {
    let cursor = 0;
    return sourceMix.map((item) => { const start = cursor; cursor += sourceTotal ? (item.value / sourceTotal) * 360 : 0; return `${item.color} ${start}deg ${cursor}deg`; }).join(", ");
  }, [sourceMix, sourceTotal]);
  const salesTrend = useMemo(() => trend.map((item) => { const deals = filteredLeads.filter((lead) => ["closed-won", "converted", "closed"].includes(lead.status) && new Date(lead.created_at).toLocaleDateString("en-IN", range === "week" ? { weekday: "short" } : { month: "short" }) === item.label); const actual = deals.reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0); return { ...item, actual, target: actual ? Math.round(actual * 1.18) : 50000 }; }), [filteredLeads, range, trend]);
  const kpis = useMemo(() => {
    const converted = filteredLeads.filter((lead) => ["closed-won", "converted", "closed"].includes(lead.status));
    return [
      { label: "Total Leads", value: filteredLeads.length, color: "#2f6fdd", icon: "users" },
      { label: "Conversion Rate", value: `${filteredLeads.length ? Math.round((converted.length / filteredLeads.length) * 100) : 0}%`, color: "#0f8c53", icon: "analytics" },
      { label: "Average Deal", value: money(converted.length ? converted.reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0) / converted.length : 0), color: "#b96a00", icon: "finance" },
      { label: "Customers", value: customers.length, color: "#6d46d6", icon: "customers" },
    ];
  }, [customers.length, filteredLeads]);
  const recent = summary.recent_activity?.length ? summary.recent_activity : notifications.map((item) => ({ activity_id: item.notif_id, activity_type: item.type, message: item.message, company_name: item.title, created_at: item.created_at }));

  const heroStats = kpis.map((item) => ({ label: item.label, value: item.value, color: item.color }));

  function exportCsv() {
    const rows = [["Metric", "Value"], ...kpis.map((item) => [item.label, item.value]), [""], ["Period", "Leads", "Converted", "Rate"], ...trend.map((item) => [item.label, item.leads, item.converted, `${item.rate}%`])];
    const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <DashboardShell session={session} title="Analytics" eyebrow="Performance Snapshot" heroStats={heroStats}>
      {error ? <div className="alert error">{error}</div> : null}
      {loading ? <div className="alert">Loading analytics...</div> : null}
      {!loading ? (
        <section className="analytics-shell">
          <article className="analytics-toolbar">
            <div>
              <span className="lead-kicker">Revenue View</span>
              <h2>Performance analytics</h2>
              <p>Track lead quality, conversion movement, source mix, and commercial output from one screen.</p>
            </div>
            <div className="analytics-toolbar-actions">
              <div className="analytics-range">
                {["week", "month", "quarter", "year"].map((item) => <button key={item} className={range === item ? "active" : ""} type="button" onClick={() => loadAnalytics(session, item)}>{short(item)}</button>)}
              </div>
              <button className="button ghost" type="button" onClick={() => loadAnalytics(session, range)}><DashboardIcon name="analytics" />Refresh</button>
              <button className="button primary" type="button" onClick={exportCsv}><DashboardIcon name="documents" />Export CSV</button>
            </div>
          </article>

          <section className="analytics-kpi-grid">
            {kpis.map((item) => <article className="analytics-kpi-card" key={item.label}><div><span>{item.label}</span><strong>{item.value}</strong></div><div className="analytics-kpi-icon" style={{ color: item.color }}><DashboardIcon name={item.icon} /></div></article>)}
          </section>

          <section className="analytics-chart-grid">
            <article className="analytics-card">
              <div className="panel-header"><h2>Lead conversion</h2></div>
              <div className="analytics-bars">
                {trend.map((item) => <div className="analytics-bar-row" key={item.label}><div className="analytics-bar-label"><strong>{item.label}</strong><span>{item.rate}% rate</span></div><div className="analytics-bar-stack"><div className="analytics-bar-track"><span style={{ width: `${Math.min(100, item.leads * 12)}%`, background: "#2f6fdd" }} /></div><div className="analytics-bar-track subtle"><span style={{ width: `${item.leads ? (item.converted / item.leads) * 100 : 0}%`, background: "#0f8c53" }} /></div></div></div>)}
              </div>
            </article>

            <article className="analytics-card">
              <div className="panel-header"><h2>Revenue vs target</h2></div>
              <div className="analytics-bars">
                {salesTrend.map((item) => <div className="analytics-bar-row" key={item.label}><div className="analytics-bar-label"><strong>{item.label}</strong><span>{money(item.actual)}</span></div><div className="analytics-bar-stack"><div className="analytics-bar-track"><span style={{ width: "100%", background: "rgba(109,70,214,.18)" }} /></div><div className="analytics-bar-track floating"><span style={{ width: `${Math.min(100, item.target ? (item.actual / item.target) * 100 : 0)}%`, background: "#0f8c53" }} /></div></div></div>)}
              </div>
            </article>

            <article className="analytics-card">
              <div className="panel-header"><h2>Lead sources</h2></div>
              <div className="analytics-donut-wrap">
                <div className="analytics-donut" style={{ background: sourceGradient ? `conic-gradient(${sourceGradient})` : "rgba(18,33,28,.08)" }}><span>{sourceTotal}</span><small>sources</small></div>
                <div className="analytics-source-list">{sourceMix.map((item) => <div className="analytics-source-row" key={item.name}><span className="analytics-source-dot" style={{ background: item.color }} /><strong>{item.name}</strong><span>{item.value}</span></div>)}</div>
              </div>
            </article>
          </section>

          <article className="analytics-card">
            <div className="panel-header"><h2>Recent activity</h2></div>
            <div className="analytics-activity-list">
              {recent.length ? recent.slice(0, 8).map((item) => <div className="analytics-activity-row" key={item.activity_id}><div className="analytics-activity-icon"><DashboardIcon name="message" /></div><div><strong>{item.company_name || "Activity"}</strong><p>{item.message || "No message available."}</p></div><span>{short(item.activity_type || "update")}</span></div>) : <p className="muted">No recent activity available.</p>}
            </div>
          </article>
        </section>
      ) : null}
    </DashboardShell>
  );
}
