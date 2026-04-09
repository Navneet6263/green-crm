"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../../components/dashboard/DashboardShell";
import DashboardIcon from "../../components/dashboard/icons";
import { apiRequest } from "../../lib/api";
import {
  buildLeadBulkImportSheet,
  BULK_IMPORT_COLUMNS,
  BULK_IMPORT_FIELDS,
  BULK_IMPORT_MAX_ROWS,
  parseLeadBulkImportText,
} from "../../lib/leadBulkImport";
import { loadSession } from "../../lib/session";

const OK_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager", "sales", "marketing", "viewer"];
const MANAGER_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager"];
const CREATE_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager", "sales", "marketing"];
const LEADS_PAGE_SIZE = 12;
const STATUS = { new: ["rgba(79,140,255,.12)", "#2f6fdd"], contacted: ["rgba(56,189,248,.14)", "#0077b8"], qualified: ["rgba(167,139,250,.14)", "#6d46d6"], proposal: ["rgba(245,164,45,.14)", "#b96a00"], negotiation: ["rgba(251,146,60,.14)", "#c96200"], "closed-won": ["rgba(31,199,120,.16)", "#0f8c53"], "closed-lost": ["rgba(224,82,82,.14)", "#b63b3b"], pending: ["rgba(245,164,45,.14)", "#b96a00"] };
const PRIORITY = { low: ["rgba(56,189,248,.12)", "#0077b8"], medium: ["rgba(245,164,45,.14)", "#b96a00"], high: ["rgba(255,108,156,.14)", "#c4356b"], urgent: ["rgba(224,82,82,.14)", "#b63b3b"] };

const qp = (path, params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "" && v !== "all") q.set(k, v); });
  const s = q.toString();
  return s ? `${path}?${s}` : path;
};
const money = (v) => `INR ${Number(v || 0).toLocaleString("en-IN")}`;
const nice = (v) => String(v || "").split("-").filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1)).join(" ");
const when = (v, withTime = false) => !v ? "--" : new Date(v).toLocaleString("en-IN", withTime ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short", year: "numeric" });
const cleanText = (v = "") => String(v || "").trim();
const hasLetters = (v = "") => /[A-Za-z]/.test(cleanText(v));
const initials = (...values) => {
  const source = values.map(cleanText).find((value) => value && hasLetters(value)) || values.map(cleanText).find(Boolean) || "Lead";
  return source.split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase() || "").join("");
};
const leadPrimaryName = (lead = {}) => {
  const contact = cleanText(lead.contact_person);
  const company = cleanText(lead.company_name);
  if (contact && hasLetters(contact)) return contact;
  if (company) return company;
  if (contact) return contact;
  return "Lead";
};
const leadSecondaryName = (lead = {}) => {
  const contact = cleanText(lead.contact_person);
  const company = cleanText(lead.company_name);
  if (contact && hasLetters(contact) && company && company !== contact) return company;
  if ((!contact || !hasLetters(contact)) && company && contact && company !== contact) return contact;
  return "";
};

