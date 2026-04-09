"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import { API_BASE, apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";

const STATUS_ACCENT = { new: ["rgba(79,140,255,.12)", "#2f6fdd"], contacted: ["rgba(56,189,248,.14)", "#0077b8"], qualified: ["rgba(167,139,250,.14)", "#6d46d6"], proposal: ["rgba(245,164,45,.14)", "#b96a00"], negotiation: ["rgba(251,146,60,.14)", "#c96200"], "closed-won": ["rgba(31,199,120,.16)", "#0f8c53"], "closed-lost": ["rgba(224,82,82,.14)", "#b63b3b"] };
const PRIORITY_ACCENT = { low: ["rgba(56,189,248,.12)", "#0077b8"], medium: ["rgba(245,164,45,.14)", "#b96a00"], high: ["rgba(255,108,156,.14)", "#c4356b"], urgent: ["rgba(224,82,82,.14)", "#b63b3b"] };
const WORKFLOW = ["sales", "legal", "finance", "completed"];
const DOC_VIEW_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager"];
const LEGAL_TRANSFER_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager", "sales"];
const ACTIVITY_OPTIONS = ["call", "email", "meeting", "note", "task", "comment"];
const nice = (v) => String(v || "").split("-").filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1)).join(" ");
const money = (v) => `INR ${Number(v || 0).toLocaleString("en-IN")}`;
const when = (v, full = false) => !v ? "--" : new Date(v).toLocaleString("en-IN", full ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short", year: "numeric" });
const hrefForDoc = (fileUrl) => !fileUrl ? "#" : /^https?:\/\//i.test(fileUrl) ? fileUrl : `${API_BASE}${fileUrl}`;

function DocGroup({ title, items }) {
  if (!items?.length) return null;
  return (
    <div className="lead-document-group">
      <div className="lead-document-group-head"><strong>{title}</strong><span>{items.length} file{items.length === 1 ? "" : "s"}</span></div>
      <div className="lead-document-stack">
        {items.map((doc, index) => (
          <div className="lead-document-row" key={`${title}-${doc.id || doc.file_name || index}`}>
            <div>
              <strong>{doc.file_name || "Document"}</strong>
              <span>{doc.uploaded_by_name || "Team"} | {when(doc.uploaded_at, true)}{doc.file_size ? ` | ${Number(doc.file_size / 1024).toFixed(1)} KB` : ""}</span>
            </div>
            <a className="button ghost" href={hrefForDoc(doc.file_url)} target="_blank" rel="noreferrer">Download</a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState(null), [lead, setLead] = useState(null), [notes, setNotes] = useState([]), [activity, setActivity] = useState([]), [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true), [savingNote, setSavingNote] = useState(false), [savingActivity, setSavingActivity] = useState(false), [savingTask, setSavingTask] = useState(false), [transferring, setTransferring] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [noteText, setNoteText] = useState(""), [activityType, setActivityType] = useState("call"), [activityText, setActivityText] = useState(""), [transferOwner, setTransferOwner] = useState(""), [transferNote, setTransferNote] = useState("");
  const [task, setTask] = useState({ title: "", type: "call", priority: "medium", due_date: "", due_time: "", assigned_to: "", notes: "" });
  const role = session?.user?.role || "";
  const canSeeDocs = DOC_VIEW_ROLES.includes(role);
  const canTransferToLegal = Boolean(lead?.can_transfer_to_legal) && LEGAL_TRANSFER_ROLES.includes(role);
  const legalUsers = useMemo(() => users.filter((user) => user.role === "legal-team"), [users]);

  async function loadLead(activeSession) {
    const [leadResponse, notesResponse, activityResponse] = await Promise.all([
      apiRequest(`/leads/${params.id}`, { token: activeSession.token }),
      apiRequest(`/leads/${params.id}/notes?page_size=12`, { token: activeSession.token }),
      apiRequest(`/leads/${params.id}/activity?page_size=12`, { token: activeSession.token }),
    ]);
    const usersResponse = await apiRequest(
      ["super-admin", "platform-admin", "platform-manager"].includes(activeSession.user?.role)
        ? `/auth/users?page_size=100&company_id=${leadResponse.company_id}`
        : "/auth/users?page_size=100",
      { token: activeSession.token }
    );
    setLead(leadResponse);
    setNotes(notesResponse.items || []);
    setActivity(activityResponse.items || []);
    setUsers((usersResponse.items || []).filter((user) => user.is_active));
    setTransferOwner(leadResponse.assigned_to_legal || "");
    setTask((current) => ({ ...current, assigned_to: current.assigned_to || activeSession.user?.user_id || "" }));
  }

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) return router.replace("/login");
    setSession(activeSession);
    loadLead(activeSession).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
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

  async function addNote(event) {
    event.preventDefault();
    if (!noteText.trim()) return;
    setSavingNote(true); setError(""); setNotice("");
    try { await apiRequest(`/leads/${params.id}/notes`, { method: "POST", token: session.token, body: { content: noteText.trim() } }); setNoteText(""); setNotice("Note added successfully."); await refreshLead(); }
    catch (requestError) { setError(requestError.message); }
    finally { setSavingNote(false); }
  }

  async function addActivity(event) {
    event.preventDefault();
    if (!activityText.trim()) return;
    setSavingActivity(true); setError(""); setNotice("");
    try { await apiRequest(`/leads/${params.id}/activity`, { method: "POST", token: session.token, body: { type: activityType, description: activityText.trim() } }); setActivityText(""); setNotice("Timeline updated."); await refreshLead(); }
    catch (requestError) { setError(requestError.message); }
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
      await apiRequest("/tasks", { method: "POST", token: session.token, body: { title: task.title.trim(), type: task.type, priority: task.priority, due_date: due, assigned_to: task.assigned_to || session.user?.user_id, related_to: "lead", related_id: lead.lead_id, notes: task.notes || null } });
      await apiRequest(`/leads/${params.id}/activity`, { method: "POST", token: session.token, body: { type: "task", description: `Task scheduled: ${task.title.trim()} on ${when(due, true)}` } });
      setTask({ title: "", type: "call", priority: "medium", due_date: "", due_time: "", assigned_to: session.user?.user_id || "", notes: "" });
      setNotice("Task scheduled successfully.");
      await refreshLead();
    } catch (requestError) { setError(requestError.message); }
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
    } catch (requestError) { setError(requestError.message); }
    finally { setTransferring(false); }
  }

  return (
    <DashboardShell session={session} title={lead ? lead.company_name : "Lead Detail"} eyebrow="Lead Profile" heroStats={[{ label: "Lead Score", value: intelligence.score }, { label: "Temperature", value: intelligence.temperature, color: intelligence.temperature === "Hot" ? "#b63b3b" : intelligence.temperature === "Warm" ? "#b96a00" : "#2f6fdd" }, { label: "Win Chance", value: `${intelligence.probability}%`, color: "#0f8c53" }, { label: "Notes", value: notes.length, color: "#0f8c53" }]}>
      {error ? <div className="alert error">{error}</div> : null}
      {!error && notice ? <div className="alert">{notice}</div> : null}
      {loading ? <div className="alert">Loading lead details...</div> : null}
      {!loading && lead ? (
        <section className="lead-profile-shell">
          <article className="lead-profile-hero lead-profile-hero-expanded">
            <button className="button ghost" type="button" onClick={() => router.back()}>Back</button>
            <div className="lead-profile-copy">
              <span className="lead-kicker">Lead Detail</span>
              <h2>{lead.contact_person}</h2>
              <p>{lead.company_name} | {lead.email || "No email"} | {lead.phone || "No phone"}</p>
              <div className="lead-profile-tags">
                <span className="lead-chip" style={{ background: (STATUS_ACCENT[lead.status] || STATUS_ACCENT.new)[0], color: (STATUS_ACCENT[lead.status] || STATUS_ACCENT.new)[1] }}>{nice(lead.status)}</span>
                <span className="lead-chip" style={{ background: (PRIORITY_ACCENT[lead.priority] || PRIORITY_ACCENT.medium)[0], color: (PRIORITY_ACCENT[lead.priority] || PRIORITY_ACCENT.medium)[1] }}>{nice(lead.priority || "medium")}</span>
                {lead.product_name ? <span className="lead-chip neutral">{lead.product_name}</span> : null}
                <span className="lead-chip neutral">Workflow {nice(lead.workflow_stage || "sales")}</span>
                <span className="lead-chip neutral">Notes {notes.length}</span>
              </div>
            </div>
            <div className="lead-profile-actions">
              <button className="button primary" type="button" onClick={() => logQuick("call", `Called ${lead.contact_person}`, `tel:${String(lead.phone || "").replace(/[^\d+]/g, "")}`)} disabled={!lead.phone}>Call</button>
              <Link href={`/communications?entity=lead&id=${lead.lead_id}`} className="button ghost">Email Workspace</Link>
              <Link href={`/leads/${lead.lead_id}/edit`} className="button ghost">Edit Lead</Link>
            </div>
          </article>

          <div className="lead-profile-grid">
            <div className="lead-profile-main">
              <article className="lead-profile-card">
                <div className="panel-header"><div><span className="lead-kicker">Snapshot</span><h2>Lead Information</h2></div></div>
                <div className="lead-profile-info-grid">
                  <div><span>Contact</span><strong>{lead.contact_person}</strong></div><div><span>Company</span><strong>{lead.company_name}</strong></div><div><span>Phone</span><strong>{lead.phone || "--"}</strong></div><div><span>Email</span><strong>{lead.email || "--"}</strong></div><div><span>Owner</span><strong>{lead.assigned_to_name || "Unassigned"}</strong></div><div><span>Created By</span><strong>{lead.created_by_name || "Unknown"}</strong></div><div><span>Source</span><strong>{nice(lead.lead_source || "website")}</strong></div><div><span>Follow-up</span><strong>{when(lead.follow_up_date, true)}</strong></div><div><span>Value</span><strong>{money(lead.estimated_value)}</strong></div><div><span>Created</span><strong>{when(lead.created_at, true)}</strong></div><div><span>Workflow</span><strong>{nice(lead.workflow_stage || "sales")}</strong></div><div><span>Latest Note</span><strong>{lead.latest_note || "No note yet"}</strong></div>
                </div>
                {lead.requirements ? <p className="lead-detail-copy" style={{ marginTop: "1rem" }}>{lead.requirements}</p> : null}
              </article>

              <article className="lead-profile-card">
                <div className="panel-header"><div><span className="lead-kicker">Workflow</span><h2>Progress & transfer path</h2></div></div>
                <div className="lead-workflow-track">{WORKFLOW.map((step, index) => { const current = WORKFLOW.indexOf(lead.workflow_stage || "sales"); const state = index < current ? "done" : index === current ? "active" : "idle"; return <div className={`lead-workflow-step ${state}`} key={step}><span>{index + 1}</span><strong>{nice(step)}</strong></div>; })}</div>
                {canSeeDocs ? <div className="lead-workflow-meta-grid"><div><span>Legal Owner</span><strong>{lead.legal_owner_name || "Not assigned"}</strong></div><div><span>Finance Owner</span><strong>{lead.finance_owner_name || "Not assigned"}</strong></div><div><span>Legal Docs</span><strong>{(lead.legal_documents || []).length}</strong></div><div><span>Finance Docs</span><strong>{(lead.finance_documents || []).length}</strong></div></div> : <p className="lead-detail-copy">Workflow remains visible here, while uploaded document review stays limited to admin and manager screens.</p>}
              </article>

              <article className="lead-profile-card">
                <div className="panel-header"><div><span className="lead-kicker">Activity</span><h2>Activity Timeline</h2></div></div>
                <form className="lead-inline-form" onSubmit={addActivity}>
                  <select value={activityType} onChange={(event) => setActivityType(event.target.value)}>{ACTIVITY_OPTIONS.map((option) => <option key={option} value={option}>{nice(option)}</option>)}</select>
                  <input value={activityText} onChange={(event) => setActivityText(event.target.value)} placeholder="Add a timeline entry" />
                  <button className="button primary" type="submit" disabled={savingActivity}>{savingActivity ? "Saving..." : "Add"}</button>
                </form>
                <div className="lead-timeline">{activity.length ? activity.map((item) => <div className="lead-timeline-item" key={item.activity_id}><span className="lead-timeline-dot" /><div><strong>{nice(item.type || "activity")}</strong><p>{item.description || "No description provided."}</p><small>{item.created_by_name || "User"} | {when(item.created_at, true)}</small></div></div>) : <p className="muted">No activity recorded yet.</p>}</div>
              </article>

              {canSeeDocs ? (
                <>
                  <article className="lead-profile-card">
                    <div className="panel-header"><div><span className="lead-kicker">Workflow Vault</span><h2>Uploaded documents</h2></div></div>
                    {(lead.legal_documents || []).length || (lead.finance_documents || []).length ? <div className="lead-document-layout"><DocGroup title="Legal Documents" items={lead.legal_documents || []} /><DocGroup title="Finance Documents" items={lead.finance_documents || []} /></div> : <p className="muted">No workflow documents have been uploaded yet.</p>}
                  </article>
                  <article className="lead-profile-card">
                    <div className="panel-header"><div><span className="lead-kicker">Workflow History</span><h2>Stage movement</h2></div></div>
                    <div className="lead-history-grid">
                      <div className="lead-history-block">
                        <strong>Stage history</strong>
                        <div className="lead-history-stack">{(lead.stage_history || []).length ? lead.stage_history.map((item, index) => <div className="lead-history-row" key={`stage-${item.stage}-${index}`}><div><strong>{nice(item.stage)}</strong><span>Entered {when(item.entered_at, true)}{item.exited_at ? ` | Exited ${when(item.exited_at, true)}` : " | Current stage"}</span></div><b>{item.duration ? `${item.duration} min` : "--"}</b></div>) : <p className="muted">No stage history logged yet.</p>}</div>
                      </div>
                      <div className="lead-history-block">
                        <strong>Transfer log</strong>
                        <div className="lead-history-stack">{(lead.transfer_history || []).length ? lead.transfer_history.map((item, index) => <div className="lead-history-row" key={`transfer-${item.to_stage}-${index}`}><div><strong>{nice(item.from_stage)} to {nice(item.to_stage)}</strong><span>{item.transferred_by_name || "User"} | {when(item.transferred_at, true)}{item.transferred_to_name ? ` | Assigned to ${item.transferred_to_name}` : ""}</span>{item.notes ? <small>{item.notes}</small> : null}</div></div>) : <p className="muted">No transfer history recorded yet.</p>}</div>
                      </div>
                    </div>
                  </article>
                </>
              ) : null}
            </div>

            <div className="lead-profile-side">
              {canTransferToLegal ? <article className="lead-profile-card"><div className="panel-header"><div><span className="lead-kicker">Closed Won</span><h2>Transfer to legal</h2></div></div><form className="form-grid" onSubmit={transferToLegal}><label className="field"><span>Legal Owner</span><select value={transferOwner} onChange={(event) => setTransferOwner(event.target.value)}><option value="">Assign later</option>{legalUsers.map((user) => <option key={user.user_id} value={user.user_id}>{user.name} | {user.email}</option>)}</select></label><label className="field"><span>Transfer Note *</span><textarea rows="4" value={transferNote} onChange={(event) => setTransferNote(event.target.value)} placeholder="What is ready for legal and what should be checked next?" /></label><button className="button primary" type="submit" disabled={transferring || !transferNote.trim()}>{transferring ? "Transferring..." : "Transfer to Legal"}</button></form></article> : null}

              <article className="lead-profile-card">
                <div className="panel-header"><div><span className="lead-kicker">Notes</span><h2>Lead notes</h2></div></div>
                <form className="form-grid" onSubmit={addNote}><label className="field"><span>Add Note</span><textarea rows="4" value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="Capture context, objections, or next steps" /></label><button className="button primary" type="submit" disabled={savingNote}>{savingNote ? "Saving..." : "Save Note"}</button></form>
                <div className="lead-note-stack">{notes.length ? notes.map((note) => <div className="lead-note-card" key={note.id || `${note.created_at}-${note.content}`}><strong>{note.created_by_name || "User"}</strong><p>{note.content}</p><small>{when(note.created_at, true)}</small></div>) : <p className="muted">No notes yet.</p>}</div>
              </article>

              <article className="lead-profile-card">
                <div className="panel-header"><div><span className="lead-kicker">Task Desk</span><h2>Schedule task</h2></div></div>
                <form className="form-grid" onSubmit={createTask}>
                  <label className="field"><span>Title</span><input value={task.title} onChange={(event) => setTask((current) => ({ ...current, title: event.target.value }))} placeholder="Follow-up call, proposal review, demo" /></label>
                  <div className="lead-task-grid"><label className="field"><span>Type</span><select value={task.type} onChange={(event) => setTask((current) => ({ ...current, type: event.target.value }))}><option value="call">call</option><option value="email">email</option><option value="meeting">meeting</option><option value="follow-up">follow-up</option></select></label><label className="field"><span>Priority</span><select value={task.priority} onChange={(event) => setTask((current) => ({ ...current, priority: event.target.value }))}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="urgent">urgent</option></select></label></div>
                  <div className="lead-task-grid"><label className="field"><span>Date</span><input type="date" value={task.due_date} onChange={(event) => setTask((current) => ({ ...current, due_date: event.target.value }))} /></label><label className="field"><span>Time</span><input type="time" value={task.due_time} onChange={(event) => setTask((current) => ({ ...current, due_time: event.target.value }))} /></label></div>
                  <label className="field"><span>Assignee</span><select value={task.assigned_to} onChange={(event) => setTask((current) => ({ ...current, assigned_to: event.target.value }))}><option value="">Select assignee</option>{users.map((user) => <option key={user.user_id} value={user.user_id}>{user.name} | {user.role}</option>)}</select></label>
                  <label className="field"><span>Task Notes</span><textarea rows="3" value={task.notes} onChange={(event) => setTask((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional preparation notes" /></label>
                  <button className="button primary" type="submit" disabled={savingTask}>{savingTask ? "Scheduling..." : "Schedule Task"}</button>
                </form>
              </article>
            </div>
          </div>
        </section>
      ) : null}
    </DashboardShell>
  );
}
