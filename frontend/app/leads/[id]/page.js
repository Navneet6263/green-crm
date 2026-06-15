"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../components/dashboard/icons";
import LeadCollaboratorPanel from "../../../components/leads/details/LeadCollaboratorPanel";
import LeadAssignmentFlow from "../../../components/leads/details/LeadAssignmentFlow";
import LeadDocumentsPanel from "../../../components/leads/details/LeadDocumentsPanel";
import LeadHistoryTimeline from "../../../components/leads/details/LeadHistoryTimeline";
import LeadNotesPanel from "../../../components/leads/details/LeadNotesPanel";
import LeadFollowUpStatusButton from "../../../components/leads/LeadFollowUpStatusButton";
import LeadQuickStatusControl from "../../../components/leads/LeadQuickStatusControl";
import WorkflowBadge from "../../../components/leads/WorkflowBadge";
import { useLeadCollaboratorActions } from "../../../components/leads/shared/useLeadCollaboratorActions";
import { API_BASE, apiRequest } from "../../../lib/api";
import { formatIndiaDateTime } from "../../../lib/dateTime";
import { loadSession } from "../../../lib/session";
import { useCustomization } from "../../../lib/useCustomization";
import { getEnabledStatuses } from "../../../lib/leadStatusHelper";
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

const STATUS_ACCENT = { new: ["rgba(79,140,255,.12)", "#2f6fdd"], contacted: ["rgba(56,189,248,.14)", "#0077b8"], qualified: ["rgba(167,139,250,.14)", "#6d46d6"], proposal: ["rgba(245,164,45,.14)", "#b96a00"], negotiation: ["rgba(251,146,60,.14)", "#c96200"], "booked-demo": ["rgba(137,92,246,.14)", "#7a3ef0"], "demo-done": ["rgba(16,185,129,.14)", "#0f8c53"], "trial-started": ["rgba(59,130,246,.14)", "#2d64dd"], "closed-won": ["rgba(31,199,120,.16)", "#0f8c53"], "closed-lost": ["rgba(224,82,82,.14)", "#b63b3b"] };
const PRIORITY_ACCENT = { low: ["rgba(56,189,248,.12)", "#0077b8"], medium: ["rgba(245,164,45,.14)", "#b96a00"], high: ["rgba(255,108,156,.14)", "#c4356b"], urgent: ["rgba(224,82,82,.14)", "#b63b3b"] };
const WORKFLOW = ["sales", "legal", "finance", "completed"];
const WORKFLOW_DOC_VIEW_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager"];
const DOCUMENT_UPLOAD_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager", "sales", "marketing", "legal-team", "finance-team", "support", "expert"];
const LEGAL_TRANSFER_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager", "sales"];
const ACTIVITY_OPTIONS = ["call", "email", "meeting", "note", "task", "comment"];
const PANEL_CLASS = "rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6";
const SOFT_PANEL_CLASS = "rounded-xl border border-slate-100 bg-slate-50 p-4";
const INPUT_CLASS = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-50";
const PRIMARY_BUTTON_CLASS = "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";
const GHOST_BUTTON_CLASS = "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";
const KICKER_CLASS = "text-[10px] font-bold uppercase tracking-widest text-slate-400";
const HERO_PANEL_CLASS = "rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6";
const PILL_CLASS = "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold";
const HEADER_ACTION_BUTTON_CLASS = "inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-50";
const nice = (v) => String(v || "").replace(/_/g, "-").split("-").filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1)).join(" ");
const money = (v) => `INR ${Number(v || 0).toLocaleString("en-IN")}`;
const when = (v, full = false) => formatIndiaDateTime(v, full);
const hrefForDoc = (fileUrl) => !fileUrl ? "#" : /^(https?:\/\/|blob:)/i.test(fileUrl) ? fileUrl : `${API_BASE}${fileUrl}`;
const telHrefFor = (value) => {
  const phone = String(value || "").replace(/[^\d+]/g, "");
  return phone ? `tel:${phone}` : "";
};
const whatsappHrefFor = (value) => {
  const phone = String(value || "").replace(/\D/g, "");
  return phone ? `https://wa.me/${phone}` : "";
};

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

