"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardIcon from "../../../components/dashboard/icons";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import { apiRequest } from "../../../lib/api";
import { ROLE_HOME_ROUTE } from "../../../lib/roles";
import { loadSession } from "../../../lib/session";

const OK_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager", "sales", "marketing", "viewer"];
const PAGE_SIZE_OPTIONS = [10, 15];
const PANEL_CLASS = "rounded-[30px] border border-[#eadfcd] bg-white/84 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const SOFT_PANEL_CLASS = "rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4";
const INPUT_CLASS = "w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none transition placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const BUTTON_CLASS = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710] disabled:cursor-not-allowed disabled:opacity-60";
const PRIMARY_BUTTON_CLASS = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2.5 text-sm font-semibold text-[#060710] shadow-[0_16px_30px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f] disabled:cursor-not-allowed disabled:opacity-60";
const KICKER_CLASS = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";

const STATUS_TONE = {
  new: "border-sky-200 bg-sky-50 text-sky-700",
  contacted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  qualified: "border-teal-200 bg-teal-50 text-teal-700",
  proposal: "border-[#eadfcd] bg-white text-[#7c6d55]",
  negotiation: "border-amber-200 bg-amber-50 text-amber-700",
  "closed-won": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "closed-lost": "border-rose-200 bg-rose-50 text-rose-700",
};

const PRIORITY_TONE = {
  low: "border-sky-200 bg-sky-50 text-sky-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-rose-200 bg-rose-50 text-rose-700",
  urgent: "border-rose-200 bg-rose-50 text-rose-700",
};

function qp(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      query.set(key, value);
    }
  });
  const search = query.toString();
  return search ? `${path}?${search}` : path;
}

