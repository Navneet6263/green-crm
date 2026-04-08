"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../dashboard/DashboardShell";
import { API_BASE, apiRequest } from "../../lib/api";
import { ROLE_HOME_ROUTE } from "../../lib/roles";
import { loadSession } from "../../lib/session";

const CONFIG = {
  legal: {
    title: "Legal Queue",
    eyebrow: "Legal Review",
    role: "legal-team",
    nextRole: "finance-team",
    queueTitle: "Assigned legal leads",
    docTitle: "Legal documents",
    uploadPath: "legal/upload",
    deletePath: "legal/delete",
    submitPath: "transfer-to-finance",
    submitLabel: "Transfer to Finance",
    empty: "No leads in legal queue.",
    docType: "agreement",
  },
  finance: {
    title: "Finance Queue",
    eyebrow: "Finance Completion",
    role: "finance-team",
    nextRole: null,
    queueTitle: "Assigned finance leads",
    docTitle: "Finance documents",
    uploadPath: "finance/upload",
    deletePath: "finance/delete",
    submitPath: "complete",
    submitLabel: "Complete Workflow",
    empty: "No leads in finance queue.",
    docType: "invoice",
  },
};

const nice = (value) => String(value || "").split("-").filter(Boolean).map((item) => item[0].toUpperCase() + item.slice(1)).join(" ");
const money = (value) => `INR ${Number(value || 0).toLocaleString("en-IN")}`;
const when = (value, full = false) => !value ? "--" : new Date(value).toLocaleString("en-IN", full ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short", year: "numeric" });
const docHref = (fileUrl) => !fileUrl ? "#" : /^https?:\/\//i.test(fileUrl) ? fileUrl : `${API_BASE}${fileUrl}`;

export default function WorkflowWorkspace({ mode }) {
  const config = CONFIG[mode];
  const router = useRouter();
  const [session, setSession] = useState(null), [queue, setQueue] = useState([]), [selectedId, setSelectedId] = useState(""), [selectedLead, setSelectedLead] = useState(null), [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true), [detailLoading, setDetailLoading] = useState(false), [savingDoc, setSavingDoc] = useState(false), [savingAction, setSavingAction] = useState(false), [deletingDocId, setDeletingDocId] = useState("");
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [docForm, setDocForm] = useState({ file_name: "", file_url: "", file_size: "", document_type: config.docType });
  const [actionForm, setActionForm] = useState({ assigned_to: "", notes: "", invoice_number: "", invoice_amount: "", tax_invoice_number: "" });
  const role = session?.user?.role || "";
  const isOperator = role === config.role;
  const docs = mode === "legal" ? selectedLead?.legal_documents || [] : selectedLead?.finance_documents || [];

  async function loadQueue(activeSession) {
    const path = activeSession.user?.role === config.role ? `/workflow/my-assigned?page_size=50` : `/workflow/tracker?stage=${mode}&page_size=50`;
    const response = await apiRequest(path, { token: activeSession.token });
    const nextQueue = response.items || [];
    setQueue(nextQueue);
    setSelectedId((current) => nextQueue.some((lead) => lead.lead_id === current) ? current : nextQueue[0]?.lead_id || "");
  }

  async function loadDetail(activeSession, leadId) {
    if (!leadId) {
      setSelectedLead(null);
      return;
    }
    setDetailLoading(true);
    try {
      const response = await apiRequest(`/leads/${leadId}`, { token: activeSession.token });
      setSelectedLead(response);
      setActionForm((current) => ({
        ...current,
        assigned_to: current.assigned_to || response.assigned_to_finance || "",
        invoice_number: response.invoice_number || current.invoice_number,
        invoice_amount: response.invoice_amount || current.invoice_amount,
        tax_invoice_number: response.tax_invoice_number || current.tax_invoice_number,
      }));
    } finally {
      setDetailLoading(false);
    }
  }

  async function refresh(activeSession) {
    await loadQueue(activeSession);
    if (selectedId) await loadDetail(activeSession, selectedId);
  }

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) return router.replace("/login");
    if (!["super-admin", "admin", "manager", config.role].includes(activeSession.user?.role)) return router.replace(ROLE_HOME_ROUTE[activeSession.user?.role] || "/dashboard");
    setSession(activeSession);
    Promise.all([loadQueue(activeSession), config.nextRole ? apiRequest(`/workflow/users/${config.nextRole}`, { token: activeSession.token }) : Promise.resolve([])])
      .then(([, usersResponse]) => setTeamMembers(Array.isArray(usersResponse) ? usersResponse : []))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [config.role, config.nextRole, router]);

  useEffect(() => {
    if (!session || !selectedId) return;
    loadDetail(session, selectedId).catch((requestError) => setError(requestError.message));
  }, [selectedId, session]);

  const heroStats = useMemo(() => [
    { label: "Queue", value: queue.length },
    { label: "Documents", value: queue.reduce((sum, lead) => sum + Number(lead.doc_count || 0), 0), color: "#0f8c53" },
    { label: mode === "legal" ? "Pending Review" : "Pending Invoice", value: mode === "legal" ? queue.filter((lead) => lead.agreement_status === "pending").length : queue.filter((lead) => !lead.invoice_number).length, color: "#b96a00" },
    { label: "Value", value: money(queue.reduce((sum, lead) => sum + Number(lead.invoice_amount || lead.estimated_value || 0), 0)), color: "#0f8c53" },
  ], [mode, queue]);

  async function uploadDocument(event) {
    event.preventDefault();
    if (!selectedLead || !docForm.file_name.trim() || !docForm.file_url.trim()) return setError("Document name and document link are required.");
    setSavingDoc(true); setError(""); setNotice("");
    try {
      await apiRequest(`/workflow/${selectedLead.lead_id}/${config.uploadPath}`, { method: "POST", token: session.token, body: { ...docForm, file_size: docForm.file_size ? Number(docForm.file_size) : null } });
      setDocForm({ file_name: "", file_url: "", file_size: "", document_type: config.docType });
      setNotice("Document uploaded successfully.");
      await refresh(session);
    } catch (requestError) { setError(requestError.message); } finally { setSavingDoc(false); }
  }

  async function removeDocument(docId) {
    if (!selectedLead || !window.confirm("Delete this document?")) return;
    setDeletingDocId(docId); setError(""); setNotice("");
    try {
      await apiRequest(`/workflow/${selectedLead.lead_id}/${config.deletePath}/${docId}`, { method: "DELETE", token: session.token });
      setNotice("Document deleted.");
      await refresh(session);
    } catch (requestError) { setError(requestError.message); } finally { setDeletingDocId(""); }
  }

  async function submitAction(event) {
    event.preventDefault();
    if (!selectedLead) return;
    if (mode === "legal" && !actionForm.assigned_to) return setError("Choose a finance owner before transferring this lead.");
    setSavingAction(true); setError(""); setNotice("");
    try {
      const body = mode === "legal" ? { assigned_to: actionForm.assigned_to, notes: actionForm.notes.trim(), agreement_status: "approved" } : { notes: actionForm.notes.trim(), invoice_number: actionForm.invoice_number || null, invoice_amount: actionForm.invoice_amount || null, tax_invoice_number: actionForm.tax_invoice_number || null, status: "closed-won" };
      await apiRequest(`/workflow/${selectedLead.lead_id}/${config.submitPath}`, { method: "POST", token: session.token, body });
      setNotice(mode === "legal" ? "Lead transferred to finance." : "Workflow completed successfully.");
      setActionForm({ assigned_to: "", notes: "", invoice_number: "", invoice_amount: "", tax_invoice_number: "" });
      await refresh(session);
    } catch (requestError) { setError(requestError.message); } finally { setSavingAction(false); }
  }

  return (
    <DashboardShell session={session} title={config.title} eyebrow={config.eyebrow} heroStats={heroStats}>
      {error ? <div className="alert error">{error}</div> : null}
      {!error && notice ? <div className="alert">{notice}</div> : null}
      {loading ? <div className="alert">Loading workflow queue...</div> : null}
      {!loading ? (
        <section className="workflow-shell">
          <article className="workflow-card workflow-list-card">
            <div className="panel-header"><div><span className="lead-kicker">Queue</span><h2>{config.queueTitle}</h2></div><span className="pill">{queue.length} leads</span></div>
            <div className="workflow-list">
              {queue.length ? queue.map((lead) => <button className={`workflow-row ${selectedId === lead.lead_id ? "active" : ""}`} key={lead.lead_id} type="button" onClick={() => setSelectedId(lead.lead_id)}><div><strong>{lead.company_name}</strong><span>{lead.contact_person} | {lead.assigned_to_name || lead.legal_owner_name || lead.finance_owner_name || "Unassigned"}</span></div><div className="workflow-row-meta"><strong>{nice(lead.workflow_stage || mode)}</strong><span>{lead.doc_count || 0} docs</span></div></button>) : <div className="lead-empty compact"><h3>No queue items</h3><p>{config.empty}</p></div>}
            </div>
          </article>

          <div className="workflow-detail-stack">
            {selectedLead ? (
              <>
                <article className="workflow-card workflow-detail-card">
                  <div className="panel-header"><div><span className="lead-kicker">Selected Lead</span><h2>{selectedLead.company_name}</h2></div>{detailLoading ? <span className="pill">Refreshing...</span> : null}</div>
                  <div className="workflow-summary-grid">
                    <div><span>Contact</span><strong>{selectedLead.contact_person || "--"}</strong></div>
                    <div><span>Status</span><strong>{nice(selectedLead.status)}</strong></div>
                    <div><span>Workflow</span><strong>{nice(selectedLead.workflow_stage || mode)}</strong></div>
                    <div><span>Value</span><strong>{money(selectedLead.estimated_value)}</strong></div>
                    <div><span>Email</span><strong>{selectedLead.email || "--"}</strong></div>
                    <div><span>Phone</span><strong>{selectedLead.phone || "--"}</strong></div>
                  </div>
                  <div className="workflow-action-links"><Link href={`/leads/${selectedLead.lead_id}`} className="button primary">Open Lead</Link>{selectedLead.latest_note ? <span className="lead-chip neutral">Latest note ready</span> : null}</div>
                </article>

                <article className="workflow-card">
                  <div className="panel-header"><div><span className="lead-kicker">Documents</span><h2>{config.docTitle}</h2></div><span className="pill">{docs.length} files</span></div>
                  {isOperator ? (
                    <form className="form-grid" onSubmit={uploadDocument}>
                      <div className="lead-task-grid"><label className="field"><span>Document Name</span><input value={docForm.file_name} onChange={(event) => setDocForm((current) => ({ ...current, file_name: event.target.value }))} placeholder={mode === "legal" ? "Agreement draft" : "Invoice copy"} /></label><label className="field"><span>Document Type</span><input value={docForm.document_type} onChange={(event) => setDocForm((current) => ({ ...current, document_type: event.target.value }))} /></label></div>
                      <label className="field"><span>Document Link</span><input value={docForm.file_url} onChange={(event) => setDocForm((current) => ({ ...current, file_url: event.target.value }))} placeholder="https://drive.google.com/..." /></label>
                      <label className="field"><span>File Size KB</span><input type="number" value={docForm.file_size} onChange={(event) => setDocForm((current) => ({ ...current, file_size: event.target.value }))} placeholder="Optional" /></label>
                      <button className="button primary" type="submit" disabled={savingDoc}>{savingDoc ? "Uploading..." : "Save Document"}</button>
                    </form>
                  ) : <p className="muted">Admin and manager can review the file list here. Upload and delete stay with the assigned workflow team.</p>}
                  <div className="workflow-doc-list">{docs.length ? docs.map((doc) => <div className="workflow-doc-row" key={doc.id || doc.file_name}><div><strong>{doc.file_name || "Document"}</strong><span>{doc.uploaded_by_name || "Team"} | {when(doc.uploaded_at, true)}</span></div><div className="workflow-doc-actions"><a className="button ghost" href={docHref(doc.file_url)} target="_blank" rel="noreferrer">Open</a>{isOperator ? <button className="button ghost" type="button" disabled={deletingDocId === String(doc.id)} onClick={() => removeDocument(doc.id)}>{deletingDocId === String(doc.id) ? "Deleting..." : "Delete"}</button> : null}</div></div>) : <p className="muted">No documents uploaded yet.</p>}</div>
                </article>

                <article className="workflow-card">
                  <div className="panel-header"><div><span className="lead-kicker">Action</span><h2>{config.submitLabel}</h2></div></div>
                  {isOperator ? (
                    <form className="form-grid" onSubmit={submitAction}>
                      {mode === "legal" ? <label className="field"><span>Finance Owner</span><select value={actionForm.assigned_to} onChange={(event) => setActionForm((current) => ({ ...current, assigned_to: event.target.value }))}><option value="">Choose finance owner</option>{teamMembers.map((user) => <option key={user.user_id} value={user.user_id}>{user.name} | {user.email}</option>)}</select></label> : <div className="lead-task-grid"><label className="field"><span>Invoice Number</span><input value={actionForm.invoice_number} onChange={(event) => setActionForm((current) => ({ ...current, invoice_number: event.target.value }))} /></label><label className="field"><span>Invoice Amount</span><input value={actionForm.invoice_amount} onChange={(event) => setActionForm((current) => ({ ...current, invoice_amount: event.target.value }))} /></label></div>}
                      {mode === "finance" ? <label className="field"><span>Tax Invoice Number</span><input value={actionForm.tax_invoice_number} onChange={(event) => setActionForm((current) => ({ ...current, tax_invoice_number: event.target.value }))} /></label> : null}
                      <label className="field"><span>Notes</span><textarea rows="3" value={actionForm.notes} onChange={(event) => setActionForm((current) => ({ ...current, notes: event.target.value }))} placeholder={mode === "legal" ? "What is approved and what should finance know?" : "Completion note for this lead"} /></label>
                      <button className="button primary" type="submit" disabled={savingAction}>{savingAction ? "Saving..." : config.submitLabel}</button>
                    </form>
                  ) : <p className="muted">This queue is view-only from your role. Open the lead detail to monitor document movement and latest notes.</p>}
                </article>
              </>
            ) : <article className="workflow-card lead-empty compact"><h3>No lead selected</h3><p>Select a lead from the queue to open its workflow detail.</p></article>}
          </div>
        </section>
      ) : null}
    </DashboardShell>
  );
}