function DetailCell({ label, value, className = "" }) {
  return (
    <div className={`rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 ${className}`}>
      <span className={KICKER_CLASS}>{label}</span>
      <strong className="mt-1 block text-sm text-slate-900">{value || "--"}</strong>
    </div>
  );
}

function unitText(value) {
  return value === undefined || value === null || value === "" ? "--" : String(value);
}

function HeaderActionButton({ disabled = false, icon, label, onClick }) {
  return (
    <button
      className={HEADER_ACTION_BUTTON_CLASS}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const activityLockRef = useRef(false);
  const [session, setSession] = useState(null), [lead, setLead] = useState(null), [notes, setNotes] = useState([]), [activity, setActivity] = useState([]), [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true), [savingActivity, setSavingActivity] = useState(false), [savingTask, setSavingTask] = useState(false), [transferring, setTransferring] = useState(false), [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [activityType, setActivityType] = useState("call"), [activityText, setActivityText] = useState(""), [transferOwner, setTransferOwner] = useState(""), [transferNote, setTransferNote] = useState("");
  const [task, setTask] = useState({ title: "", type: "call", priority: "medium", due_date: "", due_time: "", assigned_to: "", notes: "" });
  const { customization } = useCustomization(session?.token);
  const enabledStatuses = getEnabledStatuses(customization);
  const role = session?.user?.role || "";
  const canReviewWorkflowDocs = WORKFLOW_DOC_VIEW_ROLES.includes(role);
  const canUploadDocuments = DOCUMENT_UPLOAD_ROLES.includes(role);
  const canManageAssignments = ["super-admin", "platform-admin", "platform-manager", "admin", "manager", "sales"].includes(role);
  const canTransferToLegal = Boolean(lead?.can_transfer_to_legal) && LEGAL_TRANSFER_ROLES.includes(role);
  const scopedLegalUsers = useMemo(() => users.filter((user) => user.role === "legal-team"), [users]);
  const legalUsers = useMemo(
    () => withAssignedWorkflowUser(scopedLegalUsers, lead?.assigned_to_legal, lead?.legal_owner_name, "legal-team"),
    [lead?.assigned_to_legal, lead?.legal_owner_name, scopedLegalUsers]
  );
  const leadName = lead?.contact_person || lead?.company_name || "Lead";
  const hideWorkspaceTitle = ["sales", "marketing", "admin", "manager"].includes(role);
  const scopedUsersMessage = scopedUsersEmptyMessage(lead);
  const collaboratorUsersMessage = scopedUsersMessage;
  const legalUsersMessage = workflowUsersEmptyMessage(lead?.team_name, "legal");
  const currentUserName = session?.user?.name || session?.user?.full_name || "You";
  const documentRecords = useMemo(
    () => [
      ...(lead?.documents || []).map((item) => ({ ...item, sourceLabel: "Lead file" })),
      ...(canReviewWorkflowDocs ? (lead?.legal_documents || []).map((item) => ({ ...item, sourceLabel: "Legal" })) : []),
      ...(canReviewWorkflowDocs ? (lead?.finance_documents || []).map((item) => ({ ...item, sourceLabel: "Finance" })) : []),
    ],
    [canReviewWorkflowDocs, lead?.documents, lead?.finance_documents, lead?.legal_documents]
  );

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
  const collaboratorActions = useLeadCollaboratorActions({
    activeLead: lead,
    mergeLead: mergeLeadState,
    session,
    setError,
    setNotice,
    teamUsers: users,
  });

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

  async function refreshLead() { if (session) await loadLead(session); }

  function saveNote(content) {
    setError("");
    prependNote(content);
    setNotice("Follow-up note saved.");

    apiRequest(`/leads/${params.id}/notes`, {
        method: "POST",
        token: session.token,
        body: { content },
    }).catch((requestError) => {
        setError(formatScopedError(requestError, "Could not save this follow-up note."));
    });
  }

  function handleFollowUpStatusSaved(_leadId, content) {
    prependNote(content);
    setNotice("Follow-up status saved.");
  }

  async function uploadDocument(file) {
    if (!session?.token || !lead?.lead_id || !file) {
      return;
    }

    setUploadingDocuments(true);
    setError("");
    setNotice("");

    try {
      const uploadResponse = await apiRequest(`/leads/${params.id}/documents/upload`, {
        method: "POST",
        token: session.token,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "x-file-name": encodeURIComponent(file.name || "document"),
        },
        rawBody: file,
      });
      const createdDocument = uploadResponse.document || uploadResponse;

      setLead((current) => (
        current
          ? { ...current, documents: [createdDocument, ...(current.documents || [])] }
          : current
      ));
      prependActivity("updated", `Document uploaded: ${createdDocument.file_name}`);
      setNotice("Document uploaded successfully.");
    } catch (requestError) {
      setError(formatScopedError(requestError, "Could not upload this document."));
      throw requestError;
    } finally {
      setUploadingDocuments(false);
    }
  }

  function addActivity(event) {
    event.preventDefault();
    const description = activityText.trim();
    if (!description || activityLockRef.current) return;
    const type = activityType;
    activityLockRef.current = true;
    setSavingActivity(true); setError(""); setNotice("");
    setActivityText("");
    prependActivity(type, description);
    setNotice("Follow-up history updated.");
    setTimeout(() => { activityLockRef.current = false; setSavingActivity(false); }, 500);
    apiRequest(`/leads/${params.id}/activity`, { method: "POST", token: session.token, body: { type, description } })
      .catch((requestError) => setError(formatScopedError(requestError, "Could not update the follow-up history.")));
  }

  async function logQuick(type, description, href, { newTab = false } = {}) {
    try { await apiRequest(`/leads/${params.id}/activity`, { method: "POST", token: session.token, body: { type, description } }); } catch (_error) {}
    if (!href) {
      return;
    }
    if (newTab && /^https?:\/\//i.test(href)) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    window.location.href = href;
  }

  async function createTask(event) {
    event.preventDefault();
    if (!task.title.trim() || !task.due_date || !task.due_time) return setError("Follow-up title, date, and time are required.");
    setSavingTask(true); setError(""); setNotice("");
    try {
      const due = `${task.due_date} ${task.due_time}:00`;
      await apiRequest("/tasks", { method: "POST", token: session.token, body: { title: task.title.trim(), type: task.type, priority: task.priority, due_date: due, assigned_to: task.assigned_to || session.user?.user_id, related_to: "lead", related_id: lead.lead_id, team_id: lead.team_id || undefined, notes: task.notes || null } });
      const taskActivity = `Follow-up scheduled: ${task.title.trim()} on ${when(due, true)}`;
      await apiRequest(`/leads/${params.id}/activity`, { method: "POST", token: session.token, body: { type: "task", description: taskActivity } });
      setTask({ title: "", type: "call", priority: "medium", due_date: "", due_time: "", assigned_to: session.user?.user_id || "", notes: "" });
      prependActivity("task", taskActivity);
      setNotice("Follow-up scheduled successfully.");
    } catch (requestError) { setError(formatScopedError(requestError, "Could not schedule this follow-up.")); }
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

  const handleStatusUpdated = useCallback((updatedLead, statusContext = {}) => {
    mergeLeadState(updatedLead);
    const noteContent = updatedLead?.latest_note || statusContext.note;
    if (noteContent) {
      prependNote(noteContent, { incrementLeadCount: false });
    }
    if (statusContext.activityDescription) {
      prependActivity(statusContext.scheduled ? "task" : "updated", statusContext.activityDescription);
    }
    setNotice(`Lead status moved to ${nice(updatedLead?.status || "new")}.`);
  }, [mergeLeadState, prependActivity, prependNote]);

  function scrollToNotes() {
    document.getElementById("follow-up-notes")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToFollowUp() {
    document.getElementById("schedule-follow-up")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const phoneHref = telHrefFor(lead?.phone);
  const whatsappHref = whatsappHrefFor(lead?.phone);
  const emailHref = lead?.email ? `mailto:${lead.email}` : "";

  return (
    <DashboardShell session={session} title={lead ? lead.company_name : "Lead Detail"} hideTitle={hideWorkspaceTitle} heroStats={[]}>
      <AlertError message={error} onDismiss={() => setError("")} />
      {!error ? <AlertSuccess message={notice} onDismiss={() => setNotice("")} /> : null}
      {loading ? <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-500">Loading lead details…</div> : null}
      {!loading && lead ? (
        <section className="space-y-5">
          <article className={HERO_PANEL_CLASS}>
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button className={GHOST_BUTTON_CLASS} type="button" onClick={() => router.push("/leads")}>← Back</button>
                <button className={PRIMARY_BUTTON_CLASS} type="button" onClick={() => router.push(`/leads/${lead.lead_id}/edit`)}><DashboardIcon name="settings" className="h-4 w-4" />Edit Lead</button>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-xl font-bold text-white">
                      {leadName?.trim()?.slice(0, 1)?.toUpperCase() || "L"}
                    </div>
                    <div className="space-y-1">
                      <p className={KICKER_CLASS}>Lead Profile</p>
                      <h2 className="text-2xl font-bold tracking-tight text-slate-900">{leadName}</h2>
                      <p className="text-sm text-slate-500">{lead.company_name && lead.company_name !== leadName ? lead.company_name : "Lead profile and workflow context"}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <span className={PILL_CLASS} style={{ background: (STATUS_ACCENT[lead.status] || STATUS_ACCENT.new)[0], color: (STATUS_ACCENT[lead.status] || STATUS_ACCENT.new)[1] }}>{nice(lead.status)}</span>
                    <span className={PILL_CLASS} style={{ background: (PRIORITY_ACCENT[lead.priority] || PRIORITY_ACCENT.medium)[0], color: (PRIORITY_ACCENT[lead.priority] || PRIORITY_ACCENT.medium)[1] }}>{nice(lead.priority || "medium")}</span>
                    {lead.product_name ? <span className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">{lead.product_name}</span> : null}
                    {teamBadgeLabel(lead) ? <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">{teamBadgeLabel(lead)}</span> : null}
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">Workflow · {nice(lead.workflow_stage || "sales")}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <HeaderActionButton
                      label="Call"
                      onClick={() => logQuick("call", `Called ${leadName}`, phoneHref)}
                      disabled={!phoneHref}
                      icon={<DashboardIcon name="phone" className="h-4 w-4" />}
                    />
                    <HeaderActionButton
                      label="WhatsApp"
                      onClick={() => logQuick("comment", `Opened WhatsApp chat for ${leadName}`, whatsappHref, { newTab: true })}
                      disabled={!whatsappHref}
                      icon={<DashboardIcon name="message" className="h-4 w-4" />}
                    />
                    <HeaderActionButton
                      label="Email"
                      onClick={() => logQuick("email", `Opened email draft for ${leadName}`, emailHref)}
                      disabled={!emailHref}
                      icon={<DashboardIcon name="mail" className="h-4 w-4" />}
                    />
                    <HeaderActionButton
                      label="Schedule Follow-up"
                      onClick={scrollToFollowUp}
                      icon={<DashboardIcon name="calendar" className="h-4 w-4" />}
                    />
                    <HeaderActionButton
                      label="Follow-up Notes"
                      onClick={scrollToNotes}
                      icon={<DashboardIcon name="documents" className="h-4 w-4" />}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {lead.is_workflow ? (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <span className={KICKER_CLASS}>Workflow Status</span>
                      <div className="mt-3">
                        <WorkflowBadge
                          status={lead.workflow_status}
                          leadId={lead.lead_id}
                          role={session?.user?.role}
                          lead={lead}
                          onAction={refreshLead}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                      <span className={KICKER_CLASS}>Quick Status Update</span>
                      <div className="mt-3">
                        <LeadQuickStatusControl
                          assigneeOptions={users}
                          enabledStatuses={enabledStatuses}
                          lead={lead}
                          token={session?.token}
                          onUpdated={handleStatusUpdated}
                          hideLabel
                          className="w-full"
                          selectClassName="min-h-[40px] w-full bg-white pr-8 text-[11px] shadow-none"
                        />
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
                    <span className={KICKER_CLASS}>Follow-up Status</span>
                    <p className="mt-1 text-xs text-slate-500">Log call, email, WhatsApp, or meeting outcome.</p>
                    <LeadFollowUpStatusButton
                      className={`${PRIMARY_BUTTON_CLASS} mt-3 w-full justify-center border-sky-200 bg-white text-sky-700 hover:bg-sky-100`}
                      lead={lead}
                      onSaved={handleFollowUpStatusSaved}
                      token={session?.token}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <span className={KICKER_CLASS}>Assignee</span>
                      <strong className="mt-1 block text-sm font-bold text-slate-900">{lead.assigned_to_name || "Unassigned"}</strong>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <span className={KICKER_CLASS}>Follow-up</span>
                      <strong className="mt-1 block text-sm font-bold text-slate-900">{when(lead.follow_up_date, true)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <div className="grid gap-5 xl:grid-cols-[1.06fr_0.94fr] xl:items-start">
            <div className="space-y-5">
              <article className={PANEL_CLASS} id="follow-up-notes">
                <LeadNotesPanel
                  inputClassName={INPUT_CLASS}
                  notes={notes}
                  onSave={saveNote}
                  primaryButtonClassName={PRIMARY_BUTTON_CLASS}
                  renderWhen={when}
                />
              </article>

              <article className={PANEL_CLASS} id="follow-up-history">
                <div className="mb-4">
                  <span className={KICKER_CLASS}>Follow-up History</span>
                  <h2 className="mt-0.5 text-lg font-bold text-slate-900">Activity Log</h2>
                </div>
                <form className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-[0.9fr_1.2fr_auto]" onSubmit={addActivity}>
                  <select className={INPUT_CLASS} value={activityType} onChange={(event) => setActivityType(event.target.value)}>
                    {ACTIVITY_OPTIONS.map((option) => <option key={option} value={option}>{nice(option)}</option>)}
                  </select>
                  <input className={INPUT_CLASS} value={activityText} onChange={(event) => setActivityText(event.target.value)} placeholder="Add a follow-up update" />
                  <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={savingActivity}>{savingActivity ? "Saving..." : "Add Update"}</button>
                </form>
                <div className="mt-4">
                  <LeadHistoryTimeline items={activity} renderWhen={when} />
                </div>
              </article>

              <article className={PANEL_CLASS}>
                <div className="mb-4">
                  <span className={KICKER_CLASS}>Workflow</span>
                  <h2 className="mt-0.5 text-lg font-bold text-slate-900">Pipeline Stage</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {WORKFLOW.map((step, index) => {
                    const current = WORKFLOW.indexOf(lead.workflow_stage || "sales");
                    const state = index < current ? "done" : index === current ? "active" : "idle";
                    return (
                      <div key={step} className={`group relative overflow-hidden rounded-2xl border px-4 py-4 transition hover:-translate-y-0.5 ${
                        state === "active" ? "border-amber-300 bg-amber-50" : state === "done" ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-slate-50"
                      }`}>
                        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          state === "active" ? "bg-amber-500 text-white" : state === "done" ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                        }`}>{index + 1}</span>
                        <strong className="mt-3 block text-sm font-bold text-slate-900">{nice(step)}</strong>
                        <p className={`mt-0.5 text-xs font-semibold ${
                          state === "active" ? "text-amber-700" : state === "done" ? "text-emerald-700" : "text-slate-400"
                        }`}>{state === "active" ? "Current" : state === "done" ? "Done ✓" : "Waiting"}</p>
                      </div>
                    );
                  })}
                </div>
                {canReviewWorkflowDocs ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <DetailCell label="Legal Owner" value={formatWorkflowOwnerIdentity(lead.legal_owner_name, lead.assigned_to_legal)} />
                    <DetailCell label="Finance Owner" value={formatWorkflowOwnerIdentity(lead.finance_owner_name, lead.assigned_to_finance)} />
                    <DetailCell label="Legal Docs" value={(lead.legal_documents || []).length} />
                    <DetailCell label="Finance Docs" value={(lead.finance_documents || []).length} />
                  </div>
                ) : (
                  <p className="mt-4 rounded-[22px] bg-[#fffaf1] px-4 py-4 text-sm leading-7 text-[#6f614c]">
                    Workflow remains visible here, while uploaded document review stays limited to admin and manager screens.
                  </p>
                )}
                <LeadAssignmentFlow activity={activity} lead={lead} renderWhen={when} />
              </article>

              <article className={PANEL_CLASS}>
                <div className="mb-4">
                  <span className={KICKER_CLASS}>Workflow History</span>
                  <h2 className="mt-0.5 text-lg font-bold text-slate-900">Stage Movement</h2>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <strong className="block text-sm font-bold text-slate-900">Stage History</strong>
                    <div className="mt-3 space-y-2">
                      {(lead.stage_history || []).length ? lead.stage_history.map((item, index) => (
                        <div className="rounded-xl border border-slate-100 bg-white px-3 py-3" key={`stage-${item.stage}-${index}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <strong className="text-sm text-slate-900">{nice(item.stage)}</strong>
                              <p className="mt-0.5 text-xs text-slate-400">Entered {when(item.entered_at, true)}{item.exited_at ? ` · Exited ${when(item.exited_at, true)}` : " · Active"}</p>
                            </div>
                            <span className="text-xs font-semibold text-amber-700">{item.duration ? `${item.duration}m` : "--"}</span>
                          </div>
                        </div>
                      )) : <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">No stage history yet.</p>}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <strong className="block text-sm font-bold text-slate-900">Transfer Log</strong>
                    <div className="mt-3 space-y-2">
                      {(lead.transfer_history || []).length ? lead.transfer_history.map((item, index) => (
                        <div className="rounded-xl border border-slate-100 bg-white px-3 py-3" key={`transfer-${item.to_stage}-${index}`}>
                          <strong className="text-sm text-slate-900">{nice(item.from_stage)} → {nice(item.to_stage)}</strong>
                          <p className="mt-0.5 text-xs text-slate-400">{item.transferred_by_name || "User"} · {when(item.transferred_at, true)}{item.transferred_to_name ? ` · ${item.transferred_to_name}` : ""}</p>
                          {item.notes ? <p className="mt-1.5 text-xs text-slate-600">{item.notes}</p> : null}
                        </div>
                      )) : <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">No transfer history yet.</p>}
                    </div>
                  </div>
                </div>
              </article>
            </div>

            <div className="space-y-5">
              <article className={PANEL_CLASS}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <span className={KICKER_CLASS}>Lead Summary</span>
                    <h2 className="mt-0.5 text-lg font-bold text-slate-900">Account Overview</h2>
                  </div>
                  <span className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800">
                    {money(lead.estimated_value)}
                  </span>
                </div>

                {/* Contact identity block */}
                <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-600 text-base font-bold text-white">
                    {(lead.contact_person || lead.company_name || "L").slice(0,1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{lead.contact_person || "—"}</p>
                    <p className="truncate text-xs text-slate-500">{lead.company_name || "—"}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
                      {lead.email ? <a href={`mailto:${lead.email}`} className="hover:text-amber-700 hover:underline">{lead.email}</a> : null}
                      {lead.phone ? <a href={`tel:${String(lead.phone).replace(/[^\d+]/g,"")}`} className="hover:text-amber-700 hover:underline">{lead.phone}</a> : null}
                    </div>
                  </div>
                </div>

                {/* Key metrics row */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    ["Source",    nice(lead.lead_source || "website"),  "border-slate-100 bg-slate-50"],
                    ["Priority",  nice(lead.priority || "medium"),      "border-amber-100 bg-amber-50"],
                    ["Team",      teamBadgeLabel(lead) || "Auto team",  "border-slate-100 bg-slate-50"],
                    ["Units",     unitText(lead.number_of_units),       "border-slate-100 bg-slate-50"],
                    ["Employees", lead.no_of_employees || "—",          "border-slate-100 bg-slate-50"],
                    ["Active Users", lead.active_users || "—",          "border-slate-100 bg-slate-50"],
                    ["Payment Mode", nice(lead.payment_mode || "—"),    "border-emerald-100 bg-emerald-50"],
                    ["Payment Date", lead.payment_date ? when(lead.payment_date).split(',')[0] : "—", "border-emerald-100 bg-emerald-50"],
                    ["Sub Start", lead.subscription_start_date ? when(lead.subscription_start_date).split(',')[0] : "—", "border-slate-100 bg-slate-50"],
                    ["Tenure",    lead.client_tenure ? when(lead.client_tenure).split(',')[0] : "—",            "border-slate-100 bg-slate-50"],
                    ["Next Payment", lead.next_payment_date ? when(lead.next_payment_date).split(',')[0] : "—", "border-amber-100 bg-amber-50"],
                    ["Created By",lead.created_by_name || "—",          "border-slate-100 bg-slate-50"],
                    ["Lead ID",   lead.lead_id,                         "border-slate-100 bg-slate-50"],
                  ].map(([label, value, accent]) => (
                    <div key={label} className={`rounded-xl border px-3 py-2.5 ${accent}`}>
                      <p className={KICKER_CLASS}>{label}</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-800 break-words">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Requirements */}
                {lead.requirements ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className={KICKER_CLASS}>Requirements</span>
                      {lead.product_name ? <span className="text-[11px] font-semibold text-amber-700">{lead.product_name}</span> : null}
                    </div>
                    <p className="text-sm leading-6 text-slate-700">{lead.requirements}</p>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-3 text-center">
                    <p className="text-xs text-slate-400">No requirements added yet.</p>
                  </div>
                )}
              </article>

              <article className={PANEL_CLASS} id="schedule-follow-up">
                <div className="mb-4">
                  <span className={KICKER_CLASS}>Schedule Follow-up</span>
                  <h2 className="mt-0.5 text-lg font-bold text-slate-900">Book Next Action</h2>
                </div>
                <form className="grid gap-4" onSubmit={createTask}>
                  <label className="space-y-2"><span className={KICKER_CLASS}>Title</span><input className={INPUT_CLASS} value={task.title} onChange={(event) => setTask((current) => ({ ...current, title: event.target.value }))} placeholder="Follow-up call, proposal review, demo" /></label>
                  <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className={KICKER_CLASS}>Communication Mode</span><select className={INPUT_CLASS} value={task.type} onChange={(event) => setTask((current) => ({ ...current, type: event.target.value }))}><option value="call">Call</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select></label><label className="space-y-2"><span className={KICKER_CLASS}>Priority</span><select className={INPUT_CLASS} value={task.priority} onChange={(event) => setTask((current) => ({ ...current, priority: event.target.value }))}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="urgent">urgent</option></select></label></div>
                  <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className={KICKER_CLASS}>Date</span><input className={INPUT_CLASS} type="date" value={task.due_date} onChange={(event) => setTask((current) => ({ ...current, due_date: event.target.value }))} /></label><label className="space-y-2"><span className={KICKER_CLASS}>Time</span><input className={INPUT_CLASS} type="time" value={task.due_time} onChange={(event) => setTask((current) => ({ ...current, due_time: event.target.value }))} /></label></div>
                  <label className="space-y-2"><span className={KICKER_CLASS}>Assignee</span><select className={INPUT_CLASS} value={task.assigned_to} onChange={(event) => setTask((current) => ({ ...current, assigned_to: event.target.value }))}><option value="">Select assignee</option>{users.map((user) => <option key={user.user_id} value={user.user_id}>{user.name} | {user.role}</option>)}</select>{!users.length ? <p className="text-xs font-medium text-[#8d6e27]">{scopedUsersMessage}</p> : null}</label>
                  <label className="space-y-2"><span className={KICKER_CLASS}>Follow-up Notes</span><textarea className={`${INPUT_CLASS} min-h-[120px] resize-y`} rows="3" value={task.notes} onChange={(event) => setTask((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional preparation notes" /></label>
                  <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={savingTask}>{savingTask ? "Scheduling..." : "Schedule Follow-up"}</button>
                </form>
              </article>

              <article className={PANEL_CLASS}>
                <div className="mb-4">
                  <span className={KICKER_CLASS}>Documents</span>
                  <h2 className="mt-0.5 text-lg font-bold text-slate-900">Files & Attachments</h2>
                </div>
                <LeadDocumentsPanel
                  canUpload={canUploadDocuments}
                  documents={documentRecords}
                  emptyMessage="No lead documents uploaded yet."
                  ghostButtonClassName={GHOST_BUTTON_CLASS}
                  helperText={
                    canReviewWorkflowDocs
                      ? "Upload PDF, image, DOC, or DOCX files. Legal and finance workflow files also appear here."
                      : "Upload PDF, image, DOC, or DOCX files for this lead. Workflow documents remain limited to admin and manager screens."
                  }
                  kickerClassName={KICKER_CLASS}
                  onUpload={uploadDocument}
                  primaryButtonClassName={PRIMARY_BUTTON_CLASS}
                  renderWhen={when}
                  resolveHref={hrefForDoc}
                  uploading={uploadingDocuments}
                />
              </article>

              {canTransferToLegal ? <article className={`${PANEL_CLASS} border-emerald-200 bg-emerald-50`}><div className="mb-4"><span className={KICKER_CLASS}>Closed Won</span><h2 className="mt-0.5 text-lg font-bold text-slate-900">Transfer to Legal</h2></div><form className="grid gap-4" onSubmit={transferToLegal}><label className="space-y-2"><span className={KICKER_CLASS}>Legal Owner</span><select className={INPUT_CLASS} value={transferOwner} onChange={(event) => setTransferOwner(event.target.value)}><option value="">Assign later</option>{legalUsers.map((user) => <option key={user.user_id} value={user.user_id}>{formatWorkflowOwnerIdentity(user.name, user.user_id, "Legal user")}</option>)}</select>{!scopedLegalUsers.length ? <p className="text-xs font-medium text-[#8d6e27]">{legalUsersMessage}</p> : null}</label><label className="space-y-2"><span className={KICKER_CLASS}>Transfer Note *</span><textarea className={`${INPUT_CLASS} min-h-[150px] resize-y`} rows="4" value={transferNote} onChange={(event) => setTransferNote(event.target.value)} placeholder="What is ready for legal and what should be checked next?" /></label><button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={transferring || !transferNote.trim()}>{transferring ? "Transferring..." : "Transfer to Legal"}</button></form></article> : null}

              <article className={PANEL_CLASS}>
                <LeadCollaboratorPanel
                  addCollaborator={collaboratorActions.addCollaborator}
                  canManage={canManageAssignments}
                  collaboratorUsersMessage={collaboratorUsersMessage}
                  lead={lead}
                  pendingCollaborator={collaboratorActions.pendingCollaborator}
                  removeCollaborator={collaboratorActions.removeCollaborator}
                  removingCollaboratorId={collaboratorActions.removingCollaboratorId}
                  savingCollaborators={collaboratorActions.savingCollaborators}
                  setPendingCollaborator={collaboratorActions.setPendingCollaborator}
                  teamUsers={users}
                />
              </article>
            </div>
          </div>
        </section>
      ) : null}
    </DashboardShell>
  );
}
