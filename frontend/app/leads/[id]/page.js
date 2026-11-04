"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import LeadAssignmentFlow from "../../../components/leads/details/LeadAssignmentFlow";
import LeadCallHistoryPanel from "../../../components/leads/details/LeadCallHistoryPanel";
import LeadCollaboratorPanel from "../../../components/leads/details/LeadCollaboratorPanel";
import LeadDocumentsPanel from "../../../components/leads/details/LeadDocumentsPanel";
import LeadTasksPanel from "../../../components/leads/lead360/LeadTasksPanel";
import LeadTimeline from "../../../components/leads/lead360/LeadTimeline";
import { NextStepCard, PaymentCard, QuickNote, StagePath } from "../../../components/leads/lead360/LeadSummaryCards";
import EmailButton from "../../../components/email/EmailButton";
import LeadEmails from "../../../components/email/LeadEmails";
import LeadDetailsCard, { Row } from "../../../components/leads/lead360/LeadDetailsCard";
import LeadFollowUpStatusButton from "../../../components/leads/LeadFollowUpStatusButton";
import TransferLeadButton from "../../../components/leads/TransferLeadButton";
import WorkflowBadge from "../../../components/leads/WorkflowBadge";
import { useLeadCollaboratorActions } from "../../../components/leads/shared/useLeadCollaboratorActions";
import { LEAD_INPUT_CLASS, PRIORITY_TONE } from "../../../components/leads/shared/leadPageConstants";
import { LeadAvatar, Pill, telHref, whatsappHref } from "../../../components/leads/workspace/LeadsTable";
import { API_BASE, apiRequest } from "../../../lib/api";
import { formatIndiaDateTime } from "../../../lib/dateTime";
import { loadSession } from "../../../lib/session";
import { useCustomization } from "../../../lib/useCustomization";
import { getEnabledStatuses } from "../../../lib/leadStatusHelper";
import { formatScopedError, loadUsersForScope, scopedUsersEmptyMessage, teamBadgeLabel } from "../../../lib/teamScope";
import { AlertError, AlertSuccess } from "../../../components/ui/Alert";
import { formatWorkflowOwnerIdentity, withAssignedWorkflowUser, workflowUsersEmptyMessage } from "../../../lib/workflowOwners";

