"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../components/dashboard/icons";
import LeadCollaboratorPanel from "../../../components/leads/details/LeadCollaboratorPanel";
import LeadDocumentsPanel from "../../../components/leads/details/LeadDocumentsPanel";
import LeadHistoryTimeline from "../../../components/leads/details/LeadHistoryTimeline";
import LeadNotesPanel from "../../../components/leads/details/LeadNotesPanel";
import LeadQuickStatusControl from "../../../components/leads/LeadQuickStatusControl";
import { useLeadCollaboratorActions } from "../../../components/leads/shared/useLeadCollaboratorActions";
import { API_BASE, apiRequest } from "../../../lib/api";
import { formatIndiaDateTime } from "../../../lib/dateTime";
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

const STATUS_ACCENT = { new: ["rgba(79,140,255,.12)", "#2f6fdd"], contacted: ["rgba(56,189,248,.14)", "#0077b8"], qualified: ["rgba(167,139,250,.14)", "#6d46d6"], proposal: ["rgba(245,164,45,.14)", "#b96a00"], negotiation: ["rgba(251,146,60,.14)", "#c96200"], "booked-demo": ["rgba(137,92,246,.14)", "#7a3ef0"], "demo-done": ["rgba(16,185,129,.14)", "#0f8c53"], "trial-started": ["rgba(59,130,246,.14)", "#2d64dd"], "closed-won": ["rgba(31,199,120,.16)", "#0f8c53"], "closed-lost": ["rgba(224,82,82,.14)", "#b63b3b"] };
const PRIORITY_ACCENT = { low: ["rgba(56,189,248,.12)", "#0077b8"], medium: ["rgba(245,164,45,.14)", "#b96a00"], high: ["rgba(255,108,156,.14)", "#c4356b"], urgent: ["rgba(224,82,82,.14)", "#b63b3b"] };
const WORKFLOW = ["sales", "legal", "finance", "completed"];
const WORKFLOW_DOC_VIEW_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager"];
const DOCUMENT_UPLOAD_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager", "sales", "marketing", "legal-team", "finance-team", "support"];
const LEGAL_TRANSFER_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager", "sales"];
const ACTIVITY_OPTIONS = ["call", "email", "meeting", "note", "task", "comment"];
const PANEL_CLASS = "rounded-[30px] border border-[#efe6d8] bg-white/84 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.05)] md:p-6";
const SOFT_PANEL_CLASS = "rounded-[24px] bg-[#fffaf1] p-4";
const INPUT_CLASS = "w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none transition placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const PRIMARY_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2.5 text-sm font-semibold text-[#060710] shadow-[0_16px_30px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f] disabled:cursor-not-allowed disabled:opacity-60";
const GHOST_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710] disabled:cursor-not-allowed disabled:opacity-60";
const KICKER_CLASS = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";
const HERO_PANEL_CLASS = "rounded-[36px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(250,241,221,0.98)_44%,_rgba(245,231,193,0.98)_100%)] p-6 shadow-[0_24px_70px_rgba(79,58,22,0.08)] md:p-8";
const PILL_CLASS = "inline-flex rounded-full px-3 py-1 text-[11px] font-bold";
const HEADER_ACTION_BUTTON_CLASS = "inline-flex min-h-[46px] items-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white/90 px-4 py-2.5 text-sm font-semibold text-[#7a6230] transition hover:-translate-y-0.5 hover:border-[#d7b258] hover:text-[#060710] hover:shadow-[0_10px_20px_rgba(203,169,82,0.14)] disabled:cursor-not-allowed disabled:opacity-50";
const nice = (v) => String(v || "").split("-").filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1)).join(" ");
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
    <div className={`rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4 ${className}`}>
      <span className={KICKER_CLASS}>{label}</span>
      <strong className="mt-3 block text-sm leading-6 text-[#060710]">{value || "--"}</strong>
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
  const [session, setSession] = useState(null), [lead, setLead] = useState(null), [notes, setNotes] = useState([]), [activity, setActivity] = useState([]), [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true), [savingActivity, setSavingActivity] = useState(false), [savingTask, setSavingTask] = useState(false), [transferring, setTransferring] = useState(false), [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [activityType, setActivityType] = useState("call"), [activityText, setActivityText] = useState(""), [transferOwner, setTransferOwner] = useState(""), [transferNote, setTransferNote] = useState("");
  const [task, setTask] = useState({ title: "", type: "call", priority: "medium", due_date: "", due_time: "", assigned_to: "", notes: "" });
  const role = session?.user?.role || "";
  const canReviewWorkflowDocs = WORKFLOW_DOC_VIEW_ROLES.includes(role);
  const canUploadDocuments = DOCUMENT_UPLOAD_ROLES.includes(role);
  const canManageAssignments = ["super-admin", "platform-admin", "platform-manager", "admin", "manager"].includes(role);
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
      setNotice("Follow-up note saved.");
    } catch (requestError) {
      setError(formatScopedError(requestError, "Could not save this follow-up note."));
      throw requestError;
    }
  }

  async function uploadDocument(file) {
    if (!session?.token || !lead?.lead_id || !file) {
      return;
    }

    setUploadingDocuments(true);
    setError("");
    setNotice("");

    try {
      const createdDocument = await apiRequest(`/leads/${params.id}/documents/upload`, {
        method: "POST",
        token: session.token,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "x-file-name": encodeURIComponent(file.name || "document"),
        },
        rawBody: file,
      });

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

  async function addActivity(event) {
    event.preventDefault();
    const description = activityText.trim();
    if (!description) return;
    setSavingActivity(true); setError(""); setNotice("");
    try {
      await apiRequest(`/leads/${params.id}/activity`, { method: "POST", token: session.token, body: { type: activityType, description } });
      setActivityText("");
      prependActivity(activityType, description);
      setNotice("Follow-up history updated.");
    }
    catch (requestError) { setError(formatScopedError(requestError, "Could not update the follow-up history.")); }
    finally { setSavingActivity(false); }
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

  const handleStatusUpdated = useCallback((updatedLead) => {
    mergeLeadState(updatedLead);
    if (updatedLead?.latest_note) {
      prependNote(updatedLead.latest_note, { incrementLeadCount: false });
    }
    setNotice(`Lead status moved to ${nice(updatedLead?.status || "new")}.`);
  }, [mergeLeadState, prependNote]);

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
      {loading ? <div className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-[#6f614c]">Loading lead details...</div> : null}
      {!loading && lead ? (
        <section className="space-y-5">
          <article className={HERO_PANEL_CLASS}>
            <div className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <button className={GHOST_BUTTON_CLASS} type="button" onClick={() => router.push("/leads")}>
                  Back to Leads
                </button>
                <button className={GHOST_BUTTON_CLASS} type="button" onClick={() => router.push(`/leads/${lead.lead_id}/edit`)}>
                  Edit Lead
                </button>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
                <div className="space-y-5">
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
                  <div className={SOFT_PANEL_CLASS}>
                    <span className={KICKER_CLASS}>Quick Status Update</span>
                    <div className="mt-3">
                      <LeadQuickStatusControl
                        lead={lead}
                        token={session?.token}
                        onUpdated={handleStatusUpdated}
                        hideLabel
                        className="w-full"
                        selectClassName="min-h-[40px] w-full bg-white pr-8 text-[11px] shadow-none"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className={SOFT_PANEL_CLASS}>
                      <span className={KICKER_CLASS}>Primary Assignee</span>
                      <strong className="mt-3 block text-base font-black text-[#060710]">{lead.assigned_to_name || "Unassigned"}</strong>
                    </div>
                    <div className={SOFT_PANEL_CLASS}>
                      <span className={KICKER_CLASS}>Last Follow-up</span>
                      <strong className="mt-3 block text-base font-black text-[#060710]">{when(lead.follow_up_date, true)}</strong>
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
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className={KICKER_CLASS}>Follow-up History</span>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Follow-up History</h2>
                  </div>
                </div>
                <form className="grid gap-3 rounded-[24px] bg-[#fffaf1] p-4 md:grid-cols-[0.9fr_1.2fr_auto]" onSubmit={addActivity}>
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
                <div className="mb-5"><div><span className={KICKER_CLASS}>Workflow</span><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Workflow & transfer path</h2></div></div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {WORKFLOW.map((step, index) => {
                    const current = WORKFLOW.indexOf(lead.workflow_stage || "sales");
                    const state = index < current ? "done" : index === current ? "active" : "idle";

                    return (
                      <div
                        key={step}
                        className={`rounded-[24px] px-4 py-4 shadow-[0_10px_24px_rgba(79,58,22,0.04)] ${
                          state === "active"
                            ? "bg-[#fff4d8]"
                            : state === "done"
                              ? "bg-emerald-50"
                              : "bg-[#fffaf1]"
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
            </div>

            <div className="space-y-5">
              <article className={PANEL_CLASS}>
                <div className="mb-5">
                  <span className={KICKER_CLASS}>Lead Summary</span>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Lead Summary</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailCell label="Contact" value={lead.contact_person} />
                  <DetailCell label="Company" value={lead.company_name} />
                  <DetailCell label="Phone" value={lead.phone || "--"} />
                  <DetailCell label="Email" value={lead.email || "--"} />
                  <DetailCell label="Team" value={teamBadgeLabel(lead) || "Auto team"} />
                  <DetailCell label="Units" value={unitText(lead.number_of_units)} />
                  <DetailCell label="Value" value={money(lead.estimated_value)} />
                  <DetailCell label="Source" value={nice(lead.lead_source || "website")} />
                  <DetailCell label="Lead ID" value={lead.lead_id} />
                  <DetailCell label="Created By" value={lead.created_by_name || "--"} />
                </div>
                <div className="mt-4 rounded-[24px] bg-[#fffaf1] p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className={KICKER_CLASS}>Requirements</span>
                    <strong className="text-xs font-bold text-[#8f816a]">{lead.product_name || "Lead brief"}</strong>
                  </div>
                  <p className="text-sm leading-7 text-[#5f533f]">{lead.requirements || "No requirements have been added to this lead yet."}</p>
                </div>
              </article>

              <article className={PANEL_CLASS} id="schedule-follow-up">
                <div className="mb-5"><div><span className={KICKER_CLASS}>Schedule Follow-up</span><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Schedule Follow-up</h2></div></div>
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
                <div className="mb-5"><div><span className={KICKER_CLASS}>Documents</span><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Documents</h2></div></div>
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

              {canTransferToLegal ? <article className={`${PANEL_CLASS} bg-[#f5fbf0]`}><div className="mb-5"><div><span className={KICKER_CLASS}>Closed Won</span><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Transfer to legal</h2></div></div><form className="grid gap-4" onSubmit={transferToLegal}><label className="space-y-2"><span className={KICKER_CLASS}>Legal Owner</span><select className={INPUT_CLASS} value={transferOwner} onChange={(event) => setTransferOwner(event.target.value)}><option value="">Assign later</option>{legalUsers.map((user) => <option key={user.user_id} value={user.user_id}>{formatWorkflowOwnerIdentity(user.name, user.user_id, "Legal user")}</option>)}</select>{!scopedLegalUsers.length ? <p className="text-xs font-medium text-[#8d6e27]">{legalUsersMessage}</p> : null}</label><label className="space-y-2"><span className={KICKER_CLASS}>Transfer Note *</span><textarea className={`${INPUT_CLASS} min-h-[150px] resize-y`} rows="4" value={transferNote} onChange={(event) => setTransferNote(event.target.value)} placeholder="What is ready for legal and what should be checked next?" /></label><button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={transferring || !transferNote.trim()}>{transferring ? "Transferring..." : "Transfer to Legal"}</button></form></article> : null}

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
