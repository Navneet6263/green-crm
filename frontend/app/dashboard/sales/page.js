"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import DashboardIcon from "../../../components/dashboard/icons";

const STATUS_ORDER = ["new", "contacted", "qualified", "proposal", "negotiation", "closed-won"];

const STATUS_TONE = {
  new: "bg-sky-100 text-sky-700 ring-sky-200",
  contacted: "bg-cyan-100 text-cyan-700 ring-cyan-200",
  qualified: "bg-violet-100 text-violet-700 ring-violet-200",
  proposal: "bg-amber-100 text-amber-700 ring-amber-200",
  negotiation: "bg-orange-100 text-orange-700 ring-orange-200",
  "closed-won": "bg-emerald-100 text-emerald-700 ring-emerald-200",
  won: "bg-emerald-100 text-emerald-700 ring-emerald-200",
};

const QUICK_ACTIONS = [
  { href: "/leads", icon: "workflow", label: "Open Pipeline" },
  { href: "/tasks", icon: "tasks", label: "Task Board" },
];

function fmtCompact(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    notation: num >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(num);
}

function fmtCurrency(value) {
  return `INR ${Number(value || 0).toLocaleString("en-IN")}`;
}

function fmtDate(value, withTime = false) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function titleize(value = "") {
  return String(value)
    .replaceAll("_", "-")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function initials(value = "?") {
  return (
    String(value)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "?"
  );
}

function getStatusCount(leadCounts, status) {
  return Number(
    leadCounts.find((item) => item.status === status || (status === "closed-won" && item.status === "won"))?.total || 0
  );
}

function buildTrendSeries(leadCounts) {
  const baseSeries = STATUS_ORDER.map((status) => Math.max(getStatusCount(leadCounts, status), 0));
  const max = Math.max(...baseSeries, 1);

  return baseSeries.map((value, index) => ({
    label: titleize(STATUS_ORDER[index]),
    value,
    percent: Math.max(16, Math.round((value / max) * 100)),
  }));
}

function PanelTag({ children }) {
  return (
    <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
      {children}
    </span>
  );
}

function SalesChart({ items = [] }) {
  const width = 520;
  const height = 220;
  const padding = 18;
  const max = Math.max(...items.map((item) => item.value), 1);
  const points = items.map((item, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(items.length - 1, 1);
    const y = height - padding - ((item.value || 0) / max) * (height - padding * 2);
    return `${x},${y}`;
  });
  const areaPoints = [`${padding},${height - padding}`, ...points, `${width - padding},${height - padding}`].join(" ");

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[28px] border border-[#eadfcd] bg-white/80 p-4 shadow-[0_12px_34px_rgba(79,58,22,0.08)]">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
          <defs>
            <linearGradient id="salesAreaFill" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#d7b258" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#d7b258" stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {[0.2, 0.4, 0.6, 0.8].map((tick) => {
            const y = height - padding - tick * (height - padding * 2);
            return (
              <line
                key={tick}
                x1={padding}
                x2={width - padding}
                y1={y}
                y2={y}
                stroke="#ede5d6"
                strokeDasharray="4 8"
              />
            );
          })}

          <polygon points={areaPoints} fill="url(#salesAreaFill)" />
          <polyline points={points.join(" ")} fill="none" stroke="#cba952" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

          {items.map((item, index) => {
            const [x, y] = points[index].split(",").map(Number);
            return (
              <g key={item.label}>
                <circle cx={x} cy={y} r="6" fill="#060710" />
                <circle cx={x} cy={y} r="3" fill="#fff7e5" />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-[#eadfcd] bg-white/75 px-3 py-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8a7b64]">{item.label}</p>
            <p className="mt-2 text-lg font-bold text-[#060710]">{fmtCompact(item.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SalesDashboardView({ data, error, loading }) {
  const [query, setQuery] = useState("");
  const summary = data?.summary || {};
  const leads = data?.leads?.items || [];
  const tasks = data?.tasks?.items || [];
  const reminders = data?.reminders?.items || [];
  const leadCounts = summary.lead_counts || [];
  const totalLeads = leadCounts.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const contactedLeads = getStatusCount(leadCounts, "contacted") + getStatusCount(leadCounts, "qualified");
  const negotiationLeads = getStatusCount(leadCounts, "proposal") + getStatusCount(leadCounts, "negotiation");
  const closedLeads = getStatusCount(leadCounts, "closed-won");
  const trendSeries = useMemo(() => buildTrendSeries(leadCounts), [leadCounts]);
  const filteredLeads = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return leads;
    }

    return leads.filter((lead) =>
      [lead.company_name, lead.contact_person, lead.email, lead.phone, lead.lead_source, lead.product_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [leads, query]);
  const updates = useMemo(() => {
    const reminderItems = reminders.slice(0, 3).map((item) => ({
      key: item.reminder_id,
      title: item.company_name || "Lead reminder",
      subtitle: item.contact_person_name || "No contact on file",
      meta: fmtDate(item.due_at, true),
      tone: "bg-[#fff3d8] text-[#b17c18]",
    }));
    const taskItems = tasks.slice(0, 3).map((item) => ({
      key: item.task_id,
      title: item.title || "Untitled task",
      subtitle: titleize(item.type || item.status || "task"),
      meta: fmtDate(item.due_date, true),
      tone: "bg-[#ece9ff] text-[#6252c7]",
    }));

    return [...reminderItems, ...taskItems].slice(0, 5);
  }, [reminders, tasks]);

  const metrics = [
    { label: "Visible Leads", value: fmtCompact(totalLeads), hint: "Leads currently in your visible scope" },
    { label: "New Leads", value: fmtCompact(getStatusCount(leadCounts, "new")), hint: "Freshly added into your queue" },
    { label: "Contacted", value: fmtCompact(contactedLeads), hint: "Reached or qualified prospects" },
    { label: "Negotiation", value: fmtCompact(negotiationLeads), hint: "Proposal and negotiation stage" },
    { label: "Closed Deals", value: fmtCompact(closedLeads), hint: "Closed-won accounts" },
  ];

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}

      <section className="relative bg-[radial-gradient(circle_at_top_left,_rgba(247,240,227,0.72),_rgba(255,250,242,0.2)_42%,_rgba(255,250,242,0)_76%)]">
        <div className="px-0 pb-0 pt-2 md:pt-3">
          {loading ? (
            <div className="flex min-h-[520px] items-center justify-center gap-3 text-sm text-[#7f7059]">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#cba952] border-t-transparent" />
              Loading sales workspace...
            </div>
          ) : (
            <div className="space-y-6">
              <header className="flex justify-end">
                <div className="space-y-4 w-full xl:max-w-[520px]">
                  <label className="flex items-center gap-2 rounded-[24px] border border-[#eadfcd] bg-white/88 px-4 py-3 text-sm text-[#6f614c] shadow-[0_10px_22px_rgba(79,58,22,0.05)]">
                    <DashboardIcon name="leads" className="h-4 w-4 text-[#8f816a]" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search leads"
                      className="w-full border-0 bg-transparent p-0 text-sm text-[#060710] outline-none placeholder:text-[#9c8e76]"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {QUICK_ACTIONS.map((action) => (
                      <Link
                        key={action.href}
                        href={action.href}
                        className="flex items-center gap-2 rounded-[24px] border border-[#eadfcd] bg-white/88 px-3 py-3 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710]"
                      >
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f7f0e2] text-[#8d6e27]">
                          <DashboardIcon name={action.icon} className="h-4 w-4" />
                        </span>
                        <span>{action.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </header>

              <section className="grid gap-3 xl:grid-cols-5">
                {metrics.map((item, index) => (
                  <article
                    key={item.label}
                    className={`rounded-[24px] border border-[#eadfcd] p-4 shadow-[0_12px_28px_rgba(79,58,22,0.06)] ${
                      index === 0 ? "bg-[#fff6e4]" : "bg-white/82"
                    }`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8f816a]">
                      {item.label}
                    </p>
                    <p className="mt-4 text-2xl font-semibold tracking-tight text-[#060710]">
                      {item.value}
                    </p>
                    <p className="mt-2 text-xs text-[#8a7b64]">{item.hint}</p>
                  </article>
                ))}
              </section>

              <div className="grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
                <section className="rounded-[30px] border border-[#eadfcd] bg-white/72 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)]">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8f816a]">Performance Analytics</p>
                      <h3 className="mt-2 text-lg font-semibold text-[#060710]">Pipeline stage momentum</h3>
                    </div>
                    <PanelTag>Current Scope</PanelTag>
                  </div>
                  <SalesChart items={trendSeries} />
                </section>

                <section className="rounded-[30px] border border-[#eadfcd] bg-[#fffaf1] p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)]">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8f816a]">Important Updates</p>
                      <h3 className="mt-2 text-lg font-semibold text-[#060710]">Your queue today</h3>
                    </div>
                    <Link href="/tasks" className="text-xs font-semibold text-[#8d6e27] hover:text-[#060710]">
                      Open tasks
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {updates.length ? (
                      updates.map((item) => (
                        <div key={item.key} className="rounded-[22px] border border-[#eadfcd] bg-white/90 p-4">
                          <div className="flex items-start gap-3">
                            <span className={`mt-0.5 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${item.tone}`}>
                              Live
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[#060710]">{item.title}</p>
                              <p className="mt-1 truncate text-xs text-[#8f816a]">{item.subtitle}</p>
                            </div>
                            <span className="text-[11px] font-medium text-[#9c8e76]">{item.meta}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-white/70 px-5 py-12 text-center text-sm text-[#8f816a]">
                        No reminders or tasks queued right now.
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <section className="rounded-[30px] border border-[#eadfcd] bg-white/78 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)]">
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8f816a]">Recent Leads</p>
                    <h3 className="mt-2 text-lg font-semibold text-[#060710]">Lead roster in your visible sales scope</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <PanelTag>{fmtCompact(filteredLeads.length)} shown</PanelTag>
                    <Link href="/leads" className="rounded-full border border-[#ddd3c2] bg-white px-4 py-2 text-xs font-semibold text-[#5d503c] hover:text-[#060710]">
                      View all
                    </Link>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[26px] border border-[#eadfcd] bg-white">
                  <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)] gap-3 border-b border-[#efe6d8] bg-[#fbf6ec] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8f816a]">
                    <span>Lead Name</span>
                    <span>Source</span>
                    <span>Stage</span>
                    <span>Value</span>
                    <span>Last Activity</span>
                  </div>

                  <div className="divide-y divide-[#f0e8da]">
                    {filteredLeads.length ? (
                      filteredLeads.map((lead) => (
                        <Link
                          key={lead.lead_id}
                          href={`/leads/${lead.lead_id}`}
                          className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)] gap-3 px-4 py-4 text-sm transition hover:bg-[#fdf9f0]"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-2xl bg-[#f3e1ae] text-sm font-bold text-[#060710]">
                                {initials(lead.company_name || lead.contact_person)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-[#060710]">{lead.company_name || "Unnamed lead"}</p>
                                <p className="truncate text-xs text-[#8f816a]">{lead.contact_person || "No contact available"}</p>
                              </div>
                            </div>
                          </div>
                          <div className="min-w-0 py-1 text-[#6f614c]">{titleize(lead.lead_source || "Direct")}</div>
                          <div className="py-1">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${STATUS_TONE[lead.status] || "bg-[#f4efe5] text-[#6f614c] ring-[#e6dccb]"}`}>
                              {titleize(lead.status || "new")}
                            </span>
                          </div>
                          <div className="py-1 font-semibold text-[#060710]">{fmtCurrency(lead.estimated_value)}</div>
                          <div className="py-1 text-[#6f614c]">{fmtDate(lead.updated_at || lead.created_at, true)}</div>
                        </Link>
                      ))
                    ) : (
                      <div className="px-5 py-14 text-center text-sm text-[#8f816a]">No leads match the current search.</div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function SalesDashboard() {
  return (
    <WorkspacePage
      title="Sales Dashboard"
      eyebrow="Sales Workspace"
      allowedRoles={["sales"]}
      hideTitle
      requestBuilder={() => [
        { key: "summary", path: "/dashboard/summary" },
        { key: "leads", path: "/leads?page_size=8" },
        { key: "tasks", path: "/tasks?page_size=6" },
        { key: "reminders", path: "/leads/reminders?page_size=5" },
      ]}
    >
      {({ data, error, loading }) => (
        <SalesDashboardView
          data={data}
          error={error}
          loading={loading}
        />
      )}
    </WorkspacePage>
  );
}
