"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../dashboard/DashboardShell";
import DashboardIcon from "../dashboard/icons";
import { API_BASE, apiRequest } from "../../lib/api";
import { formatIndiaDateTime } from "../../lib/dateTime";
import { ROLE_HOME_ROUTE } from "../../lib/roles";
import { loadSession } from "../../lib/session";
import {
  formatWorkflowOwnerIdentity,
  withAssignedWorkflowUser,
  workflowUsersEmptyMessage,
} from "../../lib/workflowOwners";

const CONFIG = {
  legal: {
    title: "Legal Queue",
    eyebrow: "Legal Review",
    role: "legal-team",
    nextRole: "finance-team",
    queueTitle: "Assigned legal leads",
    queueHelper: "Review legal documents, validate approvals, and route ready leads into finance with a clear owner.",
    docTitle: "Legal documents",
    uploadPath: "legal/upload",
    deletePath: "legal/delete",
    submitPath: "transfer-to-finance",
    submitLabel: "Transfer to Finance",
    actionTitle: "Approve and hand off",
    actionCopy: "Choose the finance owner and add one note so the next team receives the right context.",
    empty: "No leads in legal queue.",
    docType: "agreement",
    linkPlaceholder: "https://drive.google.com/...",
    fileLabel: "agreement",
    nextStep: "Approved leads move to finance once the owner is chosen and the legal note is saved.",
  },
  finance: {
    title: "Finance Queue",
    eyebrow: "Finance Completion",
    role: "finance-team",
    nextRole: null,
    queueTitle: "Assigned finance leads",
    queueHelper: "Add invoice documents, complete billing fields, and close the workflow without losing customer context.",
    docTitle: "Finance documents",
    uploadPath: "finance/upload",
    deletePath: "finance/delete",
    submitPath: "complete",
    submitLabel: "Complete Workflow",
    actionTitle: "Close the commercial flow",
    actionCopy: "Capture invoice details, leave a completion note, and finish the workflow from this desk.",
    empty: "No leads in finance queue.",
    docType: "invoice",
    linkPlaceholder: "https://drive.google.com/...",
    fileLabel: "invoice",
    nextStep: "Completed leads close as commercial wins once invoice information and notes are saved.",
  },
};

const HERO = "rounded-[36px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(250,241,221,0.98)_44%,_rgba(245,231,193,0.98)_100%)] p-6 shadow-[0_24px_70px_rgba(79,58,22,0.08)] md:p-8";
const PANEL = "rounded-[30px] border border-[#eadfcd] bg-white/84 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const SOFT = "rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4";
const KICKER = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";
const INPUT = "w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none transition placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const PRIMARY = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2.5 text-sm font-semibold text-[#060710] shadow-[0_16px_30px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f] disabled:cursor-not-allowed disabled:opacity-60";
const GHOST = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710] disabled:cursor-not-allowed disabled:opacity-60";
const DANGER = "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-[14px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60";

const STATUS_TONE = {
  new: "bg-sky-100 text-sky-700 ring-sky-200",
  contacted: "bg-cyan-100 text-cyan-700 ring-cyan-200",
  qualified: "bg-violet-100 text-violet-700 ring-violet-200",
  proposal: "bg-amber-100 text-amber-700 ring-amber-200",
  negotiation: "bg-orange-100 text-orange-700 ring-orange-200",
  "booked-demo": "bg-violet-100 text-violet-700 ring-violet-200",
  "demo-done": "bg-emerald-100 text-emerald-700 ring-emerald-200",
  "trial-started": "bg-blue-100 text-blue-700 ring-blue-200",
  "closed-won": "bg-emerald-100 text-emerald-700 ring-emerald-200",
  won: "bg-emerald-100 text-emerald-700 ring-emerald-200",
};

const WORKFLOW_TONE = {
  sales: "bg-[#fff6e4] text-[#8d6e27] ring-[#eadfcd]",
  legal: "bg-amber-100 text-amber-700 ring-amber-200",
  finance: "bg-orange-100 text-orange-700 ring-orange-200",
  completed: "bg-emerald-100 text-emerald-700 ring-emerald-200",
};

