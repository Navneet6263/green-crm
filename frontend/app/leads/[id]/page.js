"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../components/dashboard/icons";
import LeadNotesPanel from "../../../components/leads/details/LeadNotesPanel";
import LeadQuickStatusControl from "../../../components/leads/LeadQuickStatusControl";
import { API_BASE, apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";
import {
  formatScopedError,
  loadUsersForScope,
  scopedUsersEmptyMessage,
  teamBadgeLabel,
} from "../../../lib/teamScope";
import { AlertError, AlertSuccess } from "../../../components/ui/Alert";
import {
  formatWorkflowOwnerIdentity,
  withAssignedWorkflowUser,
  workflowUsersEmptyMessage,
} from "../../../lib/workflowOwners";

const STATUS_ACCENT = { new: ["rgba(79,140,255,.12)", "#2f6fdd"], contacted: ["rgba(56,189,248,.14)", "#0077b8"], qualified: ["rgba(167,139,250,.14)", "#6d46d6"], proposal: ["rgba(245,164,45,.14)", "#b96a00"], negotiation: ["rgba(251,146,60,.14)", "#c96200"], "closed-won": ["rgba(31,199,120,.16)", "#0f8c53"], "closed-lost": ["rgba(224,82,82,.14)", "#b63b3b"] };
const PRIORITY_ACCENT = { low: ["rgba(56,189,248,.12)", "#0077b8"], medium: ["rgba(245,164,45,.14)", "#b96a00"], high: ["rgba(255,108,156,.14)", "#c4356b"], urgent: ["rgba(224,82,82,.14)", "#b63b3b"] };
const WORKFLOW = ["sales", "legal", "finance", "completed"];
const DOC_VIEW_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager"];
const LEGAL_TRANSFER_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager", "sales"];
const ACTIVITY_OPTIONS = ["call", "email", "meeting", "note", "task", "comment"];
const PANEL_CLASS = "rounded-[30px] border border-[#eadfcd] bg-white/82 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const SOFT_PANEL_CLASS = "rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4";
const INPUT_CLASS = "w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none transition placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const PRIMARY_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2.5 text-sm font-semibold text-[#060710] shadow-[0_16px_30px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f] disabled:cursor-not-allowed disabled:opacity-60";
const GHOST_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710] disabled:cursor-not-allowed disabled:opacity-60";
const DARK_ACTION_PRIMARY = "flex min-h-[74px] items-center gap-3 rounded-[22px] border border-[#d7b258] bg-[#f3dfab] px-4 py-4 text-left text-[#060710] shadow-[0_16px_30px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f] disabled:cursor-not-allowed disabled:opacity-60";
const DARK_ACTION_GHOST = "flex min-h-[74px] items-center gap-3 rounded-[22px] border border-white/10 bg-[#060710] px-4 py-4 text-left text-white transition hover:-translate-y-0.5 hover:bg-[#1a1b2e]";
const KICKER_CLASS = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";
const HERO_PANEL_CLASS = "rounded-[36px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(250,241,221,0.98)_44%,_rgba(245,231,193,0.98)_100%)] p-6 shadow-[0_24px_70px_rgba(79,58,22,0.08)] md:p-8";
const DARK_PANEL_CLASS = "rounded-[34px] border border-[#1d1a12] bg-[linear-gradient(155deg,#10111d_0%,#171a28_56%,#25212d_100%)] p-6 text-white shadow-[0_24px_80px_rgba(6,7,16,0.3)] md:p-7";
const PILL_CLASS = "inline-flex rounded-full px-3 py-1 text-[11px] font-bold";
const nice = (v) => String(v || "").split("-").filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1)).join(" ");
const money = (v) => `INR ${Number(v || 0).toLocaleString("en-IN")}`;
const when = (v, full = false) => !v ? "--" : new Date(v).toLocaleString("en-IN", full ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short", year: "numeric" });
const hrefForDoc = (fileUrl) => !fileUrl ? "#" : /^https?:\/\//i.test(fileUrl) ? fileUrl : `${API_BASE}${fileUrl}`;

function buildLocalNote(content, createdByName) {
  return {
    id: `local-note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    content,
    created_at: new Date().toISOString(),
    created_by_name: createdByName,
  };
}

function buildLocalActivity(type, description, createdByName) {
  return {
    activity_id: `local-activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    description,
    created_at: new Date().toISOString(),
    created_by_name: createdByName,
  };
}

function DocGroup({ title, items }) {
  if (!items?.length) return null;
  return (
    <div className="rounded-[26px] border border-[#eadfcd] bg-[#fffaf1] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <strong className="text-base text-[#060710]">{title}</strong>
        <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
          {items.length} file{items.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="space-y-3">
        {items.map((doc, index) => (
          <div className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-4" key={`${title}-${doc.id || doc.file_name || index}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <strong className="block text-sm text-[#060710]">{doc.file_name || "Document"}</strong>
                <span className="mt-1 block text-xs text-[#7a6b57]">{doc.uploaded_by_name || "Team"} | {when(doc.uploaded_at, true)}{doc.file_size ? ` | ${Number(doc.file_size / 1024).toFixed(1)} KB` : ""}</span>
              </div>
              <a className={GHOST_BUTTON_CLASS} href={hrefForDoc(doc.file_url)} target="_blank" rel="noreferrer">Download</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailCell({ label, value, className = "" }) {
  return (
    <div className={`rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4 ${className}`}>
      <span className={KICKER_CLASS}>{label}</span>
      <strong className="mt-3 block text-sm leading-6 text-[#060710]">{value || "--"}</strong>
    </div>
  );
}

function unitText(value) {
  return value === undefined || value === null || value === "" ? "--" : String(value);
}

function ActionCard({ href, onClick, disabled = false, title, copy, primary = false, children }) {
  const className = primary ? DARK_ACTION_PRIMARY : DARK_ACTION_GHOST;
  const content = (
    <>
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${primary ? "bg-[#10111d] text-white" : "bg-white/15 text-white"}`}>
        {children}
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm font-semibold">{title}</strong>
        <span className="mt-1 block text-xs text-white/60">{copy}</span>
      </span>
    </>
  );

  if (href) {
    return <Link href={href} className={className}>{content}</Link>;
  }

  return (
    <button className={className} type="button" onClick={onClick} disabled={disabled}>
      {content}
    </button>
  );
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState(null), [lead, setLead] = useState(null), [notes, setNotes] = useState([]), [activity, setActivity] = useState([]), [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true), [savingActivity, setSavingActivity] = useState(false), [savingTask, setSavingTask] = useState(false), [transferring, setTransferring] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [activityType, setActivityType] = useState("call"), [activityText, setActivityText] = useState(""), [transferOwner, setTransferOwner] = useState(""), [transferNote, setTransferNote] = useState("");
  const [task, setTask] = useState({ title: "", type: "call", priority: "medium", due_date: "", due_time: "", assigned_to: "", notes: "" });
  const role = session?.user?.role || "";
  const canSeeDocs = DOC_VIEW_ROLES.includes(role);
  const canTransferToLegal = Boolean(lead?.can_transfer_to_legal) && LEGAL_TRANSFER_ROLES.includes(role);
  const scopedLegalUsers = useMemo(() => users.filter((user) => user.role === "legal-team"), [users]);
  const legalUsers = useMemo(
    () => withAssignedWorkflowUser(scopedLegalUsers, lead?.assigned_to_legal, lead?.legal_owner_name, "legal-team"),
    [lead?.assigned_to_legal, lead?.legal_owner_name, scopedLegalUsers]
  );
  const leadName = lead?.contact_person || lead?.company_name || "Lead";
  const hideWorkspaceTitle = ["sales", "marketing", "admin", "manager"].includes(role);
  const scopedUsersMessage = scopedUsersEmptyMessage(lead);
  const legalUsersMessage = workflowUsersEmptyMessage(lead?.team_name, "legal");
  const currentUserName = session?.user?.name || session?.user?.full_name || "You";

  const mergeLeadState = useCallback((updatedLead) => {
    if (!updatedLead?.lead_id) {
      return;
    }

    setLead((current) => (current ? { ...current, ...updatedLead } : updatedLead));
  }, []);

  const prependNote = useCallback((content, { incrementLeadCount = true } = {}) => {
    const trimmedContent = String(content || "").trim();
    if (!trimmedContent) {
      return;
    }

    setNotes((current) => [buildLocalNote(trimmedContent, currentUserName), ...current].slice(0, 12));
    setLead((current) => (
      current
        ? {
            ...current,
            latest_note: trimmedContent,
            note_count: incrementLeadCount ? Number(current.note_count || 0) + 1 : current.note_count,
          }
        : current
    ));
  }, [currentUserName]);

  const prependActivity = useCallback((type, description) => {
    const trimmedDescription = String(description || "").trim();
    if (!trimmedDescription) {
      return;
    }

    setActivity((current) => [buildLocalActivity(type, trimmedDescription, currentUserName), ...current].slice(0, 12));
  }, [currentUserName]);

  async function loadLead(activeSession, { includeUsers = false } = {}) {
    const [leadResponse, notesResponse, activityResponse] = await Promise.all([
      apiRequest(`/leads/${params.id}`, { token: activeSession.token }),
      apiRequest(`/leads/${params.id}/notes?page_size=12`, { token: activeSession.token }),
      apiRequest(`/leads/${params.id}/activity?page_size=12`, { token: activeSession.token }),
    ]);

    setLead(leadResponse);
    setNotes(notesResponse.items || []);
    setActivity(activityResponse.items || []);
    setTransferOwner(leadResponse.assigned_to_legal || "");
    setTask((current) => ({ ...current, assigned_to: current.assigned_to || leadResponse.assigned_to || activeSession.user?.user_id || "" }));

    if (includeUsers) {
      void loadUsersForScope(activeSession.token, {
        companyId: leadResponse.company_id,
        teamId: leadResponse.team_id,
        pageSize: 100,
        path: "/users",
      })
        .then((usersResponse) => {
          setUsers(usersResponse);
        })
        .catch(() => {
          setUsers([]);
        });
    }
  }

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) return router.replace("/login");
    setSession(activeSession);
    setUsers([]);
    loadLead(activeSession, { includeUsers: true }).catch((requestError) => setError(formatScopedError(requestError, "Could not load this lead."))).finally(() => setLoading(false));
  }, [params.id, router]);

  const intelligence = useMemo(() => {
    if (!lead) return { score: 0, probability: 0, temperature: "Cold" };
    let score = 0;
    if (lead.email) score += 10;
    if (lead.phone) score += 10;
    if (lead.product_id || lead.product_name) score += 12;
    if (lead.follow_up_date) score += 8;
    score += { new: 8, contacted: 16, qualified: 24, proposal: 30, negotiation: 36, "closed-won": 40, "closed-lost": 4 }[lead.status] || 10;
    score += { low: 5, medium: 10, high: 16, urgent: 20 }[lead.priority] || 8;
    score += Math.min(18, Math.round(Math.log10(Number(lead.estimated_value || 0) + 1) * 5));
    score += Math.min(12, activity.length * 2);
    score = Math.min(100, score);
    return { score, probability: Math.min(96, Math.max(6, score - (lead.status === "closed-lost" ? 32 : 0) + (lead.status === "closed-won" ? 8 : 0))), temperature: score >= 75 ? "Hot" : score >= 45 ? "Warm" : "Cold" };
  }, [activity.length, lead]);

  async function refreshLead() { if (session) await loadLead(session); }

  async function saveNote(content) {
    setError("");
    setNotice("");

    try {
      await apiRequest(`/leads/${params.id}/notes`, {
        method: "POST",
        token: session.token,
        body: { content },
      });
      prependNote(content);
      setNotice("Note added successfully.");
    } catch (requestError) {
      setError(formatScopedError(requestError, "Could not save this note."));
      throw requestError;
    }
  }

  async function addActivity(event) {
    event.preventDefault();
    const description = activityText.trim();
    if (!description) return;
    setSavingActivity(true); setError(""); setNotice("");
    try {
      await apiRequest(`/leads/${params.id}/activity`, { method: "POST", token: session.token, body: { type: activityType, description } });
      setActivityText("");
      prependActivity(activityType, description);
      setNotice("Timeline updated.");
    }
    catch (requestError) { setError(formatScopedError(requestError, "Could not update the timeline.")); }
    finally { setSavingActivity(false); }
  }

  async function logQuick(type, description, href) {
    try { await apiRequest(`/leads/${params.id}/activity`, { method: "POST", token: session.token, body: { type, description } }); } catch (_error) {}
    window.location.href = href;
  }

  async function createTask(event) {
    event.preventDefault();
    if (!task.title.trim() || !task.due_date || !task.due_time) return setError("Task title, date, and time are required.");
    setSavingTask(true); setError(""); setNotice("");
    try {
      const due = `${task.due_date} ${task.due_time}:00`;
      await apiRequest("/tasks", { method: "POST", token: session.token, body: { title: task.title.trim(), type: task.type, priority: task.priority, due_date: due, assigned_to: task.assigned_to || session.user?.user_id, related_to: "lead", related_id: lead.lead_id, team_id: lead.team_id || undefined, notes: task.notes || null } });
      const taskActivity = `Task scheduled: ${task.title.trim()} on ${when(due, true)}`;
      await apiRequest(`/leads/${params.id}/activity`, { method: "POST", token: session.token, body: { type: "task", description: taskActivity } });
      setTask({ title: "", type: "call", priority: "medium", due_date: "", due_time: "", assigned_to: session.user?.user_id || "", notes: "" });
      prependActivity("task", taskActivity);
      setNotice("Task scheduled successfully.");
    } catch (requestError) { setError(formatScopedError(requestError, "Could not schedule this task.")); }
    finally { setSavingTask(false); }
  }

  async function transferToLegal(event) {
    event.preventDefault();
    if (!transferNote.trim()) return setError("Transfer note is required before moving a closed-won lead to legal.");
    setTransferring(true); setError(""); setNotice("");
    try {
      await apiRequest(`/workflow/${params.id}/transfer-to-legal`, { method: "POST", token: session.token, body: { assigned_to: transferOwner || null, notes: transferNote.trim() } });
      setTransferNote("");
      setNotice("Lead transferred to legal successfully.");
      await refreshLead();
    } catch (requestError) { setError(formatScopedError(requestError, "Could not transfer this lead to legal.")); }
    finally { setTransferring(false); }
  }

  const handleStatusUpdated = useCallback((updatedLead) => {
    mergeLeadState(updatedLead);
    if (updatedLead?.latest_note) {
      prependNote(updatedLead.latest_note, { incrementLeadCount: false });
    }
    setNotice(`Lead status moved to ${nice(updatedLead?.status || "new")}.`);
  }, [mergeLeadState, prependNote]);

  return (
    <DashboardShell session={session} title={lead ? lead.company_name : "Lead Detail"} hideTitle={hideWorkspaceTitle} heroStats={[]}>
      <AlertError message={error} onDismiss={() => setError("")} />
      {!error ? <AlertSuccess message={notice} onDismiss={() => setNotice("")} /> : null}
      {loading ? <div className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-[#6f614c]">Loading lead details...</div> : null}
      {!loading && lead ? (
        <section className="space-y-5">
          <article className={HERO_PANEL_CLASS}>
            <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
              <div className="space-y-5">
                <button className={GHOST_BUTTON_CLASS} type="button" onClick={() => router.back()}>
                  Back
                </button>

                <div className="flex items-start gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[22px] bg-[#10111d] text-xl font-bold text-white shadow-[0_18px_32px_rgba(6,7,16,0.18)]">
                    {leadName?.trim()?.slice(0, 1)?.toUpperCase() || "L"}
                  </div>
                  <div className="space-y-4">
                    <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                      Lead Profile
                    </span>
                    <div>
                      <h2 className="text-3xl font-semibold tracking-tight text-[#060710] md:text-[2.2rem] md:leading-[1.08]">
                        {leadName}
                      </h2>
                      <p className="mt-2 max-w-3xl text-sm leading-7 text-[#6f614c]">
                        {lead.company_name && lead.company_name !== leadName ? lead.company_name : "Lead profile and workflow context"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={PILL_CLASS} style={{ background: (STATUS_ACCENT[lead.status] || STATUS_ACCENT.new)[0], color: (STATUS_ACCENT[lead.status] || STATUS_ACCENT.new)[1] }}>{nice(lead.status)}</span>
                  <span className={PILL_CLASS} style={{ background: (PRIORITY_ACCENT[lead.priority] || PRIORITY_ACCENT.medium)[0], color: (PRIORITY_ACCENT[lead.priority] || PRIORITY_ACCENT.medium)[1] }}>{nice(lead.priority || "medium")}</span>
                  {lead.product_name ? <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">{lead.product_name}</span> : null}
                  {teamBadgeLabel(lead) ? <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">{teamBadgeLabel(lead)}</span> : null}
                  <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">Workflow {nice(lead.workflow_stage || "sales")}</span>
                  <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">Notes {notes.length}</span>
                  <LeadQuickStatusControl lead={lead} token={session?.token} onUpdated={handleStatusUpdated} hideLabel className="min-w-[180px]" selectClassName="min-h-[34px] bg-white pr-8 text-[11px] shadow-none" />
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className={SOFT_PANEL_CLASS}>
                    <span className={KICKER_CLASS}>Company</span>
                    <strong className="mt-3 block text-base font-black text-[#060710]">{lead.company_name || "No company"}</strong>
                    <p className="mt-2 text-sm leading-6 text-[#756752]">The organization currently attached to this lead.</p>
                  </div>
                  <div className={SOFT_PANEL_CLASS}>
                    <span className={KICKER_CLASS}>Email</span>
                    {lead.email ? (
                      <a href={`mailto:${lead.email}`} className="mt-3 block break-words text-base font-black text-[#060710] underline decoration-[#eadfcd] underline-offset-4 transition hover:decoration-[#d7b258]">{lead.email}</a>
                    ) : (
                      <strong className="mt-3 block text-base font-black text-[#060710]">No email</strong>
                    )}
                    <p className="mt-2 text-sm leading-6 text-[#756752]">Primary inbox for outreach and handoffs.</p>
                  </div>
                  <div className={SOFT_PANEL_CLASS}>
                    <span className={KICKER_CLASS}>Phone</span>
                    {lead.phone ? (
                      <a href={`tel:${String(lead.phone).replace(/[^\d+]/g, "")}`} className="mt-3 block text-base font-black text-[#060710] underline decoration-[#eadfcd] underline-offset-4 transition hover:decoration-[#d7b258]">{lead.phone}</a>
                    ) : (
                      <strong className="mt-3 block text-base font-black text-[#060710]">No phone</strong>
                    )}
                    <p className="mt-2 text-sm leading-6 text-[#756752]">Call-ready number for follow-up activity.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <article className={DARK_PANEL_CLASS}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[{ label: "Lead Score", value: intelligence.score }, { label: "Win Chance", value: `${intelligence.probability}%` }, { label: "Temperature", value: intelligence.temperature }, { label: "Owner", value: lead.assigned_to_name || "Unassigned" }].map((item) => (
                      <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">{item.label}</p>
                        <p className="mt-3 text-2xl font-black tracking-tight text-white">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <ActionCard
                      primary
                      title="Call Lead"
                      copy={lead.phone ? "Jump into the contact number directly." : "Phone not available yet."}
                      onClick={() => logQuick("call", `Called ${leadName}`, `tel:${String(lead.phone || "").replace(/[^\d+]/g, "")}`)}
                      disabled={!lead.phone}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12a7 7 0 0 1 14 0" />
                        <path d="M5 12v3a2 2 0 0 0 2 2h2v-5H7a2 2 0 0 0-2 2Z" />
                        <path d="M19 12v3a2 2 0 0 1-2 2h-2v-5h2a2 2 0 0 1 2 2Z" />
                        <path d="M9 18a3 3 0 0 0 6 0" />
                      </svg>
                    </ActionCard>
                    <ActionCard
                      href={`/communications?entity=lead&id=${lead.lead_id}`}
                      title="Email Workspace"
                      copy="Open drafts, notes, and outreach context."
                    >
                      <DashboardIcon name="message" className="h-5 w-5" />
                    </ActionCard>
                    <ActionCard
                      href={`/leads/${lead.lead_id}/edit`}
                      title="Edit Lead"
                      copy="Update commercial data and workflow fields."
                    >
                      <DashboardIcon name="settings" className="h-5 w-5" />
                    </ActionCard>
                    <ActionCard
                      title="Task Desk"
                      copy="Move into the full task workspace."
                      onClick={() => router.push("/tasks")}
                    >
                      <DashboardIcon name="tasks" className="h-5 w-5" />
                    </ActionCard>
                  </div>
                </article>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className={SOFT_PANEL_CLASS}>
                    <span className={KICKER_CLASS}>Follow-up</span>
                    <strong className="mt-3 block text-base font-black text-[#060710]">{when(lead.follow_up_date, true)}</strong>
                  </div>
                  <div className={SOFT_PANEL_CLASS}>
                    <span className={KICKER_CLASS}>Value</span>
                    <strong className="mt-3 block text-base font-black text-[#060710]">{money(lead.estimated_value)}</strong>
                  </div>
                  <div className={SOFT_PANEL_CLASS}>
                    <span className={KICKER_CLASS}>Created</span>
                    <strong className="mt-3 block text-base font-black text-[#060710]">{when(lead.created_at, true)}</strong>
                  </div>
                  <div className={SOFT_PANEL_CLASS}>
                    <span className={KICKER_CLASS}>Units</span>
                    <strong className="mt-3 block text-base font-black text-[#060710]">{unitText(lead.number_of_units)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr] xl:items-start">
            <div className="space-y-5">
              <article className={PANEL_CLASS}>
                <div className="mb-5">
                  <span className={KICKER_CLASS}>Snapshot</span>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Lead information</h2>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <DetailCell label="Contact" value={lead.contact_person} />
                      <DetailCell label="Company" value={lead.company_name} />
                      <DetailCell label="Phone" value={lead.phone || "--"} />
                      <DetailCell label="Email" value={lead.email || "--"} />
                      <DetailCell label="Team" value={teamBadgeLabel(lead) || "Auto team"} />
                      <DetailCell label="Owner" value={lead.assigned_to_name || "Unassigned"} />
                      <DetailCell label="Created By" value={lead.created_by_name || "Unknown"} />
                      <DetailCell label="Units" value={unitText(lead.number_of_units)} />
                    </div>

                    <div className={SOFT_PANEL_CLASS}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className={KICKER_CLASS}>Requirements</span>
                        <strong className="text-xs font-bold text-[#8f816a]">{lead.product_name || "Lead brief"}</strong>
                      </div>
                      <p className="text-sm leading-7 text-[#5f533f]">{lead.requirements || "No requirements have been added to this lead yet."}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-3">
                      <DetailCell label="Source" value={nice(lead.lead_source || "website")} />
                      <DetailCell label="Follow-up" value={when(lead.follow_up_date, true)} />
                      <DetailCell label="Value" value={money(lead.estimated_value)} />
                      <DetailCell label="Workflow" value={nice(lead.workflow_stage || "sales")} />
                    </div>

                    <div className={SOFT_PANEL_CLASS}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className={KICKER_CLASS}>Latest Note</span>
                        <strong className="text-xs font-bold text-[#8f816a]">{notes.length} total</strong>
                      </div>
                      <p className="text-sm leading-7 text-[#5f533f]">{lead.latest_note || "No note has been logged yet."}</p>
                    </div>
                  </div>
                </div>
              </article>

              <article className={PANEL_CLASS}>
                <div className="mb-5"><div><span className={KICKER_CLASS}>Workflow</span><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Progress & transfer path</h2></div></div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {WORKFLOW.map((step, index) => {
                    const current = WORKFLOW.indexOf(lead.workflow_stage || "sales");
                    const state = index < current ? "done" : index === current ? "active" : "idle";

                    return (
                      <div
                        key={step}
                        className={`rounded-[24px] border px-4 py-4 shadow-[0_12px_28px_rgba(79,58,22,0.05)] ${
                          state === "active"
                            ? "border-[#d7b258] bg-[#fff4d8]"
                            : state === "done"
                              ? "border-emerald-200 bg-emerald-50"
                              : "border-[#eadfcd] bg-white"
                        }`}
                      >
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-current text-xs font-bold">
                          {index + 1}
                        </span>
                        <strong className="mt-4 block text-base text-[#060710]">{nice(step)}</strong>
                        <p className="mt-2 text-xs font-medium text-[#7c6d55]">
                          {state === "active" ? "Current stage" : state === "done" ? "Completed stage" : "Waiting"}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {canSeeDocs ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <DetailCell label="Legal Owner" value={formatWorkflowOwnerIdentity(lead.legal_owner_name, lead.assigned_to_legal)} />
                    <DetailCell label="Finance Owner" value={formatWorkflowOwnerIdentity(lead.finance_owner_name, lead.assigned_to_finance)} />
                    <DetailCell label="Legal Docs" value={(lead.legal_documents || []).length} />
                    <DetailCell label="Finance Docs" value={(lead.finance_documents || []).length} />
                  </div>
                ) : (
                  <p className="mt-4 rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4 text-sm leading-7 text-[#6f614c]">
                    Workflow remains visible here, while uploaded document review stays limited to admin and manager screens.
                  </p>
                )}
              </article>

              <article className={PANEL_CLASS}>
                <div className="mb-5"><div><span className={KICKER_CLASS}>Activity</span><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Activity Timeline</h2></div></div>
                <form className="grid gap-3 md:grid-cols-[0.9fr_1.2fr_auto]" onSubmit={addActivity}>
                  <select className={INPUT_CLASS} value={activityType} onChange={(event) => setActivityType(event.target.value)}>{ACTIVITY_OPTIONS.map((option) => <option key={option} value={option}>{nice(option)}</option>)}</select>
                  <input className={INPUT_CLASS} value={activityText} onChange={(event) => setActivityText(event.target.value)} placeholder="Add a timeline entry" />
                  <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={savingActivity}>{savingActivity ? "Saving..." : "Add"}</button>
                </form>
                <div className="mt-4 space-y-3">
                  {activity.length ? activity.map((item) => (
                    <div key={item.activity_id} className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                            {nice(item.type || "activity")}
                          </span>
                          <p className="text-sm leading-7 text-[#5f533f]">{item.description || "No description provided."}</p>
                        </div>
                        <div className="text-sm text-[#7a6b57]">
                          <strong className="block text-[#060710]">{item.created_by_name || "User"}</strong>
                          <span>{when(item.created_at, true)}</span>
                        </div>
                      </div>
                    </div>
                  )) : <p className="rounded-[22px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-4 py-10 text-center text-sm text-[#7a6b57]">No activity recorded yet.</p>}
                </div>
              </article>

              {canSeeDocs ? (
                <>
                  <article className={PANEL_CLASS}>
                    <div className="mb-5"><div><span className={KICKER_CLASS}>Workflow Vault</span><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Uploaded documents</h2></div></div>
                    {(lead.legal_documents || []).length || (lead.finance_documents || []).length ? <div className="grid gap-4 xl:grid-cols-2"><DocGroup title="Legal Documents" items={lead.legal_documents || []} /><DocGroup title="Finance Documents" items={lead.finance_documents || []} /></div> : <p className="rounded-[22px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-4 py-10 text-center text-sm text-[#7a6b57]">No workflow documents have been uploaded yet.</p>}
                  </article>
                  <article className={PANEL_CLASS}>
                    <div className="mb-5"><div><span className={KICKER_CLASS}>Workflow History</span><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Stage movement</h2></div></div>
                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4">
                        <strong className="block text-lg text-[#060710]">Stage history</strong>
                        <div className="mt-4 space-y-3">
                          {(lead.stage_history || []).length ? lead.stage_history.map((item, index) => (
                            <div className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-4" key={`stage-${item.stage}-${index}`}>
                              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div className="space-y-1.5">
                                  <strong className="block text-sm text-[#060710]">{nice(item.stage)}</strong>
                                  <span className="block text-sm leading-6 text-[#6f614c]">
                                    Entered {when(item.entered_at, true)}
                                    {item.exited_at ? ` | Exited ${when(item.exited_at, true)}` : " | Current stage"}
                                  </span>
                                </div>
                                <span className="text-sm font-semibold text-[#8d6e27]">{item.duration ? `${item.duration} min` : "--"}</span>
                              </div>
                            </div>
                          )) : <p className="rounded-[20px] border border-dashed border-[#ddd0bb] bg-white px-4 py-8 text-center text-sm text-[#7a6b57]">No stage history logged yet.</p>}
                        </div>
                      </div>
                      <div className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4">
                        <strong className="block text-lg text-[#060710]">Transfer log</strong>
                        <div className="mt-4 space-y-3">
                          {(lead.transfer_history || []).length ? lead.transfer_history.map((item, index) => (
                            <div className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-4" key={`transfer-${item.to_stage}-${index}`}>
                              <strong className="block text-sm text-[#060710]">{nice(item.from_stage)} to {nice(item.to_stage)}</strong>
                              <span className="mt-2 block text-sm leading-6 text-[#6f614c]">
                                {item.transferred_by_name || "User"} | {when(item.transferred_at, true)}
                                {item.transferred_to_name ? ` | Assigned to ${item.transferred_to_name}` : ""}
                              </span>
                              {item.notes ? <p className="mt-3 text-sm leading-6 text-[#5f533f]">{item.notes}</p> : null}
                            </div>
                          )) : <p className="rounded-[20px] border border-dashed border-[#ddd0bb] bg-white px-4 py-8 text-center text-sm text-[#7a6b57]">No transfer history recorded yet.</p>}
                        </div>
                      </div>
                    </div>
                  </article>
                </>
              ) : null}
            </div>

            <div className="space-y-5">
              {canTransferToLegal ? <article className={`${PANEL_CLASS} bg-[#f5fbf0]`}><div className="mb-5"><div><span className={KICKER_CLASS}>Closed Won</span><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Transfer to legal</h2></div></div><form className="grid gap-4" onSubmit={transferToLegal}><label className="space-y-2"><span className={KICKER_CLASS}>Legal Owner</span><select className={INPUT_CLASS} value={transferOwner} onChange={(event) => setTransferOwner(event.target.value)}><option value="">Assign later</option>{legalUsers.map((user) => <option key={user.user_id} value={user.user_id}>{formatWorkflowOwnerIdentity(user.name, user.user_id, "Legal user")}</option>)}</select>{!scopedLegalUsers.length ? <p className="text-xs font-medium text-[#8d6e27]">{legalUsersMessage}</p> : null}</label><label className="space-y-2"><span className={KICKER_CLASS}>Transfer Note *</span><textarea className={`${INPUT_CLASS} min-h-[150px] resize-y`} rows="4" value={transferNote} onChange={(event) => setTransferNote(event.target.value)} placeholder="What is ready for legal and what should be checked next?" /></label><button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={transferring || !transferNote.trim()}>{transferring ? "Transferring..." : "Transfer to Legal"}</button></form></article> : null}

              <article className={PANEL_CLASS}>
                <div className="mb-5"><div><span className={KICKER_CLASS}>Notes</span><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Lead notes</h2></div></div>
                <LeadNotesPanel inputClassName={INPUT_CLASS} kickerClassName={KICKER_CLASS} notes={notes} onSave={saveNote} primaryButtonClassName={PRIMARY_BUTTON_CLASS} renderWhen={when} />
              </article>

              <article className={PANEL_CLASS}>
                <div className="mb-5"><div><span className={KICKER_CLASS}>Task Desk</span><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Schedule task</h2></div></div>
                <form className="grid gap-4" onSubmit={createTask}>
                  <label className="space-y-2"><span className={KICKER_CLASS}>Title</span><input className={INPUT_CLASS} value={task.title} onChange={(event) => setTask((current) => ({ ...current, title: event.target.value }))} placeholder="Follow-up call, proposal review, demo" /></label>
                  <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className={KICKER_CLASS}>Type</span><select className={INPUT_CLASS} value={task.type} onChange={(event) => setTask((current) => ({ ...current, type: event.target.value }))}><option value="call">call</option><option value="email">email</option><option value="meeting">meeting</option><option value="follow-up">follow-up</option></select></label><label className="space-y-2"><span className={KICKER_CLASS}>Priority</span><select className={INPUT_CLASS} value={task.priority} onChange={(event) => setTask((current) => ({ ...current, priority: event.target.value }))}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="urgent">urgent</option></select></label></div>
                  <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className={KICKER_CLASS}>Date</span><input className={INPUT_CLASS} type="date" value={task.due_date} onChange={(event) => setTask((current) => ({ ...current, due_date: event.target.value }))} /></label><label className="space-y-2"><span className={KICKER_CLASS}>Time</span><input className={INPUT_CLASS} type="time" value={task.due_time} onChange={(event) => setTask((current) => ({ ...current, due_time: event.target.value }))} /></label></div>
                  <label className="space-y-2"><span className={KICKER_CLASS}>Assignee</span><select className={INPUT_CLASS} value={task.assigned_to} onChange={(event) => setTask((current) => ({ ...current, assigned_to: event.target.value }))}><option value="">Select assignee</option>{users.map((user) => <option key={user.user_id} value={user.user_id}>{user.name} | {user.role}</option>)}</select>{!users.length ? <p className="text-xs font-medium text-[#8d6e27]">{scopedUsersMessage}</p> : null}</label>
                  <label className="space-y-2"><span className={KICKER_CLASS}>Task Notes</span><textarea className={`${INPUT_CLASS} min-h-[120px] resize-y`} rows="3" value={task.notes} onChange={(event) => setTask((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional preparation notes" /></label>
                  <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={savingTask}>{savingTask ? "Scheduling..." : "Schedule Task"}</button>
                </form>
              </article>
            </div>
          </div>
        </section>
      ) : null}
    </DashboardShell>
  );
}