const WORKFLOW = ["sales", "legal", "finance", "completed"];
const WORKFLOW_DOC_VIEW_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager"];
const DOCUMENT_UPLOAD_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager", "sales", "marketing", "legal-team", "finance-team", "support"];
const ASSIGNMENT_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager", "sales"];
const UPDATE_TYPES = [["call", "Call"], ["email", "Email"], ["meeting", "Meeting"], ["task", "Task"], ["comment", "Comment"]];
const TABS = [["timeline", "Timeline"], ["tasks", "Tasks & follow-ups"], ["documents", "Documents"], ["workflow", "Workflow"]];
const PRIMARY = "inline-flex h-9 items-center justify-center gap-2 rounded-[10px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-50";
const GHOST = "inline-flex h-9 items-center justify-center gap-2 rounded-[10px] bg-white px-3 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50";
const KICKER = "text-[11px] font-semibold uppercase tracking-wide text-slate-400";
const CARD = "rounded-[14px] bg-white p-4 ring-1 ring-slate-200";
const ICONS = {
  call: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  whatsapp: "M21 12a9 9 0 0 1-13.5 7.8L3 21l1.2-4.5A9 9 0 1 1 21 12",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z",
  back: "M19 12H5m6-6-6 6 6 6",
};
const Icon = ({ d }) => <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
const nice = (v) => String(v || "").replace(/_/g, "-").split("-").filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1)).join(" ");
const when = (v, full = false) => formatIndiaDateTime(v, full);
const hrefForDoc = (fileUrl) => (!fileUrl ? "#" : /^(https?:\/\/|blob:)/i.test(fileUrl) ? fileUrl : `${API_BASE}${fileUrl}`);

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [lead, setLead] = useState(null);
  const [notes, setNotes] = useState([]);
  const [activity, setActivity] = useState([]);
  const [calls, setCalls] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("timeline");
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [updateType, setUpdateType] = useState("call");
  const [updateText, setUpdateText] = useState("");
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [transferOwner, setTransferOwner] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [transferring, setTransferring] = useState(false);
  const { customization } = useCustomization(session?.token);
  const enabledStatuses = getEnabledStatuses(customization);
  const role = session?.user?.role || "";
  const selfId = session?.user?.user_id;
  const canEdit = role !== "viewer";
  const isNewLead = !lead?.status || lead.status === "new";
  const canReviewWorkflowDocs = WORKFLOW_DOC_VIEW_ROLES.includes(role);
  const canUploadDocuments = DOCUMENT_UPLOAD_ROLES.includes(role);
  const canManageAssignments = ASSIGNMENT_ROLES.includes(role);
  const canTransferToLegal = Boolean(lead?.can_transfer_to_legal) && ASSIGNMENT_ROLES.includes(role);
  const scopedLegalUsers = useMemo(() => users.filter((user) => user.role === "legal-team"), [users]);
  const legalUsers = useMemo(
    () => withAssignedWorkflowUser(scopedLegalUsers, lead?.assigned_to_legal, lead?.legal_owner_name, "legal-team"),
    [lead?.assigned_to_legal, lead?.legal_owner_name, scopedLegalUsers]
  );
  const documentRecords = useMemo(() => [
    ...(lead?.documents || []).map((item) => ({ ...item, sourceLabel: "Lead file" })),
    ...(canReviewWorkflowDocs ? (lead?.legal_documents || []).map((item) => ({ ...item, sourceLabel: "Legal" })) : []),
    ...(canReviewWorkflowDocs ? (lead?.finance_documents || []).map((item) => ({ ...item, sourceLabel: "Finance" })) : []),
  ], [canReviewWorkflowDocs, lead?.documents, lead?.finance_documents, lead?.legal_documents]);

  const mergeLeadState = useCallback((updated) => {
    if (updated?.lead_id) setLead((current) => (current ? { ...current, ...updated } : updated));
  }, []);
  const collaboratorActions = useLeadCollaboratorActions({ activeLead: lead, mergeLead: mergeLeadState, session, setError, setNotice, teamUsers: users });

  const loadHistory = useCallback(async (token) => {
    const [noteRes, activityRes, callRes] = await Promise.all([
      apiRequest(`/leads/${params.id}/notes?page_size=50`, { token, fresh: true }),
      apiRequest(`/leads/${params.id}/activity?page_size=50`, { token, fresh: true }),
      apiRequest(`/leads/${params.id}/calls?page_size=10`, { token, fresh: true }).catch(() => ({ items: [] })),
    ]);
    setNotes(noteRes.items || []);
    setActivity(activityRes.items || []);
    setCalls(callRes.items || callRes.data || []);
  }, [params.id]);

  const loadLead = useCallback(async (activeSession, includeUsers = false) => {
    const leadResponse = await apiRequest(`/leads/${params.id}`, { token: activeSession.token, fresh: true });
    await loadHistory(activeSession.token);
    setLead(leadResponse);
    setTransferOwner(leadResponse.assigned_to_legal || "");
    if (includeUsers) {
      loadUsersForScope(activeSession.token, { companyId: leadResponse.company_id, teamId: leadResponse.team_id, pageSize: 100, path: "/users" })
        .then(setUsers)
        .catch(() => setUsers([]));
    }
  }, [params.id, loadHistory]);

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) { router.replace("/login"); return; }
    setSession(activeSession);
    setUsers([]);
    loadLead(activeSession, true)
      .catch((requestError) => setError(formatScopedError(requestError, "Could not load this lead.")))
      .finally(() => setLoading(false));
  }, [params.id, router, loadLead]);

  const refreshHistory = useCallback(() => { if (session?.token) loadHistory(session.token).catch(() => {}); }, [session?.token, loadHistory]);

  const followUpSaved = useCallback((_leadId, content, updated) => {
    setLead((current) => (current ? { ...current, ...(updated || {}), latest_note: content, note_count: Number(current.note_count || 0) + 1 } : current));
    setNotice("Saved to the lead's timeline.");
    refreshHistory();
  }, [refreshHistory]);

  const statusUpdated = useCallback((updated, context = {}) => {
    mergeLeadState(updated);
    // The first call is the instant update; the final one has the saved lead.
    if (!context.note && !context.activityDescription) {
      setNotice(`Lead moved to ${nice(updated?.status || "new")}.`);
      refreshHistory();
    }
  }, [mergeLeadState, refreshHistory]);

  async function uploadDocument(file) {
    if (!session?.token || !lead?.lead_id || !file) return;
    setUploadingDocuments(true);
    setError("");
    setNotice("");
    try {
      const uploadResponse = await apiRequest(`/leads/${params.id}/documents/upload`, {
        method: "POST",
        token: session.token,
        headers: { "Content-Type": file.type || "application/octet-stream", "x-file-name": encodeURIComponent(file.name || "document") },
        rawBody: file,
      });
      const createdDocument = uploadResponse.document || uploadResponse;
      setLead((current) => (current ? { ...current, documents: [createdDocument, ...(current.documents || [])] } : current));
      setNotice("Document uploaded.");
      refreshHistory();
    } catch (requestError) {
      setError(formatScopedError(requestError, "Could not upload this document."));
      throw requestError;
    } finally {
      setUploadingDocuments(false);
    }
  }

  async function addUpdate(event) {
    event.preventDefault();
    const description = updateText.trim();
    if (!description) return;
    setSavingUpdate(true);
    setError("");
    try {
      await apiRequest(`/leads/${params.id}/activity`, { method: "POST", token: session.token, body: { type: updateType, description } });
      setUpdateText("");
      refreshHistory();
    } catch (requestError) {
      setError(formatScopedError(requestError, "Could not add this update."));
    } finally {
      setSavingUpdate(false);
    }
  }

  async function logQuick(type, description, href, newTab = false) {
    if (!href) return;
    apiRequest(`/leads/${params.id}/activity`, { method: "POST", token: session.token, body: { type, description } }).then(refreshHistory).catch(() => {});
    if (newTab) window.open(href, "_blank", "noopener,noreferrer");
    else window.location.href = href;
  }

  async function transferToLegal(event) {
    event.preventDefault();
    if (!transferNote.trim()) { setError("Write a transfer note before moving this lead to legal."); return; }
    setTransferring(true);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/workflow/${params.id}/transfer-to-legal`, { method: "POST", token: session.token, body: { assigned_to: transferOwner || null, notes: transferNote.trim() } });
      setTransferNote("");
      setNotice("Lead transferred to legal.");
      await loadLead(session);
    } catch (requestError) {
      setError(formatScopedError(requestError, "Could not transfer this lead to legal."));
    } finally {
      setTransferring(false);
    }
  }

  const name = lead ? lead.company_name || lead.contact_person || "Lead" : "Lead";
  const stageIndex = WORKFLOW.indexOf(lead?.workflow_stage || "sales");
  const taskPeople = users;

  return (
    <DashboardShell session={session} title={name} hideTitle heroStats={[]}>
      <div className="tw-buttons min-w-0 space-y-3 pb-10">
        <AlertError message={error} onDismiss={() => setError("")} />
        {!error ? <AlertSuccess message={notice} onDismiss={() => setNotice("")} /> : null}
        {loading ? <div className="h-40 animate-pulse rounded-[14px] bg-white ring-1 ring-slate-200" /> : null}

        {!loading && lead ? (
          <>
            <section className={CARD}>
              <div className="flex flex-wrap items-start gap-3">
                <Link href="/leads" aria-label="Back to leads" title="Back to leads" className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"><Icon d={ICONS.back} /></Link>
                <LeadAvatar lead={lead} size="h-12 w-12 text-[15px]" />
                <div className="min-w-[200px] flex-1">
                  <h1 className="text-[20px] font-bold leading-tight tracking-tight text-slate-900">{name}</h1>
                  <p className="text-[13px] text-slate-500">{[lead.company_name ? lead.contact_person : null, lead.phone, lead.email].filter(Boolean).join(" · ")}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Pill tone={PRIORITY_TONE[lead.priority] || PRIORITY_TONE.medium}>{lead.priority || "medium"}</Pill>
                    {lead.product_name ? <span className="rounded-full bg-gold-50 px-2 py-0.5 text-[11px] font-semibold text-gold-800">{lead.product_name}</span> : null}
                    {teamBadgeLabel(lead) ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{teamBadgeLabel(lead)}</span> : null}
                    <span className="text-[12px] text-slate-500">Owner: <b className="font-semibold text-slate-700">{lead.assigned_to_name || "Unassigned"}</b></span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" className={GHOST} disabled={!lead.phone} onClick={() => logQuick("call", `Called ${name}`, telHref(lead.phone))}><Icon d={ICONS.call} />Call</button>
                  <button type="button" className={GHOST} disabled={!lead.phone} onClick={() => logQuick("comment", `Opened WhatsApp chat for ${name}`, whatsappHref(lead.phone), true)}><Icon d={ICONS.whatsapp} />WhatsApp</button>
                  <button type="button" className={GHOST} disabled={!lead.email} onClick={() => logQuick("email", `Opened email draft for ${name}`, lead.email ? `mailto:${lead.email}` : "")}><Icon d={ICONS.mail} />Email</button>
                  {canEdit ? <Link href={`/leads/${lead.lead_id}/edit`} className={GHOST}><Icon d={ICONS.edit} />Edit</Link> : null}
                  <TransferLeadButton leadId={lead.id || lead.lead_id} leadName={name} className={GHOST} label="Transfer" />
                  <EmailButton session={session} label="Email owner" kind="lead" lead={lead} defaultTo={[lead.assigned_to]} />
                  {canEdit ? <LeadFollowUpStatusButton className={PRIMARY} label="Log follow-up" lead={lead} onSaved={followUpSaved} token={session?.token} disabled={isNewLead} /> : null}
                </div>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3">
                {lead.is_workflow ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={KICKER}>Workflow status</span>
                    <WorkflowBadge status={lead.workflow_status} leadId={lead.lead_id} role={role} lead={lead} onAction={() => loadLead(session)} />
                  </div>
                ) : <StagePath lead={lead} enabledStatuses={enabledStatuses} token={session?.token} teamUsers={users} canEdit={canEdit} onUpdated={statusUpdated} />}
              </div>
            </section>

            <div className="grid items-start gap-3 lg:grid-cols-[330px_minmax(0,1fr)]">
              <div className="min-w-0 space-y-3 lg:sticky lg:top-[72px]">
                <NextStepCard lead={lead} token={session?.token} canEdit={canEdit} onSaved={followUpSaved} hideAction />
                <PaymentCard lead={lead} />
                <LeadEmails session={session} leadId={lead.lead_id} />
                <LeadDetailsCard lead={lead} token={session?.token} canDelete={["super-admin", "admin", "manager"].includes(role)} onDeleted={() => router.push("/leads")} />
                <LeadCollaboratorPanel addCollaborator={collaboratorActions.addCollaborator} canManage={canManageAssignments} collaboratorUsersMessage={scopedUsersEmptyMessage(lead)} lead={lead}
                  pendingCollaborator={collaboratorActions.pendingCollaborator} removeCollaborator={collaboratorActions.removeCollaborator} removingCollaboratorId={collaboratorActions.removingCollaboratorId}
                  savingCollaborators={collaboratorActions.savingCollaborators} setPendingCollaborator={collaboratorActions.setPendingCollaborator} teamUsers={users} />
              </div>

              <div className="min-w-0 space-y-3">
                <div className="flex gap-1 overflow-x-auto rounded-[12px] bg-white p-1 ring-1 ring-slate-200" role="tablist" aria-label="Lead sections">
                  {TABS.map(([key, text]) => (
                    <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                      className={`whitespace-nowrap rounded-[9px] px-3 py-1.5 text-[13px] font-semibold transition ${tab === key ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                      {text}{key === "documents" && documentRecords.length ? <span className="ml-1 opacity-70">{documentRecords.length}</span> : null}
                    </button>
                  ))}
                </div>

                {tab === "timeline" ? (
                  <>
                    {canEdit ? (
                      <div className="space-y-2">
                        <QuickNote lead={lead} token={session?.token} onSaved={followUpSaved} placeholder="Add a note for this lead" />
                        <form onSubmit={addUpdate} className="flex flex-wrap items-center gap-2 rounded-[12px] bg-white p-2 ring-1 ring-slate-200">
                          <select aria-label="Update type" value={updateType} onChange={(e) => setUpdateType(e.target.value)} className="h-8 rounded-[8px] border border-slate-200 bg-white px-1.5 text-[12.5px] font-semibold text-slate-700">
                            {UPDATE_TYPES.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
                          </select>
                          <input aria-label="Update" value={updateText} onChange={(e) => setUpdateText(e.target.value)} placeholder={isNewLead ? "Change the status from New to log updates" : "Log what happened, e.g. Spoke to the owner"} disabled={isNewLead}
                            className="h-8 min-w-[180px] flex-1 border-0 bg-transparent px-1.5 text-[13.5px] text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed" />
                          <button type="submit" disabled={savingUpdate || isNewLead || !updateText.trim()} className="h-8 rounded-[8px] bg-slate-900 px-3 text-[12.5px] font-semibold text-white hover:bg-slate-700 disabled:opacity-40">{savingUpdate ? "Saving…" : "Log update"}</button>
                        </form>
                      </div>
                    ) : null}
                    <section className={CARD}><LeadTimeline notes={notes} activity={activity} /></section>
                    {calls.length ? <LeadCallHistoryPanel calls={calls} panelClass={CARD} kickerClass={KICKER} /> : null}
                  </>
                ) : null}

                {tab === "tasks" ? (
                  <section className={CARD}>
                    <h2 className="mb-2 text-[15px] font-bold text-slate-900">Tasks & follow-ups</h2>
                    <LeadTasksPanel lead={lead} token={session?.token} people={taskPeople} selfId={selfId} canEdit={canEdit} />
                  </section>
                ) : null}

                {tab === "documents" ? (
                  <section className={CARD}>
                    <h2 className="mb-2 text-[15px] font-bold text-slate-900">Documents</h2>
                    <LeadDocumentsPanel canUpload={canUploadDocuments} documents={documentRecords} emptyMessage="No documents uploaded yet." ghostButtonClassName={GHOST}
                      helperText={canReviewWorkflowDocs ? "Upload PDF, image, DOC or DOCX files. Legal and finance files also appear here." : "Upload PDF, image, DOC or DOCX files for this lead."}
                      kickerClassName={KICKER} onUpload={uploadDocument} primaryButtonClassName={PRIMARY} renderWhen={when} resolveHref={hrefForDoc} uploading={uploadingDocuments} />
                  </section>
                ) : null}

                {tab === "workflow" ? (
                  <>
                    <section className={CARD}>
                      <h2 className="mb-3 text-[15px] font-bold text-slate-900">Workflow stage</h2>
                      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {WORKFLOW.map((step, index) => {
                          const state = index < stageIndex ? "done" : index === stageIndex ? "active" : "idle";
                          return (
                            <li key={step} className={`rounded-[10px] px-3 py-2.5 ring-1 ${state === "active" ? "bg-brand-50 ring-brand-200" : state === "done" ? "bg-emerald-50 ring-emerald-200" : "bg-slate-50 ring-slate-100"}`}>
                              <p className="text-[13.5px] font-bold text-slate-900">{nice(step)}</p>
                              <p className={`text-[12px] font-medium ${state === "active" ? "text-brand-800" : state === "done" ? "text-emerald-700" : "text-slate-400"}`}>{state === "active" ? "Current" : state === "done" ? "Done" : "Waiting"}</p>
                            </li>
                          );
                        })}
                      </ol>
                      {canReviewWorkflowDocs ? (
                        <dl className="mt-3 grid gap-x-6 sm:grid-cols-2">
                          <Row name="Legal owner">{formatWorkflowOwnerIdentity(lead.legal_owner_name, lead.assigned_to_legal)}</Row>
                          <Row name="Finance owner">{formatWorkflowOwnerIdentity(lead.finance_owner_name, lead.assigned_to_finance)}</Row>
                          <Row name="Legal documents">{(lead.legal_documents || []).length}</Row>
                          <Row name="Finance documents">{(lead.finance_documents || []).length}</Row>
                        </dl>
                      ) : null}
                      <LeadAssignmentFlow activity={activity} lead={lead} renderWhen={when} />
                    </section>

                    {canTransferToLegal ? (
                      <section className="rounded-[14px] bg-emerald-50 p-4 ring-1 ring-emerald-200">
                        <h2 className="text-[15px] font-bold text-slate-900">Transfer to legal</h2>
                        <p className="mb-3 text-[12.5px] text-slate-600">This lead is won. Send it to the legal team for the agreement.</p>
                        <form className="grid gap-3" onSubmit={transferToLegal}>
                          <label className="grid gap-1 text-[12px] font-semibold text-slate-600">Legal owner
                            <select className={LEAD_INPUT_CLASS} value={transferOwner} onChange={(e) => setTransferOwner(e.target.value)}>
                              <option value="">Assign later</option>
                              {legalUsers.map((user) => <option key={user.user_id} value={user.user_id}>{formatWorkflowOwnerIdentity(user.name, user.user_id, "Legal user")}</option>)}
                            </select>
                            {!scopedLegalUsers.length ? <span className="font-normal text-slate-500">{workflowUsersEmptyMessage(lead.team_name, "legal")}</span> : null}
                          </label>
                          <label className="grid gap-1 text-[12px] font-semibold text-slate-600">Transfer note
                            <textarea className={`${LEAD_INPUT_CLASS} min-h-[80px] resize-y`} value={transferNote} onChange={(e) => setTransferNote(e.target.value)} placeholder="Deal details the legal team should know" />
                          </label>
                          <div><button type="submit" className={PRIMARY} disabled={transferring}>{transferring ? "Transferring…" : "Transfer to legal"}</button></div>
                        </form>
                      </section>
                    ) : null}

                    <section className={CARD}>
                      <h2 className="mb-2 text-[15px] font-bold text-slate-900">Stage history</h2>
                      {(lead.stage_history || []).length ? (
                        <ul className="divide-y divide-slate-100">
                          {lead.stage_history.map((item, index) => (
                            <li key={`stage-${item.stage}-${index}`} className="flex justify-between gap-3 py-2 text-[13px]">
                              <span><b className="font-semibold text-slate-900">{nice(item.stage)}</b><span className="block text-[12px] text-slate-500">Entered {when(item.entered_at, true)}{item.exited_at ? ` · Exited ${when(item.exited_at, true)}` : ""}</span></span>
                              {item.duration ? <span className="shrink-0 text-[12px] font-semibold text-brand-800">{item.duration}m</span> : null}
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-[13px] text-slate-500">No stage history yet.</p>}
                      <h2 className="mb-2 mt-4 text-[15px] font-bold text-slate-900">Transfer log</h2>
                      {(lead.transfer_history || []).length ? (
                        <ul className="divide-y divide-slate-100">
                          {lead.transfer_history.map((item, index) => (
                            <li key={`transfer-${item.to_stage}-${index}`} className="py-2 text-[13px]">
                              <b className="font-semibold text-slate-900">{nice(item.from_stage)} → {nice(item.to_stage)}</b>
                              <span className="block text-[12px] text-slate-500">{item.transferred_by_name || "User"} · {when(item.transferred_at, true)}{item.transferred_to_name ? ` · To ${item.transferred_to_name}` : ""}</span>
                              {item.notes ? <p className="mt-0.5 text-[12.5px] text-slate-600">{item.notes}</p> : null}
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-[13px] text-slate-500">No transfers yet.</p>}
                    </section>
                  </>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}