const PRIORITY_TONE = {
  low: "bg-sky-100 text-sky-700 ring-sky-200",
  medium: "bg-amber-100 text-amber-700 ring-amber-200",
  high: "bg-rose-100 text-rose-700 ring-rose-200",
  urgent: "bg-[#10111d] text-white ring-[#10111d]",
};

const nice = (value) => String(value || "").split("-").filter(Boolean).map((item) => item[0].toUpperCase() + item.slice(1)).join(" ");
const money = (value) => `INR ${Number(value || 0).toLocaleString("en-IN")}`;
const when = (value, full = false) => formatIndiaDateTime(value, full);
const docHref = (fileUrl) => !fileUrl ? "#" : /^https?:\/\//i.test(fileUrl) ? fileUrl : `${API_BASE}${fileUrl}`;
const compact = (value) => new Intl.NumberFormat("en-IN", { notation: Number(value || 0) >= 1000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(Number(value || 0));
const ownerLabel = (lead) => lead.assigned_to_name || lead.legal_owner_name || lead.finance_owner_name || "Unassigned";
const docSourceLabel = (fileUrl) => /^https?:\/\//i.test(fileUrl || "") ? "Linked Document" : "Uploaded File";
const docLocationLabel = (fileUrl) => {
  if (!fileUrl) return "--";
  if (!/^https?:\/\//i.test(fileUrl)) return "Stored file path";
  try {
    return new URL(fileUrl).hostname.replace(/^www\./i, "");
  } catch (_error) {
    return "External link";
  }
};

export default function WorkflowWorkspace({ mode }) {
  const config = CONFIG[mode];
  const router = useRouter();
  const [session, setSession] = useState(null), [queue, setQueue] = useState([]), [selectedId, setSelectedId] = useState(""), [selectedLead, setSelectedLead] = useState(null), [teamMembers, setTeamMembers] = useState([]);
  const [pickedFile, setPickedFile] = useState(null);
  const [loading, setLoading] = useState(true), [detailLoading, setDetailLoading] = useState(false), [savingDoc, setSavingDoc] = useState(false), [savingAction, setSavingAction] = useState(false), [deletingDocId, setDeletingDocId] = useState("");
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [docForm, setDocForm] = useState({ file_name: "", file_url: "", file_size: "", document_type: config.docType });
  const [actionForm, setActionForm] = useState({ assigned_to: "", notes: "", invoice_number: "", invoice_amount: "", tax_invoice_number: "" });
  const role = session?.user?.role || "";
  const isOperator = role === config.role;
  const docs = mode === "legal" ? selectedLead?.legal_documents || [] : selectedLead?.finance_documents || [];
  const financeUsers = useMemo(
    () => mode === "legal"
      ? withAssignedWorkflowUser(teamMembers, selectedLead?.assigned_to_finance, selectedLead?.finance_owner_name, "finance-team")
      : teamMembers,
    [mode, selectedLead?.assigned_to_finance, selectedLead?.finance_owner_name, teamMembers]
  );
  const financeUsersMessage = workflowUsersEmptyMessage(selectedLead?.team_name, "finance");

  async function loadQueue(activeSession) {
    const path = activeSession.user?.role === config.role ? `/workflow/my-assigned?page_size=50` : `/workflow/tracker?stage=${mode}&page_size=50`;
    const response = await apiRequest(path, { token: activeSession.token });
    const nextQueue = response.items || [];
    const nextSelectedId = nextQueue.some((lead) => lead.lead_id === selectedId) ? selectedId : nextQueue[0]?.lead_id || "";
    setQueue(nextQueue);
    setSelectedId(nextSelectedId);
    return nextSelectedId;
  }

  async function loadDetail(activeSession, leadId) {
    if (!leadId) {
      setSelectedLead(null);
      setActionForm({ assigned_to: "", notes: "", invoice_number: "", invoice_amount: "", tax_invoice_number: "" });
      return;
    }
    setDetailLoading(true);
    try {
      const response = await apiRequest(`/leads/${leadId}`, { token: activeSession.token });
      setSelectedLead(response);
      setActionForm({
        assigned_to: response.assigned_to_finance || "",
        notes: "",
        invoice_number: response.invoice_number || "",
        invoice_amount: response.invoice_amount || "",
        tax_invoice_number: response.tax_invoice_number || "",
      });
    } finally {
      setDetailLoading(false);
    }
  }

  async function refresh(activeSession) {
    const nextSelectedId = await loadQueue(activeSession);
    await loadDetail(activeSession, nextSelectedId);
  }

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) return router.replace("/login");
    if (!["super-admin", "admin", "manager", config.role].includes(activeSession.user?.role)) return router.replace(ROLE_HOME_ROUTE[activeSession.user?.role] || "/dashboard");
    setSession(activeSession);
    loadQueue(activeSession)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [config.role, config.nextRole, router]);

  useEffect(() => {
    if (!session || !selectedId) return;
    loadDetail(session, selectedId).catch((requestError) => setError(requestError.message));
  }, [selectedId, session]);

  useEffect(() => {
    if (mode !== "legal" || !session || !config.nextRole || !selectedLead?.team_id || !selectedLead?.company_id) {
      setTeamMembers([]);
      return;
    }

    let ignore = false;
    setTeamMembers([]);
    const search = new URLSearchParams({
      company_id: selectedLead.company_id,
      team_ids: selectedLead.team_id,
    });

    apiRequest(`/workflow/users/${config.nextRole}?${search.toString()}`, { token: session.token })
      .then((response) => {
        if (!ignore) {
          setTeamMembers(Array.isArray(response) ? response : []);
        }
      })
      .catch((requestError) => {
        if (!ignore) {
          setTeamMembers([]);
          setError(requestError.message);
        }
      });

    return () => {
      ignore = true;
    };
  }, [config.nextRole, mode, selectedLead?.company_id, selectedLead?.team_id, session]);

  useEffect(() => {
    setPickedFile(null);
    setDocForm({ file_name: "", file_url: "", file_size: "", document_type: config.docType });
  }, [config.docType, selectedId]);

  const summaryCards = useMemo(() => {
    const docCount = queue.reduce((sum, lead) => sum + Number(lead.doc_count || 0), 0);
    const totalValue = queue.reduce((sum, lead) => sum + Number(lead.invoice_amount || lead.estimated_value || 0), 0);

    if (mode === "legal") {
      return [
        { label: "Assigned Queue", value: compact(queue.length), hint: "Leads sitting with legal", icon: "workflow" },
        { label: "Pending Approval", value: compact(queue.filter((lead) => String(lead.agreement_status || "pending").toLowerCase() === "pending").length), hint: "Still waiting for legal approval", icon: "documents" },
        { label: "Docs Visible", value: compact(docCount), hint: "Document count in this queue", icon: "analytics" },
        { label: "Queue Value", value: money(totalValue), hint: "Commercial weight under review", icon: "finance" },
      ];
    }

    return [
      { label: "Assigned Queue", value: compact(queue.length), hint: "Leads sitting with finance", icon: "workflow" },
      { label: "Invoice Ready", value: compact(queue.filter((lead) => lead.invoice_number).length), hint: "Invoice details already captured", icon: "documents" },
      { label: "Invoice Pending", value: compact(queue.filter((lead) => !lead.invoice_number).length), hint: "Need finance details before closure", icon: "analytics" },
      { label: "Queue Value", value: money(totalValue), hint: "Billing value in this desk", icon: "finance" },
    ];
  }, [mode, queue]);

  async function uploadDocument(event) {
    event.preventDefault();
    if (!selectedLead || (!pickedFile && !docForm.file_name.trim())) return setError("Document file or name is required.");
    if (!pickedFile && !docForm.file_url.trim()) return setError("Choose a file or add a hosted document URL.");
    setSavingDoc(true); setError(""); setNotice("");
    try {
      if (pickedFile) {
        const formData = new FormData();
        formData.append("file", pickedFile);
        formData.append("document_type", docForm.document_type || config.docType);
        if (docForm.file_name.trim()) formData.append("file_name", docForm.file_name.trim());
        await apiRequest(`/workflow/${selectedLead.lead_id}/${config.uploadPath}`, { method: "POST", token: session.token, formData });
      } else {
        await apiRequest(`/workflow/${selectedLead.lead_id}/${config.uploadPath}`, { method: "POST", token: session.token, body: { ...docForm, file_size: docForm.file_size ? Number(docForm.file_size) : null } });
      }
      setDocForm({ file_name: "", file_url: "", file_size: "", document_type: config.docType });
      setPickedFile(null);
      setNotice("Document saved successfully.");
      await refresh(session);
    } catch (requestError) { setError(requestError.message); } finally { setSavingDoc(false); }
  }

  async function removeDocument(docId) {
    if (!selectedLead || !window.confirm("Delete this document?")) return;
    setDeletingDocId(String(docId)); setError(""); setNotice("");
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
      await refresh(session);
    } catch (requestError) { setError(requestError.message); } finally { setSavingAction(false); }
  }

  function handleFileSelection(event) {
    const file = event.target.files?.[0];
    if (!file) {
      setPickedFile(null);
      return;
    }

    const sizeKb = Math.max(1, Math.ceil(file.size / 1024));
    file.displaySizeKb = sizeKb;
    setPickedFile(file);
    setDocForm((current) => ({
      ...current,
      file_name: current.file_name || file.name,
      file_size: current.file_size || String(sizeKb),
    }));
    setError("");
    setNotice("File selected. Save the document to upload it to GreenCRM storage.");
  }

  return (
    <DashboardShell session={session} title={config.title} eyebrow={config.eyebrow} heroStats={[]} hideTitle>
      <div className="mx-auto grid max-w-[1380px] gap-5">
        {error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
        {!error && notice ? <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div> : null}
        {loading ? (
          <div className="grid min-h-[320px] place-items-center rounded-[30px] border border-[#eadfcd] bg-white/82 text-sm text-[#7a6b57]">
            Loading workflow queue...
          </div>
        ) : (
          <>
            <section className={HERO}>
              <div className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr] xl:items-start">
                <div className="space-y-5">
                  <div>
                    <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                      {config.eyebrow}
                    </span>
                    <h2 className="mt-4 text-[2.2rem] font-semibold tracking-tight text-[#060710] md:text-[3.1rem] md:leading-[1.02]">
                      {mode === "legal"
                        ? "Review documents, approve the case, and keep the finance hand-off clean."
                        : "Finish invoice work, keep document proof visible, and close the workflow with confidence."}
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-[#746853] md:text-base">{config.queueHelper}</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {summaryCards.map((item) => (
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
                    <button type="button" onClick={() => session?.token && refresh(session)} className={GHOST}>
                      <DashboardIcon name="analytics" className="h-4 w-4" />
                      Refresh Queue
                    </button>
                    <Link href="/leads" className={GHOST}>
                      <DashboardIcon name="leads" className="h-4 w-4" />
                      Open Leads
                    </Link>
                  </div>

                  <div className="rounded-[28px] border border-[#eadfcd] bg-white/86 p-5 shadow-[0_14px_32px_rgba(79,58,22,0.06)]">
                    <p className={KICKER}>Working Rules</p>
                    <div className="mt-4 grid gap-3">
                      <div className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                        <p className={KICKER}>Documents</p>
                        <p className="mt-2 text-sm leading-6 text-[#746853]">
                          Review document history, add a hosted document link, and keep upload ownership obvious for the assigned team.
                        </p>
                      </div>
                      <div className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                        <p className={KICKER}>Next Step</p>
                        <p className="mt-2 text-sm leading-6 text-[#746853]">{config.nextStep}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)] xl:items-start">
              <article className={`${PANEL} xl:sticky xl:top-6`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className={KICKER}>Queue</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">{config.queueTitle}</h3>
                  </div>
                  <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fffaf1] px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                    {queue.length} leads
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {queue.length ? (
                    queue.map((lead) => (
                      <button
                        key={lead.lead_id}
                        type="button"
                        onClick={() => setSelectedId(lead.lead_id)}
                        className={`w-full rounded-[26px] border p-4 text-left transition ${
                          selectedId === lead.lead_id
                            ? "border-[#d7b258] bg-[#fff8e9] shadow-[0_16px_32px_rgba(203,169,82,0.14)]"
                            : "border-[#eadfcd] bg-white/88 shadow-[0_10px_24px_rgba(79,58,22,0.05)] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(79,58,22,0.08)]"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="text-lg font-semibold text-[#060710]">{lead.company_name || "Untitled lead"}</h4>
                            <p className="mt-1 text-sm text-[#746853]">
                              {lead.contact_person || "No contact"} | {ownerLabel(lead)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${WORKFLOW_TONE[lead.workflow_stage || mode] || "bg-[#f4efe5] text-[#6f614c] ring-[#e6dccb]"}`}>
                              {nice(lead.workflow_stage || mode)}
                            </span>
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${STATUS_TONE[lead.status] || "bg-[#f4efe5] text-[#6f614c] ring-[#e6dccb]"}`}>
                              {nice(lead.status || "new")}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className={SOFT}>
                            <p className={KICKER}>Value</p>
                            <p className="mt-2 text-sm font-semibold text-[#060710]">{money(lead.invoice_amount || lead.estimated_value)}</p>
                          </div>
                          <div className={SOFT}>
                            <p className={KICKER}>Docs</p>
                            <p className="mt-2 text-sm font-semibold text-[#060710]">{lead.doc_count || 0}</p>
                          </div>
                          <div className={SOFT}>
                            <p className={KICKER}>Follow-up</p>
                            <p className="mt-2 text-sm font-semibold text-[#060710]">{when(lead.follow_up_date, true)}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-12 text-center text-sm text-[#7a6b57]">
                      {config.empty}
                    </div>
                  )}
                </div>
              </article>

              <div className="space-y-5">
                {selectedLead ? (
                  <>
                    <article className={PANEL}>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className={KICKER}>Selected Lead</p>
                          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">{selectedLead.company_name || "Untitled lead"}</h3>
                          <p className="mt-2 text-sm leading-7 text-[#6f614c]">
                            {selectedLead.contact_person || "No contact"} | {ownerLabel(selectedLead)} | {selectedLead.email || "No email"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${STATUS_TONE[selectedLead.status] || "bg-[#f4efe5] text-[#6f614c] ring-[#e6dccb]"}`}>{nice(selectedLead.status || "new")}</span>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${WORKFLOW_TONE[selectedLead.workflow_stage || mode] || "bg-[#f4efe5] text-[#6f614c] ring-[#e6dccb]"}`}>{nice(selectedLead.workflow_stage || mode)}</span>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${PRIORITY_TONE[selectedLead.priority] || "bg-[#f4efe5] text-[#6f614c] ring-[#e6dccb]"}`}>{nice(selectedLead.priority || "medium")}</span>
                          {detailLoading ? <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">Refreshing...</span> : null}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                          { label: "Contact", value: selectedLead.contact_person || "--" },
                          { label: "Phone", value: selectedLead.phone || "--" },
                          { label: "Value", value: money(selectedLead.invoice_amount || selectedLead.estimated_value) },
                          { label: "Source", value: nice(selectedLead.lead_source || "unknown") },
                          { label: "Legal Owner", value: formatWorkflowOwnerIdentity(selectedLead.legal_owner_name, selectedLead.assigned_to_legal) },
                          { label: "Finance Owner", value: formatWorkflowOwnerIdentity(selectedLead.finance_owner_name, selectedLead.assigned_to_finance) },
                          { label: "Follow-up", value: when(selectedLead.follow_up_date, true) },
                          { label: "Created", value: when(selectedLead.created_at, true) },
                        ].map((item) => (
                          <div key={item.label} className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                            <p className={KICKER}>{item.label}</p>
                            <strong className="mt-3 block text-sm text-[#060710]">{item.value}</strong>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 grid gap-3 lg:grid-cols-2">
                        <div className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                          <p className={KICKER}>Latest Note</p>
                          <p className="mt-3 text-sm leading-7 text-[#5f533f]">{selectedLead.latest_note || "No latest note available yet."}</p>
                        </div>
                        <div className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                          <p className={KICKER}>Requirements</p>
                          <p className="mt-3 text-sm leading-7 text-[#5f533f]">{selectedLead.requirements || "No requirements captured yet."}</p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link href={`/leads/${selectedLead.lead_id}`} className={PRIMARY}>
                          <DashboardIcon name="leads" className="h-4 w-4" />
                          Open Lead
                        </Link>
                      </div>
                    </article>

                    <article className={PANEL}>
                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                        <div>
                          <p className={KICKER}>Documents</p>
                          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">{config.docTitle}</h3>
                          <p className="mt-2 text-sm leading-7 text-[#746853]">
                            Keep file details and document links in one place so legal and finance teams always know what was added and from where.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 xl:justify-end">
                          <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fffaf1] px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                            {docs.length} documents
                          </span>
                          <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7a6230]">
                            {isOperator ? "Editable" : "View Only"}
                          </span>
                        </div>
                      </div>

                      {isOperator ? (
                        <div className="mt-5 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                          <div className="rounded-[26px] border border-[#eadfcd] bg-[#fffaf1] p-5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                                Step 1
                              </span>
                              <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fff6e4] px-3 py-1 text-[11px] font-bold text-[#7a6230]">
                                Choose File
                              </span>
                            </div>
                            <h4 className="mt-4 text-lg font-semibold text-[#060710]">Prepare {config.fileLabel} details</h4>
                            <p className="mt-2 text-sm leading-6 text-[#746853]">
                              Select the file first so document name and size are filled cleanly before you save the record.
                            </p>

                            <label className="mt-4 grid min-h-[180px] cursor-pointer place-items-center rounded-[24px] border border-dashed border-[#d8c7a9] bg-white px-5 py-6 text-center transition hover:border-[#d7b258] hover:bg-[#fffdf8]">
                              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={handleFileSelection} />
                              <div className="space-y-3">
                                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#fff4d9] text-[#8d6e27]">
                                  <DashboardIcon name="documents" className="h-5 w-5" />
                                </div>
                                <div>
                                  <strong className="block text-sm text-[#060710]">{pickedFile ? pickedFile.name : "Choose document file"}</strong>
                                  <span className="mt-1 block text-sm text-[#746853]">
                                    {pickedFile ? `${pickedFile.displaySizeKb || Math.ceil(pickedFile.size / 1024)} KB | ${pickedFile.type || "Unknown"}` : "PDF, image, DOC, DOCX, XLS, or XLSX"}
                                  </span>
                                </div>
                              </div>
                            </label>

                            {pickedFile ? (
                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-4">
                                  <p className={KICKER}>Selected File</p>
                                  <p className="mt-2 text-sm font-semibold text-[#060710]">{pickedFile.name}</p>
                                </div>
                                <div className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-4">
                                  <p className={KICKER}>File Size</p>
                                  <p className="mt-2 text-sm font-semibold text-[#060710]">{pickedFile.displaySizeKb || Math.ceil(pickedFile.size / 1024)} KB</p>
                                </div>
                              </div>
                            ) : null}

                            <div className="mt-4 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-800">
                              Files are uploaded to GreenCRM server storage. You can still paste a hosted URL in Step 2 if the document already lives elsewhere.
                            </div>
                          </div>

                          <form className="rounded-[26px] border border-[#eadfcd] bg-white p-5 shadow-[0_12px_28px_rgba(79,58,22,0.05)]" onSubmit={uploadDocument}>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                                Step 2
                              </span>
                              <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fff6e4] px-3 py-1 text-[11px] font-bold text-[#7a6230]">
                                Save Document
                              </span>
                            </div>
                            <h4 className="mt-4 text-lg font-semibold text-[#060710]">Save document record</h4>
                            <p className="mt-2 text-sm leading-6 text-[#746853]">
                              Upload the selected file or save a hosted URL so the team can reopen the same document later.
                            </p>

                            <div className="mt-4 grid gap-4">
                              <label className="space-y-2">
                                <span className={KICKER}>Document Name</span>
                                <input className={INPUT} value={docForm.file_name} onChange={(event) => setDocForm((current) => ({ ...current, file_name: event.target.value }))} placeholder={mode === "legal" ? "Signed agreement" : "Invoice copy"} />
                              </label>

                              <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-2">
                                  <span className={KICKER}>Document Type</span>
                                  <input className={INPUT} value={docForm.document_type} onChange={(event) => setDocForm((current) => ({ ...current, document_type: event.target.value }))} placeholder={config.docType} />
                                </label>
                                <label className="space-y-2">
                                  <span className={KICKER}>File Size KB</span>
                                  <input type="number" className={INPUT} value={docForm.file_size} onChange={(event) => setDocForm((current) => ({ ...current, file_size: event.target.value }))} placeholder="Optional" />
                                </label>
                              </div>

                              <label className="space-y-2">
                                  <span className={KICKER}>Hosted Document URL (optional)</span>
                                <input className={INPUT} value={docForm.file_url} onChange={(event) => setDocForm((current) => ({ ...current, file_url: event.target.value }))} placeholder={config.linkPlaceholder} />
                              </label>
                            </div>

                            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8f816a]">
                                Saved under {selectedLead.company_name || "selected lead"}
                              </span>
                              <button className={PRIMARY} type="submit" disabled={savingDoc}>
                                <DashboardIcon name="documents" className="h-4 w-4" />
                                {savingDoc ? "Saving..." : "Add Document"}
                              </button>
                            </div>
                          </form>
                        </div>
                      ) : (
                        <div className="mt-5 rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-5 py-5 text-sm leading-7 text-[#746853]">
                          This document section is view-only here. The assigned {mode} operator can add new records and remove existing ones.
                        </div>
                      )}

                      <div className="mt-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className={KICKER}>Saved Documents</p>
                            <h4 className="mt-2 text-lg font-semibold text-[#060710]">Document log</h4>
                          </div>
                          {docs.length ? (
                            <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                              Latest records visible below
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-4 space-y-3">
                          {docs.length ? (
                            docs.map((doc, index) => (
                              <div key={`${doc.id || doc.file_name}-${index}`} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4">
                                <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap gap-2">
                                      <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">{docSourceLabel(doc.file_url)}</span>
                                      <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fff6e4] px-3 py-1 text-[11px] font-bold text-[#7a6230]">{nice(doc.document_type || config.docType)}</span>
                                    </div>
                                    <strong className="mt-3 block text-base text-[#060710]">{doc.file_name || "Document"}</strong>
                                    <p className="mt-1 truncate text-sm text-[#746853]">{doc.file_url || "No document path"}</p>

                                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                      <div className="rounded-[18px] border border-[#eadfcd] bg-white px-3 py-3">
                                        <p className={KICKER}>Added By</p>
                                        <p className="mt-2 text-sm font-semibold text-[#060710]">{doc.uploaded_by_name || "Team"}</p>
                                      </div>
                                      <div className="rounded-[18px] border border-[#eadfcd] bg-white px-3 py-3">
                                        <p className={KICKER}>Date</p>
                                        <p className="mt-2 text-sm font-semibold text-[#060710]">{when(doc.uploaded_at, true)}</p>
                                      </div>
                                      <div className="rounded-[18px] border border-[#eadfcd] bg-white px-3 py-3">
                                        <p className={KICKER}>Location</p>
                                        <p className="mt-2 text-sm font-semibold text-[#060710]">{docLocationLabel(doc.file_url)}</p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-3 xl:justify-end">
                                    <a className={GHOST} href={docHref(doc.file_url)} target="_blank" rel="noreferrer">
                                      <DashboardIcon name="documents" className="h-4 w-4" />
                                      Open
                                    </a>
                                    {isOperator ? (
                                      <button className={DANGER} type="button" disabled={deletingDocId === String(doc.id)} onClick={() => removeDocument(doc.id)}>
                                        {deletingDocId === String(doc.id) ? "Deleting..." : "Delete"}
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-12 text-center text-sm text-[#7a6b57]">
                              No documents saved yet.
                            </div>
                          )}
                        </div>
                      </div>
                    </article>

                    <article className={PANEL}>
                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
                        <div>
                          <p className={KICKER}>Action</p>
                          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">{config.actionTitle}</h3>
                          <p className="mt-2 text-sm leading-7 text-[#746853]">{config.actionCopy}</p>
                        </div>
                        <div className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                          <p className={KICKER}>What Happens Next</p>
                          <p className="mt-3 text-sm leading-7 text-[#746853]">{config.nextStep}</p>
                        </div>
                      </div>

                      {isOperator ? (
                        <form className="mt-5 grid gap-4" onSubmit={submitAction}>
                          {mode === "legal" ? (
                            <label className="space-y-2">
                              <span className={KICKER}>Finance Owner</span>
                              <select className={INPUT} value={actionForm.assigned_to} onChange={(event) => setActionForm((current) => ({ ...current, assigned_to: event.target.value }))}>
                                <option value="">Choose finance owner</option>
                                {financeUsers.map((user) => (
                                  <option key={user.user_id} value={user.user_id}>
                                    {formatWorkflowOwnerIdentity(user.name, user.user_id, "Finance user")}
                                  </option>
                                ))}
                              </select>
                              {!teamMembers.length ? <p className="text-xs font-medium text-[#8d6e27]">{financeUsersMessage}</p> : null}
                            </label>
                          ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                              <label className="space-y-2">
                                <span className={KICKER}>Invoice Number</span>
                                <input className={INPUT} value={actionForm.invoice_number} onChange={(event) => setActionForm((current) => ({ ...current, invoice_number: event.target.value }))} placeholder="INV-2026-001" />
                              </label>
                              <label className="space-y-2">
                                <span className={KICKER}>Invoice Amount</span>
                                <input className={INPUT} value={actionForm.invoice_amount} onChange={(event) => setActionForm((current) => ({ ...current, invoice_amount: event.target.value }))} placeholder="25000" />
                              </label>
                            </div>
                          )}
                          {mode === "finance" ? (
                            <label className="space-y-2">
                              <span className={KICKER}>Tax Invoice Number</span>
                              <input className={INPUT} value={actionForm.tax_invoice_number} onChange={(event) => setActionForm((current) => ({ ...current, tax_invoice_number: event.target.value }))} placeholder="GST-2026-001" />
                            </label>
                          ) : null}
                          <label className="space-y-2">
                            <span className={KICKER}>Notes</span>
                            <textarea rows="4" className={`${INPUT} min-h-[140px] resize-y`} value={actionForm.notes} onChange={(event) => setActionForm((current) => ({ ...current, notes: event.target.value }))} placeholder={mode === "legal" ? "What is approved and what should finance know?" : "Completion note for this lead"} />
                          </label>
                          <div className="flex flex-wrap justify-end gap-3">
                            <button className={PRIMARY} type="submit" disabled={savingAction}>
                              <DashboardIcon name="workflow" className="h-4 w-4" />
                              {savingAction ? "Saving..." : config.submitLabel}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="mt-5 rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-5 py-5 text-sm leading-7 text-[#746853]">
                          This queue is view-only from your current role. Open the lead detail to track documents, notes, and the latest workflow movement.
                        </div>
                      )}
                    </article>
                  </>
                ) : (
                  <article className={PANEL}>
                    <p className={KICKER}>Selected Lead</p>
                    <div className="mt-5 rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-12 text-center text-sm text-[#7a6b57]">
                      Select a lead from the queue to open its workflow detail, documents, and next-step actions.
                    </div>
                  </article>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
