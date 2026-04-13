"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../dashboard/DashboardShell";
import DashboardIcon from "../dashboard/icons";
import { apiRequest } from "../../lib/api";
import { ROLE_HOME_ROUTE } from "../../lib/roles";
import { loadSession } from "../../lib/session";

const HERO = "rounded-[36px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(250,241,221,0.98)_44%,_rgba(245,231,193,0.98)_100%)] p-6 shadow-[0_24px_70px_rgba(79,58,22,0.08)] md:p-8";
const PANEL = "rounded-[30px] border border-[#eadfcd] bg-white/84 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const KICKER = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";
const PRIMARY = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2.5 text-sm font-semibold text-[#060710] shadow-[0_16px_30px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f]";
const GHOST = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710]";

const CONFIG = {
  legal: {
    role: "legal-team",
    title: "Legal Desk",
    badge: "Legal Review",
    headline: "Review agreements and move approved leads into finance with clear document context.",
    copy: "Keep legal queue pressure, pending tasks, and transfer history aligned in one focused workspace.",
    queueTitle: "Leads waiting in legal",
    queueHelper: "Open the legal queue to manage documents, validate approvals, and assign the finance owner.",
    queueHref: "/workflow/legal",
    queueCta: "Open Legal Queue",
    secondaryHref: "/leads",
    secondaryCta: "Open Leads",
    emptyQueue: "No leads are waiting in legal right now.",
    historyTitle: "Recent Hand-offs",
    historyEmpty: "No recent transfer history.",
    docsCopy: "Legal documents and approval notes are managed inside the legal queue.",
  },
  finance: {
    role: "finance-team",
    title: "Finance Desk",
    badge: "Finance Completion",
    headline: "Close invoices, review documents, and finish workflow without breaking context.",
    copy: "Track closing workload, missing invoice details, and recent completions from one practical dashboard.",
    queueTitle: "Leads waiting in finance",
    queueHelper: "Open the finance queue to add invoice documents, complete billing fields, and close the workflow.",
    queueHref: "/workflow/finance",
    queueCta: "Open Finance Queue",
    secondaryHref: "/leads",
    secondaryCta: "Open Leads",
    emptyQueue: "No leads are waiting in finance right now.",
    historyTitle: "Recent Closures",
    historyEmpty: "No recent workflow history.",
    docsCopy: "Invoice links and finance-side documents are managed inside the finance queue.",
  },
};

const money = (value) => `INR ${Number(value || 0).toLocaleString("en-IN")}`;
const when = (value, withTime = false) =>
  !value
    ? "--"
    : new Date(value).toLocaleString(
        "en-IN",
        withTime
          ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
          : { day: "numeric", month: "short", year: "numeric" }
      );
const nice = (value = "") =>
  String(value || "")
    .replaceAll("_", "-")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