export default function LeadsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null), [companies, setCompanies] = useState([]), [team, setTeam] = useState([]), [leads, setLeads] = useState([]), [productOptions, setProductOptions] = useState([]), [leadMeta, setLeadMeta] = useState({ page: 1, page_size: LEADS_PAGE_SIZE, total: 0, total_pages: 1 });
  const [selectedId, setSelectedId] = useState(""), [selected, setSelected] = useState(null), [search, setSearch] = useState(""), [status, setStatus] = useState("all"), [product, setProduct] = useState("all"), [company, setCompany] = useState("all"), [page, setPage] = useState(1), [picked, setPicked] = useState([]), [bulkOwner, setBulkOwner] = useState(""), [bulkNote, setBulkNote] = useState(""), [owner, setOwner] = useState("");
  const [booting, setBooting] = useState(true), [loading, setLoading] = useState(false), [detailLoading, setDetailLoading] = useState(false), [assigning, setAssigning] = useState(false), [bulkAssigning, setBulkAssigning] = useState(false), [bulkImporting, setBulkImporting] = useState(false), [transferring, setTransferring] = useState(false), [deleting, setDeleting] = useState(""), [error, setError] = useState(""), [notice, setNotice] = useState(""), [ownerNote, setOwnerNote] = useState(""), [legalTransferOwner, setLegalTransferOwner] = useState(""), [legalTransferNote, setLegalTransferNote] = useState("");
  const [showBulkUpload, setShowBulkUpload] = useState(false), [bulkUploadText, setBulkUploadText] = useState(""), [bulkUploadFile, setBulkUploadFile] = useState(""), [bulkUploadReport, setBulkUploadReport] = useState(null), [refreshSeed, setRefreshSeed] = useState(0);
  const role = session?.user?.role || "", isPlatformConsole = ["super-admin", "platform-admin", "platform-manager"].includes(role), isSuper = role === "super-admin", canManage = MANAGER_ROLES.includes(role), canCreate = CREATE_ROLES.includes(role), canEdit = role !== "viewer";
  const scopedCompanyId = isPlatformConsole && company !== "all" ? company : undefined;
  const blankBulkSheet = useMemo(() => buildLeadBulkImportSheet({ includeSample: false }), []);
  const sampleBulkSheet = useMemo(() => buildLeadBulkImportSheet({ includeSample: true }), []);
  const bulkUploadPreview = useMemo(() => {
    try {
      return {
        ...parseLeadBulkImportText(bulkUploadText),
        error: "",
      };
    } catch (previewError) {
      return {
        rows: [],
        rowCount: 0,
        hasHeader: false,
        delimiter: "tab",
        preview: null,
        error: previewError.message,
      };
    }
  }, [bulkUploadText]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const s = loadSession();
      if (!s) return router.replace("/login");
      if (!OK_ROLES.includes(s.user?.role)) return router.replace("/dashboard");
      try {
        if (["super-admin", "platform-admin", "platform-manager"].includes(s.user?.role)) {
          const res = await apiRequest("/companies?page_size=50", { token: s.token });
          if (!ignore) setCompanies(res.items || []);
        }
        if (!ignore) setSession(s);
      } catch (e) { if (!ignore) setError(e.message); } finally { if (!ignore) setBooting(false); }
    })();
    return () => { ignore = true; };
  }, [router]);

  useEffect(() => {
    if (!session) return;
    let ignore = false;
    (async () => {
      setLoading(true); setError("");
      try {
        const quickFilter = ["active", "pending", "assigned", "unassigned", "transferred"].includes(status) ? status : undefined;
        const leadRes = await apiRequest(qp("/leads", {
          page,
          page_size: LEADS_PAGE_SIZE,
          company_id: scopedCompanyId,
          search: search.trim() || undefined,
          product_id: product !== "all" ? product : undefined,
          status: quickFilter ? undefined : status,
          quick_filter: quickFilter,
        }), { token: session.token });
        if (ignore) return;
        const nextMeta = {
          page: Number(leadRes.meta?.page || page || 1),
          page_size: Number(leadRes.meta?.page_size || LEADS_PAGE_SIZE),
          total: Number(leadRes.meta?.total || 0),
          total_pages: Math.max(Number(leadRes.meta?.total_pages || 1), 1),
        };
        if (nextMeta.total_pages && page > nextMeta.total_pages) {
          setLeadMeta(nextMeta);
          setPage(nextMeta.total_pages);
          return;
        }
        const items = leadRes.items || [];
        setLeadMeta(nextMeta);
        setLeads(items);
        setPicked((cur) => cur.filter((id) => items.some((lead) => lead.lead_id === id)));
        setSelectedId((cur) => items.some((lead) => lead.lead_id === cur) ? cur : (items[0]?.lead_id || ""));
      } catch (e) { if (!ignore) { setError(e.message); setLeads([]); setLeadMeta({ page: 1, page_size: LEADS_PAGE_SIZE, total: 0, total_pages: 1 }); } } finally { if (!ignore) setLoading(false); }
    })();
    return () => { ignore = true; };
  }, [session, scopedCompanyId, search, status, product, page, refreshSeed]);

  useEffect(() => { setPage(1); }, [search, status, product, company]);

  useEffect(() => {
    if (!session) return;
    let ignore = false;
    (async () => {
      try {
        const reqs = [
          canManage && (!isPlatformConsole || scopedCompanyId)
            ? apiRequest(qp("/auth/users", { page_size: 60, company_id: scopedCompanyId }), { token: session.token })
            : Promise.resolve({ items: [] }),
          !isPlatformConsole || scopedCompanyId
            ? apiRequest(qp("/leads/stats/products", { company_id: scopedCompanyId }), { token: session.token })
            : Promise.resolve([]),
        ];
        const [userRes, productStats] = await Promise.all(reqs);
        if (ignore) return;
        setTeam((userRes.items || []).filter((u) => u.is_active));
        setProductOptions(
          (Array.isArray(productStats) ? productStats : [])
            .map((item) => ({
              value: item.product_id,
              label: item.name || "Unnamed Product",
              count: Number(item.total_leads || 0),
            }))
            .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
        );
      } catch (_error) {
        if (!ignore) {
          setTeam([]);
          setProductOptions([]);
        }
      }
    })();
    return () => { ignore = true; };
  }, [session, scopedCompanyId, canManage, isPlatformConsole, refreshSeed]);

  useEffect(() => {
    if (!session?.token || !selectedId) { setSelected(null); setOwner(""); return; }
    let ignore = false;
    (async () => {
      const base = leads.find((lead) => lead.lead_id === selectedId) || null;
      setSelected(base);
      setOwner(base?.assigned_to || "");
      setOwnerNote("");
      setLegalTransferOwner(base?.assigned_to_legal || "");
      setLegalTransferNote("");
      setDetailLoading(true);
      try {
        const lead = await apiRequest(`/leads/${selectedId}`, { token: session.token });
        if (!ignore) { setSelected(lead); setOwner(lead.assigned_to || ""); setLegalTransferOwner(lead.assigned_to_legal || ""); }
      } catch (e) { if (!ignore) setError(e.message); } finally { if (!ignore) setDetailLoading(false); }
    })();
    return () => { ignore = true; };
  }, [selectedId, session, leads]);

  const products = useMemo(() => {
    if (productOptions.length) {
      return productOptions;
    }

    const map = new Map();
    leads.forEach((lead) => { const key = lead.product_id || lead.product_name; if (!key) return; const cur = map.get(key) || { value: key, label: lead.product_name || "Unnamed Product", count: 0 }; cur.count += 1; map.set(key, cur); });
    return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [leads, productOptions]);
  const rows = leads;
  const totalMatched = Number(leadMeta.total || 0);
  const pages = Math.max(Number(leadMeta.total_pages || 1), 1);
  const allPicked = !!rows.length && rows.every((lead) => picked.includes(lead.lead_id));
  const activeLead = selected || leads.find((lead) => lead.lead_id === selectedId) || null;
  const ownershipLabel = ["sales", "marketing"].includes(role) ? "Created by you" : isPlatformConsole ? company === "all" ? isSuper ? "Cross-tenant" : "Assigned companies" : "Single tenant" : "Tenant-wide";
  const closedWonCount = status === "closed-won" ? totalMatched : leads.filter((lead) => lead.status === "closed-won").length;
  const transferredCount = status === "transferred" ? totalMatched : leads.filter((lead) => ["legal", "finance", "completed"].includes(lead.workflow_stage || "sales")).length;
  const legalTeam = team.filter((user) => user.role === "legal-team");
  const canTransferActiveLead = Boolean(activeLead?.can_transfer_to_legal) && ["super-admin", "platform-admin", "platform-manager", "admin", "manager", "sales"].includes(role);
  const heroStats = useMemo(() => [{ label: "Matched Leads", value: totalMatched }, { label: "Page Value", value: money(leads.reduce((s, lead) => s + Number(lead.estimated_value || 0), 0)), color: "#0f8c53" }, { label: "Loaded", value: leads.length, color: "#2f6fdd" }, { label: "Closed Won", value: closedWonCount, color: "#0f8c53" }], [closedWonCount, leads, totalMatched]);

  useEffect(() => {
    if (product === "all") return;
    if (!products.some((item) => item.value === product)) {
      setProduct("all");
    }
  }, [product, products]);

  const applyOwner = (leadIds, nextOwner, label) => {
    setLeads((cur) => cur.map((lead) => leadIds.includes(lead.lead_id) ? { ...lead, assigned_to: nextOwner, assigned_to_name: label } : lead));
    setSelected((cur) => cur && leadIds.includes(cur.lead_id) ? { ...cur, assigned_to: nextOwner, assigned_to_name: label } : cur);
  };

  async function saveOwner() {
    if (!activeLead || !owner || owner === activeLead.assigned_to) return;
    if (!ownerNote.trim()) {
      setError("Owner update note is required.");
      return;
    }
    setAssigning(true); setError(""); setNotice("");
    try {
      await apiRequest(`/leads/${activeLead.lead_id}/assign`, { method: "POST", token: session.token, body: { assigned_to: owner, change_note: ownerNote.trim() } });
      const person = team.find((u) => u.user_id === owner);
      applyOwner([activeLead.lead_id], owner, person?.name || activeLead.assigned_to_name);
      setOwnerNote("");
      setNotice(`Lead owner updated to ${person?.name || "selected user"}.`);
    } catch (e) { setError(e.message); } finally { setAssigning(false); }
  }

  async function bulkAssign() {
    if (!bulkOwner || !picked.length) return;
    if (!bulkNote.trim()) {
      setError("Bulk assignment note is required.");
      return;
    }
    setBulkAssigning(true); setError(""); setNotice("");
    try {
      await Promise.all(picked.map((id) => apiRequest(`/leads/${id}/assign`, { method: "POST", token: session.token, body: { assigned_to: bulkOwner, change_note: bulkNote.trim() } })));
      const person = team.find((u) => u.user_id === bulkOwner);
      applyOwner(picked, bulkOwner, person?.name || "");
      setNotice(`${picked.length} leads assigned to ${person?.name || "selected user"}.`); setPicked([]); setBulkOwner(""); setBulkNote("");
    } catch (e) { setError(e.message); } finally { setBulkAssigning(false); }
  }

  function resetBulkUploadPanel() {
    setBulkUploadText("");
    setBulkUploadFile("");
    setBulkUploadReport(null);
  }

  async function handleBulkFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setBulkUploadText(text);
      setBulkUploadFile(file.name);
      setBulkUploadReport(null);
      setShowBulkUpload(true);
    } catch (e) {
      setError("Could not read the selected file.");
    } finally {
      event.target.value = "";
    }
  }

  function downloadBulkTemplate(filename, content) {
    if (typeof window === "undefined") {
      return;
    }

    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  function loadBulkTemplate(content, label) {
    setBulkUploadText(content);
    setBulkUploadFile(label);
    setBulkUploadReport(null);
    setError("");
    setNotice(`${label} loaded in the upload sheet.`);
  }

  async function submitBulkUpload() {
    if (!session?.token) return;

    if (bulkUploadPreview.error) {
      setError(bulkUploadPreview.error);
      return;
    }

    if (!bulkUploadPreview.rows.length) {
      setError("Paste at least one formatted lead row before uploading.");
      return;
    }

    setBulkImporting(true);
    setError("");
    setNotice("");
    setBulkUploadReport(null);

    try {
      const response = await apiRequest("/leads/bulk-upload", {
        method: "POST",
        token: session.token,
        body: {
          rows: bulkUploadPreview.rows,
        },
      });

      setBulkUploadReport(response);
      setRefreshSeed((current) => current + 1);

      if (response.failed) {
        setNotice(`${response.imported} leads imported. ${response.failed} rows need review.`);
      } else {
        setNotice(`${response.imported} leads imported successfully.`);
        resetBulkUploadPanel();
        setShowBulkUpload(false);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBulkImporting(false);
    }
  }

  async function archiveLead(id) {
    const lead = leads.find((item) => item.lead_id === id);
    if (!window.confirm(`Archive "${lead?.company_name || "this lead"}"?`)) return;
    const archiveNote = window.prompt("Archive note is required. Why are you archiving this lead?")?.trim();
    if (!archiveNote) {
      setError("Archive note is required.");
      return;
    }
    setDeleting(id); setError(""); setNotice("");
    try {
      await apiRequest(`/leads/${id}`, { method: "DELETE", token: session.token, body: { change_note: archiveNote } });
      setPicked((cur) => cur.filter((item) => item !== id));
      if (selectedId === id) setSelectedId("");
      setRefreshSeed((current) => current + 1);
      setNotice(`Lead "${lead?.company_name || ""}" archived successfully.`);
    } catch (e) { setError(e.message); } finally { setDeleting(""); }
  }

  async function transferLeadToLegal() {
    if (!activeLead) return;
    if (!legalTransferNote.trim()) {
      setError("Transfer note is required before moving a closed-won lead to legal.");
      return;
    }
    setTransferring(true); setError(""); setNotice("");
    try {
      const updatedLead = await apiRequest(`/workflow/${activeLead.lead_id}/transfer-to-legal`, {
        method: "POST",
        token: session.token,
        body: { assigned_to: legalTransferOwner || null, notes: legalTransferNote.trim() },
      });
      setLeads((cur) => cur.map((lead) => lead.lead_id === updatedLead.lead_id ? { ...lead, ...updatedLead } : lead));
      const latestLead = await apiRequest(`/leads/${updatedLead.lead_id}`, { token: session.token });
      setSelected(latestLead);
      setSelectedId(latestLead.lead_id);
      setLegalTransferNote("");
      setNotice("Lead transferred to legal successfully.");
    } catch (e) { setError(e.message); } finally { setTransferring(false); }
  }

  return (
    <DashboardShell session={session} title={["sales", "marketing"].includes(role) ? "My Leads" : "Lead Pipeline"} eyebrow={isPlatformConsole ? `Platform · ${isSuper ? "All Tenants" : "Assigned Companies"}` : "Sales Workspace"} heroStats={heroStats}>
      {error ? <div className="alert error">{error}</div> : null}
      {!error && notice ? <div className="alert">{notice}</div> : null}
      {booting || loading ? <div className="alert">Loading leads workspace...</div> : null}
      {!booting && !loading ? (
        <section className="lead-board-shell">
          <article className="lead-board-intro">
            <div>
              <span className="lead-kicker">Lead Control</span>
              <h2>{["sales", "marketing"].includes(role) ? "My Created Leads" : "All Leads Command Center"}</h2>
              <p>{isPlatformConsole ? "Use the company filter to focus on one tenant before managing ownership and lead flow." : ["admin", "manager"].includes(role) ? "Admins and managers can review the full tenant pipeline here. Sales and marketing only see the leads they created." : ["sales", "marketing"].includes(role) ? "This view only shows leads created by your account." : "Read-only lead review mode is active."}</p>
            </div>
            <div className="lead-board-actions">
              {canCreate ? <Link href="/leads/new" className="button primary"><DashboardIcon name="leads" />Create Lead</Link> : null}
              {canCreate ? <button className="button ghost" type="button" onClick={() => setShowBulkUpload((current) => !current)}><DashboardIcon name="analytics" />{showBulkUpload ? "Hide Bulk Upload" : "Bulk Upload"}</button> : null}
              <Link href="/leads/history" className="button ghost"><DashboardIcon name="analytics" />Lead History</Link>
            </div>
          </article>

          {canCreate && showBulkUpload ? (
            <article className="lead-import-panel">
              <div className="lead-import-head">
                <div>
                  <span className="lead-kicker">Bulk Upload</span>
                  <h3>Import leads with the same fields used in Add Lead</h3>
                  <p>
                    Paste tab-separated rows or upload a text, TSV, or CSV file in the exact {BULK_IMPORT_COLUMNS.length}-column order.
                    Legal transfer, finance transfer, and auto-import notes are not part of this sheet.
                  </p>
                </div>

                <div className="lead-import-head-actions">
                  <label className="button ghost lead-import-file">
                    <DashboardIcon name="products" />
                    {bulkUploadFile ? `File: ${bulkUploadFile}` : "Choose File"}
                    <input type="file" accept=".txt,.tsv,.csv" onChange={handleBulkFileChange} hidden />
                  </label>
                  <button
                    className="button ghost"
                    type="button"
                    onClick={() => downloadBulkTemplate("greencrm-lead-template.csv", blankBulkSheet)}
                  >
                    <DashboardIcon name="message" />
                    Download Blank Sheet
                  </button>
                  <button
                    className="button ghost"
                    type="button"
                    onClick={() => downloadBulkTemplate("greencrm-lead-sample.csv", sampleBulkSheet)}
                  >
                    <DashboardIcon name="analytics" />
                    Download Sample Sheet
                  </button>
                </div>
              </div>

              <div className="lead-import-grid">
                <div className="lead-import-compose">
                  <label className="field full-width lead-field">
                    <span>Paste Lead Rows</span>
                    <textarea
                      rows="10"
                      value={bulkUploadText}
                      onChange={(event) => setBulkUploadText(event.target.value)}
                      placeholder="Paste rows here in the same order as the table on the right..."
                    />
                  </label>

                  <div className="lead-import-meta">
                    <span>{bulkUploadPreview.rowCount || 0} rows ready</span>
                    <span>{bulkUploadPreview.hasHeader ? "Template header detected" : "Header optional"}</span>
                    <span>{bulkUploadPreview.delimiter === "tab" ? "Tab-separated format" : "CSV format"}</span>
                    <span>Max {BULK_IMPORT_MAX_ROWS} rows</span>
                  </div>

                  {bulkUploadPreview.error ? <div className="alert error">{bulkUploadPreview.error}</div> : null}

                  {bulkUploadPreview.preview ? (
                    <div className="lead-import-preview">
                      <div>
                        <span>Company Code</span>
                        <strong>{bulkUploadPreview.preview.company_id || "--"}</strong>
                      </div>
                      <div>
                        <span>Product Code</span>
                        <strong>{bulkUploadPreview.preview.product_id || "--"}</strong>
                      </div>
                      <div>
                        <span>Contact</span>
                        <strong>{bulkUploadPreview.preview.contact_person || "--"}</strong>
                      </div>
                      <div>
                        <span>Company Name</span>
                        <strong>{bulkUploadPreview.preview.company_name || "--"}</strong>
                      </div>
                    </div>
                  ) : null}

                  {bulkUploadReport ? (
                    <div className="lead-import-report">
                      <div className="lead-import-report-summary">
                        <strong>{bulkUploadReport.imported} imported</strong>
                        <span>{bulkUploadReport.failed || 0} failed</span>
                      </div>
                      {bulkUploadReport.errors?.length ? (
                        <div className="lead-import-report-list">
                          {bulkUploadReport.errors.slice(0, 6).map((item) => (
                            <div key={`${item.row}-${item.message}`} className="lead-import-report-item">
                              <strong>Row {item.row}</strong>
                              <span>{item.message}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="lead-import-template">
                  <div className="lead-import-template-head">
                    <span className="lead-kicker">Sheet Template</span>
                    <strong>Simple Add Lead sheet</strong>
                  </div>
                  <p>
                    Ye plain sheet sirf wahi fields rakhti hai jo Add Lead form me dikhte hain. Extra transfer aur note columns hata diye gaye hain.
                  </p>
                  <div className="lead-sheet-actions">
                    <button className="button ghost" type="button" onClick={() => loadBulkTemplate(blankBulkSheet, "Blank sheet template")}>
                      Use Blank Sheet
                    </button>
                    <button className="button ghost" type="button" onClick={() => loadBulkTemplate(sampleBulkSheet, "Sample sheet template")}>
                      Use Sample Sheet
                    </button>
                  </div>
                  <div className="lead-sheet-template">
                    <div className="lead-sheet-scroll">
                      <table className="lead-sheet-table">
                        <thead>
                          <tr>
                            <th>Column</th>
                            <th>Label</th>
                            <th>Required</th>
                            <th>Example</th>
                            <th>Use</th>
                          </tr>
                        </thead>
                        <tbody>
                          {BULK_IMPORT_FIELDS.map((item) => (
                            <tr key={item.key}>
                              <td><code>{item.key}</code></td>
                              <td>{item.label}</td>
                              <td>{item.required}</td>
                              <td>{item.example || "--"}</td>
                              <td>{item.note}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <small>
                      Keep the exact order shown in this table. Max {BULK_IMPORT_MAX_ROWS} rows in one upload.
                    </small>
                  </div>
                </div>
              </div>

              <div className="lead-import-footer">
                <button className="button ghost" type="button" onClick={resetBulkUploadPanel}>
                  Clear Upload
                </button>
                <button
                  className="button primary"
                  type="button"
                  onClick={submitBulkUpload}
                  disabled={bulkImporting || !bulkUploadPreview.rowCount || Boolean(bulkUploadPreview.error)}
                >
                  {bulkImporting ? "Uploading..." : `Upload ${bulkUploadPreview.rowCount || 0} Leads`}
                </button>
              </div>
            </article>
          ) : null}

          <article className="lead-board-toolbar">
            <div className="lead-filter-grid">
              {isPlatformConsole ? (
                <label className="field">
                  <span>Tenant Company</span>
                  <select value={company} onChange={(event) => setCompany(event.target.value)}>
                    <option value="all">All Companies</option>
                    {companies.map((item) => <option key={item.company_id} value={item.company_id}>{item.name}</option>)}
                  </select>
                </label>
              ) : null}
              <label className="field">
                <span>Status</span>
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="closed-won">Closed Won</option>
                  <option value="closed-lost">Closed Lost</option>
                  <option value="transferred">Transferred</option>
                  <option value="assigned">Assigned</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </label>
              <label className="field">
                <span>Product</span>
                <select value={product} onChange={(event) => setProduct(event.target.value)}>
                  <option value="all">All Products</option>
                  {products.map((item) => <option key={item.value} value={item.value}>{item.label} ({item.count})</option>)}
                </select>
              </label>
              <label className="field full-width">
                <span>Search</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, contact, email, phone, source, owner" />
              </label>
            </div>
            <div className="lead-toolbar-meta">
              <div className="lead-toolbar-pills">
                <div className="lead-toolbar-pill"><span>Visible Scope</span><strong>{totalMatched} leads matched</strong></div>
                <div className="lead-toolbar-pill"><span>Ownership</span><strong>{ownershipLabel}</strong></div>
                <button className={`lead-toolbar-chip ${status === "closed-won" ? "active" : ""}`} type="button" onClick={() => { setStatus("closed-won"); setPage(1); }}>Closed Won {closedWonCount}</button>
                <button className={`lead-toolbar-chip ${status === "transferred" ? "active" : ""}`} type="button" onClick={() => { setStatus("transferred"); setPage(1); }}>Transferred {transferredCount}</button>
              </div>
              <div className="lead-toolbar-actions">
                <button className="button ghost" type="button" onClick={() => { setSearch(""); setStatus("all"); setProduct("all"); setPage(1); }}>Reset Filters</button>
              </div>
            </div>
          </article>

          {canManage && picked.length ? (
            <article className="lead-bulk-bar">
              <div className="lead-bulk-summary">
                <span className="lead-kicker">Bulk Assign</span>
                <strong>{picked.length} selected</strong>
                <span>Choose the new owner and log one note for this reassignment.</span>
              </div>
              <div className="lead-bulk-actions">
                <select value={bulkOwner} onChange={(event) => setBulkOwner(event.target.value)}>
                  <option value="">{isSuper && company === "all" ? "Choose a company first" : "Assign selected leads to..."}</option>
                  {team.map((item) => <option key={item.user_id} value={item.user_id}>{item.name} | {item.role}</option>)}
                </select>
                <label className="field lead-bulk-note">
                  <span>Assignment Note *</span>
                  <textarea
                    rows="2"
                    value={bulkNote}
                    onChange={(event) => setBulkNote(event.target.value)}
                    placeholder="Why are these selected leads being reassigned?"
                  />
                </label>
                <button className="button primary" type="button" onClick={bulkAssign} disabled={bulkAssigning || !bulkOwner || !bulkNote.trim() || (isPlatformConsole && company === "all")}>{bulkAssigning ? "Assigning..." : "Assign Selected"}</button>
                <button className="button ghost" type="button" onClick={() => { setPicked([]); setBulkOwner(""); setBulkNote(""); }}>Clear</button>
              </div>
            </article>
          ) : null}

          <div className="lead-board-layout">
            <article className="lead-roster-card">
              <div className="lead-roster-head">
                <div><span className="lead-kicker">Roster</span><h3>Lead list</h3></div>
                <div className="lead-roster-head-meta">
                  <span>Page {Math.min(page, pages)} of {pages}</span>
                  {canManage && rows.length ? <label className="lead-select-all"><input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? [] : rows.map((lead) => lead.lead_id))} /><span>Select page</span></label> : null}
                  {canManage && picked.length ? <span className="lead-select-count">{picked.length} selected</span> : null}
                </div>
              </div>

              <div className="lead-roster-list">
                {rows.length ? rows.map((lead) => {
                  const s = STATUS[lead.status] || STATUS.new, p = PRIORITY[lead.priority] || PRIORITY.medium;
                  const primaryName = leadPrimaryName(lead);
                  const secondaryName = leadSecondaryName(lead);
                  const noteCount = Number(lead.note_count || 0);
                  return (
                    <div className={`lead-row ${selectedId === lead.lead_id ? "active" : ""}`} key={lead.lead_id}>
                      {canManage ? <label className="lead-row-check"><input type="checkbox" checked={picked.includes(lead.lead_id)} onChange={() => setPicked((cur) => cur.includes(lead.lead_id) ? cur.filter((id) => id !== lead.lead_id) : [...cur, lead.lead_id])} /></label> : null}
                      <button className="lead-row-main" type="button" onClick={() => setSelectedId(lead.lead_id)}>
                        <div className="lead-row-avatar">{initials(lead.contact_person, lead.company_name, lead.email)}</div>
                        <div className="lead-row-copy">
                          <div className="lead-row-top">
                            <div className="lead-row-title-block">
                              <div className="lead-row-tags">
                                {lead.product_name ? <span className="lead-product-pill"><span className="lead-product-dot" />{lead.product_name}</span> : null}
                                {noteCount ? <span className="lead-chip neutral lead-note-pill">{noteCount} {noteCount === 1 ? "note" : "notes"}</span> : null}
                              </div>
                              <h4>{primaryName}</h4>
                              {secondaryName ? <p className="lead-row-subtitle">{secondaryName}</p> : null}
                            </div>
                            <div className="lead-row-tags"><span className="lead-chip" style={{ background: s[0], color: s[1] }}>{nice(lead.status)}</span><span className="lead-chip" style={{ background: p[0], color: p[1] }}>{nice(lead.priority || "medium")}</span></div>
                          </div>
                          <div className="lead-row-meta"><span>{lead.contact_person || "--"}</span><span>{lead.email || "No email"}</span><span>{lead.phone || "No phone"}</span>{lead.address_city ? <span>{lead.address_city}</span> : null}</div>
                          <div className="lead-row-foot"><span>Source: {nice(lead.lead_source || "website")}</span><span>Value: {money(lead.estimated_value)}</span><span>Created: {when(lead.created_at)}</span><span>By: {lead.created_by_name || "Unknown"}</span></div>
                          {lead.latest_note ? <p className="lead-row-note"><strong>Latest note:</strong> {lead.latest_note}</p> : lead.requirements ? <p className="lead-row-note"><strong>Brief:</strong> {lead.requirements}</p> : null}
                        </div>
                      </button>
                      <div className="lead-row-side">
                        <div className={`lead-owner ${lead.assigned_to ? "assigned" : ""}`}><DashboardIcon name="user" /><span>{lead.assigned_to_name || "Unassigned"}</span></div>
                        <div className="lead-row-links">
                          <Link href={`/leads/${lead.lead_id}`} className="lead-link">Open</Link>
                          {canEdit ? <Link href={`/leads/${lead.lead_id}/edit`} className="lead-link muted">Edit</Link> : null}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="lead-empty"><div className="lead-empty-icon"><DashboardIcon name="leads" /></div><h3>No leads matched</h3><p>Adjust the search or filters to widen the result set.</p></div>
                )}
              </div>

              {totalMatched > leadMeta.page_size ? <div className="lead-pagination"><button className="button ghost" type="button" disabled={page === 1} onClick={() => setPage((cur) => Math.max(1, cur - 1))}>Previous</button><span>{totalMatched ? (page - 1) * leadMeta.page_size + 1 : 0}-{Math.min(page * leadMeta.page_size, totalMatched)} of {totalMatched}</span><button className="button ghost" type="button" disabled={page === pages} onClick={() => setPage((cur) => Math.min(pages, cur + 1))}>Next</button></div> : null}
            </article>

            <aside className="lead-detail-stack">
              {activeLead ? (
                <>
                  <article className="lead-detail-card lead-detail-hero">
                    <span className="lead-kicker">Selected Lead</span>
                    <h3>{leadPrimaryName(activeLead)}</h3>
                    <p>{[leadSecondaryName(activeLead), activeLead.email || "No email", activeLead.phone || "No phone"].filter(Boolean).join(" | ")}</p>
                    <div className="lead-row-tags"><span className="lead-chip" style={{ background: (STATUS[activeLead.status] || STATUS.new)[0], color: (STATUS[activeLead.status] || STATUS.new)[1] }}>{nice(activeLead.status)}</span><span className="lead-chip" style={{ background: (PRIORITY[activeLead.priority] || PRIORITY.medium)[0], color: (PRIORITY[activeLead.priority] || PRIORITY.medium)[1] }}>{nice(activeLead.priority || "medium")}</span><span className="lead-product-pill"><span className="lead-product-dot" />{activeLead.product_name || "No product"}</span><span className="lead-chip neutral">Workflow {nice(activeLead.workflow_stage || "sales")}</span><span className="lead-chip neutral">{Number(activeLead.note_count || 0)} {Number(activeLead.note_count || 0) === 1 ? "note" : "notes"}</span></div>
                    <div className="lead-detail-actions"><Link href={`/leads/${activeLead.lead_id}`} className="button primary">Open Full Detail</Link>{canEdit ? <Link href={`/leads/${activeLead.lead_id}/edit`} className="button ghost">Edit Lead</Link> : null}</div>
                  </article>

                  <article className="lead-detail-card">
                    <div className="lead-detail-head"><div><span className="lead-kicker">Snapshot</span><h4>Lead intelligence</h4></div>{detailLoading ? <span className="pill">Refreshing...</span> : null}</div>
                    <div className="lead-detail-grid">
                      <div><span>Owner</span><strong>{activeLead.assigned_to_name || "Unassigned"}</strong></div>
                      <div><span>Created By</span><strong>{activeLead.created_by_name || "Unknown"}</strong></div>
                      <div><span>Lead Source</span><strong>{nice(activeLead.lead_source || "website")}</strong></div>
                      <div><span>Workflow</span><strong>{nice(activeLead.workflow_stage || "sales")}</strong></div>
                      <div><span>Estimated Value</span><strong>{money(activeLead.estimated_value)}</strong></div>
                      <div><span>Created</span><strong>{when(activeLead.created_at, true)}</strong></div>
                      <div><span>Follow Up</span><strong>{when(activeLead.follow_up_date, true)}</strong></div>
                      <div><span>Location</span><strong>{[activeLead.address_city, activeLead.address_state, activeLead.address_country].filter(Boolean).join(", ") || "Not added"}</strong></div>
                      <div><span>Notes Logged</span><strong>{Number(activeLead.note_count || 0)}</strong></div>
                      <div><span>Latest Note</span><strong>{activeLead.latest_note || "No note yet"}</strong></div>
                      <div><span>Legal Docs</span><strong>{Number(activeLead.legal_documents?.length || 0)}</strong></div>
                      <div><span>Finance Docs</span><strong>{Number(activeLead.finance_documents?.length || 0)}</strong></div>
                    </div>
                  </article>

                  {canTransferActiveLead ? (
                    <article className="lead-detail-card">
                      <div className="lead-detail-head"><div><span className="lead-kicker">Closed Won</span><h4>Transfer to legal</h4></div></div>
                      <div className="form-grid">
                        <label className="field">
                          <span>Legal Owner</span>
                          <select value={legalTransferOwner} onChange={(event) => setLegalTransferOwner(event.target.value)}>
                            <option value="">Assign later</option>
                            {legalTeam.map((item) => <option key={item.user_id} value={item.user_id}>{item.name} | {item.role}</option>)}
                          </select>
                        </label>
                        <label className="field">
                          <span>Transfer Note *</span>
                          <textarea rows="3" value={legalTransferNote} onChange={(event) => setLegalTransferNote(event.target.value)} placeholder="What should legal check next for this won lead?" />
                        </label>
                        <button className="button primary" type="button" disabled={transferring || !legalTransferNote.trim()} onClick={transferLeadToLegal}>{transferring ? "Transferring..." : "Transfer to Legal"}</button>
                      </div>
                    </article>
                  ) : null}

                  {canManage ? (
                    <article className="lead-detail-card">
                      <div className="lead-detail-head"><div><span className="lead-kicker">Assignment</span><h4>Lead owner control</h4></div></div>
                      {isPlatformConsole && company === "all" ? <p className="muted">Select a company before updating ownership.</p> : team.length ? <div className="form-grid"><div className="lead-assign-row"><select value={owner} onChange={(event) => setOwner(event.target.value)}><option value="">Select lead owner</option>{team.map((item) => <option key={item.user_id} value={item.user_id}>{item.name} | {item.role}</option>)}</select><button className="button primary" type="button" disabled={assigning || !owner || owner === activeLead.assigned_to || !ownerNote.trim()} onClick={saveOwner}>{assigning ? "Saving..." : "Update Owner"}</button></div><label className="field"><span>Change Note *</span><textarea rows="3" value={ownerNote} onChange={(event) => setOwnerNote(event.target.value)} placeholder="Why are you changing the owner? This note will be saved in lead history." /></label></div> : <p className="muted">No active users available for assignment.</p>}
                    </article>
                  ) : null}

                  {activeLead.requirements ? <article className="lead-detail-card"><div className="lead-detail-head"><div><span className="lead-kicker">Requirements</span><h4>Opportunity brief</h4></div></div><p className="lead-detail-copy">{activeLead.requirements}</p></article> : null}
                  {canManage ? <article className="lead-detail-card"><div className="lead-detail-head"><div><span className="lead-kicker">Danger Zone</span><h4>Archive this lead</h4></div></div><p className="muted">This action archives the lead instead of deleting it permanently.</p><button className="button ghost lead-danger" type="button" disabled={deleting === activeLead.lead_id} onClick={() => archiveLead(activeLead.lead_id)}>{deleting === activeLead.lead_id ? "Archiving..." : "Archive Lead"}</button></article> : null}
                </>
              ) : (
                <article className="lead-detail-card lead-empty"><div className="lead-empty-icon"><DashboardIcon name="users" /></div><h3>No lead selected</h3><p>Select any lead from the roster to open the inspector.</p></article>
              )}
            </aside>
          </div>
        </section>
      ) : null}
    </DashboardShell>
  );
}