function formatMoney(value) {
  return `INR ${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatDate(value, withTime = false) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString(
    "en-IN",
    withTime
      ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
      : { day: "numeric", month: "short", year: "numeric" }
  );
}

function nice(value) {
  return String(value || "--")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initials(contact, company, email) {
  return String(contact || company || email || "Lead")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "L";
}

function sourceLabel(value) {
  return nice(value || "website");
}

function normalizeMeta(meta = {}, page = 1, pageSize = 15) {
  return {
    page: Number(meta.page || page || 1),
    page_size: Number(meta.page_size || pageSize || 15),
    total: Number(meta.total || 0),
    total_pages: Math.max(Number(meta.total_pages || 1), 1),
  };
}

export default function LeadHistoryPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leads, setLeads] = useState([]);
  const [meta, setMeta] = useState({ page: 1, page_size: 15, total: 0, total_pages: 1 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [workflowFilter, setWorkflowFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  async function loadLeadHistory(activeSession, nextPage = page, nextPageSize = pageSize) {
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest(
        qp("/leads", {
          page: nextPage,
          page_size: nextPageSize,
          search: search.trim() || undefined,
          status: statusFilter,
        }),
        { token: activeSession.token }
      );

      setLeads(response.items || []);
      setMeta(normalizeMeta(response.meta, nextPage, nextPageSize));
    } catch (requestError) {
      setError(requestError.message);
      setLeads([]);
      setMeta({ page: nextPage, page_size: nextPageSize, total: 0, total_pages: 1 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) {
      router.replace("/login");
      return;
    }
    if (!OK_ROLES.includes(activeSession.user?.role)) {
      router.replace(ROLE_HOME_ROUTE[activeSession.user?.role] || "/dashboard");
      return;
    }
    setSession(activeSession);
  }, [router]);

  useEffect(() => {
    if (!session?.token) return;
    loadLeadHistory(session, page, pageSize);
  }, [page, pageSize, search, session, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, search, statusFilter]);

  const filteredLeads = useMemo(() => {
    const nextLeads = leads.filter((lead) => workflowFilter === "all" || (lead.workflow_stage || "sales") === workflowFilter);

    nextLeads.sort((left, right) => {
      if (sortBy === "oldest") {
        return new Date(left.created_at || 0) - new Date(right.created_at || 0);
      }
      if (sortBy === "value") {
        return Number(right.estimated_value || 0) - Number(left.estimated_value || 0);
      }
      if (sortBy === "follow-up") {
        const leftTime = left.follow_up_date ? new Date(left.follow_up_date).getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.follow_up_date ? new Date(right.follow_up_date).getTime() : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      }
      return new Date(right.updated_at || right.created_at || 0) - new Date(left.updated_at || left.created_at || 0);
    });

    return nextLeads;
  }, [leads, sortBy, workflowFilter]);

  const stageRows = useMemo(() => {
    const bucket = filteredLeads.reduce((acc, lead) => {
      const key = lead.workflow_stage || "sales";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(bucket)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4);
  }, [filteredLeads]);

  const sourceRows = useMemo(() => {
    const bucket = filteredLeads.reduce((acc, lead) => {
      const key = lead.lead_source || "website";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(bucket)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4);
  }, [filteredLeads]);

  const latestLead = filteredLeads[0];
  const followUpGap = filteredLeads.filter((lead) => !lead.follow_up_date).length;
  const highPriority = filteredLeads.filter((lead) => String(lead.priority || "medium").toLowerCase() === "high").length;
  const totalVisible = meta.total || 0;
  const totalPages = Math.max(Number(meta.total_pages || 1), 1);
  const showingFrom = totalVisible ? (page - 1) * pageSize + 1 : 0;
  const showingTo = totalVisible ? Math.min((page - 1) * pageSize + filteredLeads.length, totalVisible) : 0;

  return (
    <DashboardShell session={session} title="Lead History" hideTitle heroStats={[]}>
      <div className="mx-auto grid max-w-[1320px] gap-5">
        {error ? (
          <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-[22px] border border-[#eadfcd] bg-white px-5 py-4 text-sm font-semibold text-[#6f614c]">
            Loading lead history...
          </div>
        ) : null}

        {!loading ? (
          <>
            <section className={PANEL_CLASS}>
              <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr] xl:items-start">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className={KICKER_CLASS}>Lead History Desk</span>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-[2rem] font-semibold tracking-tight text-[#060710] md:text-[2.5rem]">
                        Timeline
                      </h2>
                      <span className="rounded-full border border-[#eadfcd] bg-[#fffaf1] px-3 py-1 text-sm font-semibold text-[#7c6d55]">
                        Page {page} of {totalPages}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[minmax(220px,1.35fr)_minmax(150px,0.7fr)_minmax(150px,0.7fr)_minmax(150px,0.7fr)_minmax(120px,0.45fr)]">
                    <label className="grid gap-2">
                      <span className={KICKER_CLASS}>Search</span>
                      <div className="relative">
                        <DashboardIcon name="leads" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#95856a]" />
                        <input
                          className={`${INPUT_CLASS} pl-11`}
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search company, contact, source"
                        />
                      </div>
                    </label>
                    <label className="grid gap-2">
                      <span className={KICKER_CLASS}>Status</span>
                      <select className={INPUT_CLASS} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                        <option value="all">All statuses</option>
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="proposal">Proposal</option>
                        <option value="negotiation">Negotiation</option>
                        <option value="closed-won">Closed Won</option>
                        <option value="closed-lost">Closed Lost</option>
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className={KICKER_CLASS}>Workflow</span>
                      <select className={INPUT_CLASS} value={workflowFilter} onChange={(event) => setWorkflowFilter(event.target.value)}>
                        <option value="all">Current page</option>
                        <option value="sales">Sales</option>
                        <option value="legal">Legal</option>
                        <option value="finance">Finance</option>
                        <option value="completed">Completed</option>
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className={KICKER_CLASS}>Sort</span>
                      <select className={INPUT_CLASS} value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                        <option value="recent">Latest activity</option>
                        <option value="oldest">Oldest first</option>
                        <option value="value">Highest value</option>
                        <option value="follow-up">Nearest follow-up</option>
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className={KICKER_CLASS}>Rows</span>
                      <select
                        className={INPUT_CLASS}
                        value={String(pageSize)}
                        onChange={(event) => setPageSize(Number(event.target.value))}
                      >
                        {PAGE_SIZE_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option} / page</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
                  <div className={SOFT_PANEL_CLASS}>
                    <span className={KICKER_CLASS}>Showing</span>
                    <strong className="mt-3 block text-lg font-black text-[#060710]">
                      {showingFrom}-{showingTo} of {totalVisible}
                    </strong>
                    <p className="mt-2 text-sm leading-6 text-[#756752]">All lead history is now available through paged navigation.</p>
                  </div>
                  <div className={SOFT_PANEL_CLASS}>
                    <span className={KICKER_CLASS}>No Follow-up</span>
                    <strong className="mt-3 block text-3xl font-black text-[#060710]">{followUpGap}</strong>
                    <p className="mt-2 text-sm leading-6 text-[#756752]">Current page leads still missing a scheduled next action.</p>
                  </div>
                  <div className={SOFT_PANEL_CLASS}>
                    <span className={KICKER_CLASS}>High Priority</span>
                    <strong className="mt-3 block text-3xl font-black text-[#060710]">{highPriority}</strong>
                    <p className="mt-2 text-sm leading-6 text-[#756752]">Urgent leads visible on the current page.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-5 2xl:grid-cols-[1.3fr_0.7fr]">
              <div className="space-y-4">
                {filteredLeads.length ? filteredLeads.map((lead) => {
                  const statusTone = STATUS_TONE[String(lead.status || "new").toLowerCase()] || "border-[#eadfcd] bg-white text-[#7c6d55]";
                  const priorityTone = PRIORITY_TONE[String(lead.priority || "medium").toLowerCase()] || "border-[#eadfcd] bg-white text-[#7c6d55]";
                  const preview = lead.latest_note || lead.requirements || "No note or brief captured yet.";

                  return (
                    <article key={lead.lead_id} className={`${PANEL_CLASS} flex flex-col gap-4`}>
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-[#10111d] text-base font-black text-white shadow-[0_16px_28px_rgba(6,7,16,0.18)]">
                            {initials(lead.contact_person, lead.company_name, lead.email)}
                          </div>
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap gap-2">
                              <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${statusTone}`}>
                                {nice(lead.status)}
                              </span>
                              <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${priorityTone}`}>
                                {nice(lead.priority || "medium")}
                              </span>
                              <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fffaf1] px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                                {nice(lead.workflow_stage || "sales")}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <h3 className="truncate text-[1.35rem] font-black tracking-tight text-[#060710]">
                                {lead.company_name || lead.contact_person || "Unnamed lead"}
                              </h3>
                              <p className="mt-1 text-sm text-[#756752]">
                                {lead.contact_person || "--"}{lead.email ? ` · ${lead.email}` : ""}{lead.phone ? ` · ${lead.phone}` : ""}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 xl:justify-end">
                          <Link href={`/leads/${lead.lead_id}`} className={BUTTON_CLASS}>
                            <DashboardIcon name="message" className="h-4 w-4" />
                            View Lead
                          </Link>
                          <Link href={`/leads/${lead.lead_id}/edit`} className={PRIMARY_BUTTON_CLASS}>
                            <DashboardIcon name="settings" className="h-4 w-4" />
                            Edit
                          </Link>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className={SOFT_PANEL_CLASS}>
                          <span className={KICKER_CLASS}>Source</span>
                          <strong className="mt-3 block text-sm font-black text-[#060710]">{sourceLabel(lead.lead_source)}</strong>
                        </div>
                        <div className={SOFT_PANEL_CLASS}>
                          <span className={KICKER_CLASS}>Owner</span>
                          <strong className="mt-3 block text-sm font-black text-[#060710]">{lead.assigned_to_name || "Unassigned"}</strong>
                        </div>
                        <div className={SOFT_PANEL_CLASS}>
                          <span className={KICKER_CLASS}>Created</span>
                          <strong className="mt-3 block text-sm font-black text-[#060710]">{formatDate(lead.created_at)}</strong>
                        </div>
                        <div className={SOFT_PANEL_CLASS}>
                          <span className={KICKER_CLASS}>Value</span>
                          <strong className="mt-3 block text-sm font-black text-[#060710]">{formatMoney(lead.estimated_value)}</strong>
                        </div>
                      </div>

                      <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
                        <div className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className={KICKER_CLASS}>Latest Context</span>
                            <span className="text-xs font-semibold text-[#8c7f69]">
                              Updated {formatDate(lead.updated_at || lead.created_at, true)}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-7 text-[#675944]">{preview}</p>
                        </div>
                        <div className="rounded-[24px] border border-[#eadfcd] bg-[linear-gradient(135deg,#fffdf8_0%,#fff4dc_100%)] px-4 py-4">
                          <span className={KICKER_CLASS}>Follow-up Window</span>
                          <strong className="mt-3 block text-lg font-black text-[#060710]">
                            {formatDate(lead.follow_up_date, true)}
                          </strong>
                          <p className="mt-2 text-sm leading-6 text-[#756752]">
                            {lead.follow_up_date ? "Next action is already placed on the lead timeline." : "No follow-up date has been booked yet."}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                }) : (
                  <article className={`${PANEL_CLASS} grid min-h-[280px] place-items-center text-center`}>
                    <div className="space-y-3">
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-[20px] bg-[#fff4d9] text-[#8d6e27]">
                        <DashboardIcon name="leads" className="h-6 w-6" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-black text-[#060710]">No history matched these filters</h3>
                        <p className="max-w-lg text-sm leading-6 text-[#756752]">
                          Change the search, stage, or status filters to bring the timeline back into view.
                        </p>
                      </div>
                    </div>
                  </article>
                )}

                <div className={`${PANEL_CLASS} flex flex-col gap-4 md:flex-row md:items-center md:justify-between`}>
                  <div className="space-y-1">
                    <span className={KICKER_CLASS}>Queue Paging</span>
                    <p className="text-sm text-[#756752]">
                      Showing {showingFrom}-{showingTo} of {totalVisible} lead records.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className={BUTTON_CLASS}
                      onClick={() => setPage((current) => Math.max(current - 1, 1))}
                      disabled={page <= 1}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className={PRIMARY_BUTTON_CLASS}
                      onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                      disabled={page >= totalPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <article className={PANEL_CLASS}>
                  <div className="mb-4">
                    <span className={KICKER_CLASS}>Stage Pulse</span>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Workflow pressure</h3>
                  </div>
                  <div className="space-y-3">
                    {stageRows.length ? stageRows.map(([stage, count]) => {
                      const width = Math.max(18, Math.round((count / Math.max(filteredLeads.length || 1, 1)) * 100));
                      return (
                        <div key={stage} className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <strong className="text-sm font-semibold text-[#060710]">{nice(stage)}</strong>
                            <span className="text-sm font-black text-[#8d6e27]">{count}</span>
                          </div>
                          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
                            <div className="h-full rounded-full bg-[linear-gradient(90deg,#f3dfab_0%,#d7b258_100%)]" style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      );
                    }) : (
                      <div className={SOFT_PANEL_CLASS}>No workflow movement visible on this page.</div>
                    )}
                  </div>
                </article>

                <article className={PANEL_CLASS}>
                  <div className="mb-4">
                    <span className={KICKER_CLASS}>Source Watch</span>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Lead acquisition mix</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sourceRows.length ? sourceRows.map(([source, count]) => (
                      <span key={source} className="inline-flex rounded-full border border-[#eadfcd] bg-[#fffaf1] px-3 py-1.5 text-sm font-semibold text-[#6f614c]">
                        {sourceLabel(source)} · {count}
                      </span>
                    )) : (
                      <span className="text-sm text-[#756752]">No source data visible on this page.</span>
                    )}
                  </div>
                </article>

                <article className={PANEL_CLASS}>
                  <div className="mb-4">
                    <span className={KICKER_CLASS}>Latest Move</span>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Recent update</h3>
                  </div>
                  <div className={SOFT_PANEL_CLASS}>
                    <strong className="block text-lg font-black text-[#060710]">
                      {latestLead ? `${latestLead.company_name || latestLead.contact_person || "Lead"} · ${nice(latestLead.status)}` : "--"}
                    </strong>
                    <p className="mt-2 text-sm leading-6 text-[#756752]">
                      {latestLead ? formatDate(latestLead.updated_at || latestLead.created_at, true) : "No lead activity loaded."}
                    </p>
                  </div>
                </article>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}