const compact = (value) =>
  new Intl.NumberFormat("en-IN", {
    notation: Number(value || 0) >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
const ownerLabel = (lead) => lead.assigned_to_name || lead.legal_owner_name || lead.finance_owner_name || "Unassigned";

function queueState(lead, mode) {
  if (mode === "legal") {
    const approved = String(lead.agreement_status || "").toLowerCase() === "approved";
    return {
      label: nice(lead.agreement_status || "pending"),
      tone: approved ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return lead.invoice_number
    ? {
        label: "Invoice Ready",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      }
    : {
        label: "Invoice Pending",
        tone: "border-amber-200 bg-amber-50 text-amber-700",
      };
}

export default function StageDashboard({ mode }) {
  const config = CONFIG[mode];
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) {
      router.replace("/login");
      return;
    }
    if (activeSession.user?.role !== config.role) {
      router.replace(ROLE_HOME_ROUTE[activeSession.user?.role] || "/dashboard");
      return;
    }

    setSession(activeSession);

    Promise.all([
      apiRequest("/workflow/my-assigned?page_size=10", { token: activeSession.token }),
      apiRequest("/workflow/my-history?page_size=6", { token: activeSession.token }),
      apiRequest("/tasks?page_size=6", { token: activeSession.token }),
    ])
      .then(([queueResponse, historyResponse, tasksResponse]) => {
        setQueue(queueResponse.items || []);
        setHistory(historyResponse.items || []);
        setTasks(tasksResponse.items || []);
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [config.role, router]);

  const stats = useMemo(() => {
    if (mode === "legal") {
      return [
        { label: "Legal Queue", value: compact(queue.length), hint: "Assigned agreement review leads", icon: "workflow" },
        {
          label: "Pending Review",
          value: compact(queue.filter((lead) => String(lead.agreement_status || "pending").toLowerCase() === "pending").length),
          hint: "Still waiting for approval",
          icon: "documents",
        },
        {
          label: "Docs Attached",
          value: compact(queue.reduce((sum, lead) => sum + Number(lead.legal_doc_count || lead.doc_count || 0), 0)),
          hint: "Documents visible in legal queue",
          icon: "analytics",
        },
        {
          label: "Queue Value",
          value: money(queue.reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0)),
          hint: "Commercial value under legal review",
          icon: "finance",
        },
      ];
    }

    return [
      { label: "Finance Queue", value: compact(queue.length), hint: "Assigned billing and closure leads", icon: "workflow" },
      {
        label: "Invoice Ready",
        value: compact(queue.filter((lead) => lead.invoice_number).length),
        hint: "Leads with invoice number filled",
        icon: "documents",
      },
      {
        label: "Pending Invoice",
        value: compact(queue.filter((lead) => !lead.invoice_number).length),
        hint: "Need finance details before completion",
        icon: "analytics",
      },
      {
        label: "Queue Value",
        value: money(queue.reduce((sum, lead) => sum + Number(lead.invoice_amount || lead.estimated_value || 0), 0)),
        hint: "Billing value inside finance queue",
        icon: "finance",
      },
    ];
  }, [mode, queue]);

  return (
    <DashboardShell session={session} title={config.title} hideTitle heroStats={[]}>
      <div className="mx-auto grid max-w-[1380px] gap-5">
        {error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}

        {loading ? (
          <div className="grid min-h-[320px] place-items-center rounded-[30px] border border-[#eadfcd] bg-white/82 text-sm text-[#7a6b57]">
            Loading {mode} dashboard...
          </div>
        ) : (
          <>
            <section className={HERO}>
              <div className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr] xl:items-start">
                <div className="space-y-5">
                  <div>
                    <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                      {config.badge}
                    </span>
                    <h2 className="mt-4 text-[2.2rem] font-semibold tracking-tight text-[#060710] md:text-[3.1rem] md:leading-[1.02]">
                      {config.headline}
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-[#746853] md:text-base">{config.copy}</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map((item) => (
                      <article key={item.label} className="rounded-[24px] border border-[#eadfcd] bg-white/88 px-4 py-4 shadow-[0_12px_28px_rgba(79,58,22,0.05)]">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className={KICKER}>{item.label}</p>
                            <strong className="mt-3 block text-[1.8rem] font-black leading-none text-[#060710]">{item.value}</strong>
                            <span className="mt-2 block text-xs text-[#8f816a]">{item.hint}</span>
                          </div>
                          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff4d9] text-[#8d6e27]">
                            <DashboardIcon name={item.icon} className="h-5 w-5" />
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 xl:justify-self-end xl:w-full xl:max-w-[500px]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Link href={config.queueHref} className={PRIMARY}>
                      <DashboardIcon name="workflow" className="h-4 w-4" />
                      {config.queueCta}
                    </Link>
                    <Link href={config.secondaryHref} className={GHOST}>
                      <DashboardIcon name="leads" className="h-4 w-4" />
                      {config.secondaryCta}
                    </Link>
                  </div>

                  <div className="rounded-[28px] border border-[#eadfcd] bg-white/86 p-5 shadow-[0_14px_32px_rgba(79,58,22,0.06)]">
                    <p className={KICKER}>Document Flow</p>
                    <h3 className="mt-3 text-xl font-semibold tracking-tight text-[#060710]">Use the queue as the working desk</h3>
                    <p className="mt-3 text-sm leading-7 text-[#746853]">{config.docsCopy}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[20px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                        <p className={KICKER}>Queue Focus</p>
                        <p className="mt-2 text-sm leading-6 text-[#746853]">{config.queueHelper}</p>
                      </div>
                      <div className="rounded-[20px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                        <p className={KICKER}>Task Visibility</p>
                        <p className="mt-2 text-sm leading-6 text-[#746853]">
                          Keep document handling, due tasks, and recent stage movement visible in one premium surface.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.04fr_0.96fr] xl:items-start">
              <article className={PANEL}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className={KICKER}>Queue Preview</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">{config.queueTitle}</h3>
                  </div>
                  <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fffaf1] px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                    {queue.length} leads
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {queue.length ? (
                    queue.map((lead) => {
                      const state = queueState(lead, mode);

                      return (
                        <div key={lead.lead_id} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4">
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap gap-2">
                                <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${state.tone}`}>
                                  {state.label}
                                </span>
                                <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                                  {lead.doc_count || 0} docs
                                </span>
                              </div>
                              <h4 className="mt-3 text-lg font-semibold text-[#060710]">{lead.company_name || "Untitled lead"}</h4>
                              <p className="mt-1 text-sm text-[#746853]">
                                {lead.contact_person || "No contact"} | {ownerLabel(lead)}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#8f816a]">
                                <span>Value: {money(lead.invoice_amount || lead.estimated_value)}</span>
                                <span>Source: {nice(lead.lead_source || "unknown")}</span>
                                <span>Updated: {when(lead.transferred_at || lead.updated_at || lead.created_at)}</span>
                              </div>
                            </div>
                            <Link href={config.queueHref} className={GHOST}>
                              <DashboardIcon name="workflow" className="h-4 w-4" />
                              Open Queue
                            </Link>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-12 text-center text-sm text-[#7a6b57]">
                      {config.emptyQueue}
                    </div>
                  )}
                </div>
              </article>

              <div className="space-y-5">
                <article className={PANEL}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className={KICKER}>My Tasks</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Active follow-through</h3>
                    </div>
                    <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fffaf1] px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                      {tasks.length} tasks
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {tasks.length ? (
                      tasks.map((task) => (
                        <div key={task.task_id} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <strong className="block text-base text-[#060710]">{task.title}</strong>
                              <p className="mt-1 text-sm text-[#746853]">{nice(task.type || "task")}</p>
                            </div>
                            <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                              {nice(task.status || "open")}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#8f816a]">
                            <span>Due: {when(task.due_date)}</span>
                            <span>Priority: {nice(task.priority || "medium")}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-10 text-center text-sm text-[#7a6b57]">
                        No pending tasks.
                      </div>
                    )}
                  </div>
                </article>

                <article className={PANEL}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className={KICKER}>Workflow History</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">{config.historyTitle}</h3>
                    </div>
                    <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fffaf1] px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                      {history.length} items
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {history.length ? (
                      history.map((item) => (
                        <div key={`${item.lead_id}-${item.transferred_at}`} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4">
                          <strong className="block text-base text-[#060710]">{item.company_name || "Lead transfer"}</strong>
                          <p className="mt-1 text-sm text-[#746853]">
                            {nice(item.from_stage || "sales")} to {nice(item.to_stage || mode)}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#8f816a]">
                            <span>Moved: {when(item.transferred_at, true)}</span>
                            <span>By: {item.transferred_by_name || item.created_by_name || "Team"}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-10 text-center text-sm text-[#7a6b57]">
                        {config.historyEmpty}
                      </div>
                    )}
                  </div>
                </article>
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
