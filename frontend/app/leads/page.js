"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
const LEAD_BACKGROUND_BATCH_SIZE = 120;
const LEAD_BACKGROUND_BATCH_DELAY_MS = 80;
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
const LEAD_PANEL_CLASS = "rounded-[30px] border border-[#eadfcd] bg-white/82 shadow-[0_14px_36px_rgba(79,58,22,0.06)]";
const LEAD_INPUT_CLASS = "w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none transition placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const LEAD_PRIMARY_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2.5 text-sm font-semibold text-[#060710] shadow-[0_16px_30px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f] disabled:cursor-not-allowed disabled:opacity-60";
const LEAD_GHOST_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710] disabled:cursor-not-allowed disabled:opacity-60";
const LEAD_KICKER_CLASS = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";
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
  const [booting, setBooting] = useState(true), [loading, setLoading] = useState(false), [pageRefreshing, setPageRefreshing] = useState(false), [backgroundSync, setBackgroundSync] = useState(false), [detailLoading, setDetailLoading] = useState(false), [assigning, setAssigning] = useState(false), [bulkAssigning, setBulkAssigning] = useState(false), [bulkImporting, setBulkImporting] = useState(false), [transferring, setTransferring] = useState(false), [deleting, setDeleting] = useState(""), [error, setError] = useState(""), [notice, setNotice] = useState(""), [ownerNote, setOwnerNote] = useState(""), [legalTransferOwner, setLegalTransferOwner] = useState(""), [legalTransferNote, setLegalTransferNote] = useState("");
  const [showBulkUpload, setShowBulkUpload] = useState(false), [bulkUploadText, setBulkUploadText] = useState(""), [bulkUploadFile, setBulkUploadFile] = useState(""), [bulkUploadReport, setBulkUploadReport] = useState(null), [refreshSeed, setRefreshSeed] = useState(0);
  const leadPageCacheRef = useRef(new Map());
  const leadFullCacheRef = useRef(new Map());
  const leadPrefetchRef = useRef({ key: "", running: false, token: 0 });
  const role = session?.user?.role || "", isPlatformConsole = ["super-admin", "platform-admin", "platform-manager"].includes(role), isSuper = role === "super-admin", canManage = MANAGER_ROLES.includes(role), canCreate = CREATE_ROLES.includes(role), canEdit = role !== "viewer";
  const scopedCompanyId = isPlatformConsole && company !== "all" ? company : undefined;
  const blankBulkSheet = useMemo(() => buildLeadBulkImportSheet({ includeSample: false }), []);
  const sampleBulkSheet = useMemo(() => buildLeadBulkImportSheet({ includeSample: true }), []);
  const quickFilter = useMemo(() => (["active", "pending", "assigned", "unassigned", "transferred"].includes(status) ? status : undefined), [status]);
  const leadQueryBase = useMemo(() => ({
    company_id: scopedCompanyId,
    search: search.trim() || undefined,
    product_id: product !== "all" ? product : undefined,
    status: quickFilter ? undefined : status,
    quick_filter: quickFilter,
  }), [scopedCompanyId, search, product, status, quickFilter]);
  const leadCacheKey = useMemo(() => JSON.stringify(leadQueryBase), [leadQueryBase]);
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

  function normalizeLeadMeta(meta = {}, pageNumber = 1) {
    return {
      page: Number(meta.page || pageNumber || 1),
      page_size: Number(meta.page_size || LEADS_PAGE_SIZE),
      total: Number(meta.total || 0),
      total_pages: Math.max(Number(meta.total_pages || 1), 1),
    };
  }

  function cacheLeadPage(cacheKey, pageNumber, items, meta) {
    const pageCache = leadPageCacheRef.current.get(cacheKey) || new Map();
    pageCache.set(pageNumber, {
      items: items || [],
      meta,
    });
    leadPageCacheRef.current.set(cacheKey, pageCache);
  }

  function getCachedLeadPage(cacheKey, pageNumber) {
    const fullCache = leadFullCacheRef.current.get(cacheKey);
    if (fullCache) {
      const startIndex = (pageNumber - 1) * LEADS_PAGE_SIZE;
      return {
        items: fullCache.items.slice(startIndex, startIndex + LEADS_PAGE_SIZE),
        meta: {
          page: pageNumber,
          page_size: LEADS_PAGE_SIZE,
          total: fullCache.total,
          total_pages: fullCache.total_pages,
        },
      };
    }

    const pageCache = leadPageCacheRef.current.get(cacheKey);
    return pageCache?.get(pageNumber) || null;
  }

  function applyLeadPage(items, meta) {
    setLeadMeta(meta);
    setLeads(items);
    setPicked((cur) => cur.filter((id) => items.some((lead) => lead.lead_id === id)));
    setSelectedId((cur) => items.some((lead) => lead.lead_id === cur) ? cur : (items[0]?.lead_id || ""));
  }

  async function prefetchLeadPage(token, cacheKey, pageNumber, totalPages) {
    if (!token || !pageNumber || pageNumber < 1 || pageNumber > totalPages || getCachedLeadPage(cacheKey, pageNumber)) {
      return;
    }

    const response = await apiRequest(qp("/leads", {
      page: pageNumber,
      page_size: LEADS_PAGE_SIZE,
      ...leadQueryBase,
    }), { token });
    cacheLeadPage(cacheKey, pageNumber, response.items || [], normalizeLeadMeta(response.meta, pageNumber));
  }

  function startBackgroundLeadSync(token, cacheKey, total) {
    if (!token || !total || total <= LEADS_PAGE_SIZE || leadFullCacheRef.current.has(cacheKey)) {
      return;
    }

    if (leadPrefetchRef.current.running && leadPrefetchRef.current.key === cacheKey) {
      return;
    }

    leadPrefetchRef.current = {
      key: cacheKey,
      running: true,
      token: leadPrefetchRef.current.token + 1,
    };
    const syncToken = leadPrefetchRef.current.token;
    setBackgroundSync(true);

    (async () => {
      const batchPages = Math.max(Math.ceil(total / LEAD_BACKGROUND_BATCH_SIZE), 1);
      const allItems = [];

      for (let batchPage = 1; batchPage <= batchPages; batchPage += 1) {
        if (leadPrefetchRef.current.token !== syncToken || leadPrefetchRef.current.key !== cacheKey) {
          return;
        }

        if (batchPage > 1) {
          await new Promise((resolve) => setTimeout(resolve, LEAD_BACKGROUND_BATCH_DELAY_MS));
        }

        const response = await apiRequest(qp("/leads", {
          page: batchPage,
          page_size: LEAD_BACKGROUND_BATCH_SIZE,
          full_fetch: 1,
          ...leadQueryBase,
        }), { token });

        if (leadPrefetchRef.current.token !== syncToken || leadPrefetchRef.current.key !== cacheKey) {
          return;
        }

        allItems.push(...(response.items || []));
      }

      leadFullCacheRef.current.set(cacheKey, {
        items: allItems,
        total,
        total_pages: Math.max(Math.ceil(total / LEADS_PAGE_SIZE), 1),
      });
    })()
      .catch(() => {})
      .finally(() => {
        if (leadPrefetchRef.current.token === syncToken && leadPrefetchRef.current.key === cacheKey) {
          leadPrefetchRef.current.running = false;
          setBackgroundSync(false);
        }
      });
  }

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
      const cachedLeadPage = getCachedLeadPage(leadCacheKey, page);
      if (cachedLeadPage) {
        applyLeadPage(cachedLeadPage.items || [], cachedLeadPage.meta);
        setLoading(false);
        setPageRefreshing(false);
        prefetchLeadPage(session.token, leadCacheKey, page + 1, cachedLeadPage.meta.total_pages);
        startBackgroundLeadSync(session.token, leadCacheKey, cachedLeadPage.meta.total);
        return;
      }

      setPageRefreshing(true);
      if (!leads.length) {
        setLoading(true);
      }
      setError("");
      try {
        const leadRes = await apiRequest(qp("/leads", {
          page,
          page_size: LEADS_PAGE_SIZE,
          ...leadQueryBase,
        }), { token: session.token });
        if (ignore) return;
        const nextMeta = normalizeLeadMeta(leadRes.meta, page);
        if (nextMeta.total_pages && page > nextMeta.total_pages) {
          setLeadMeta(nextMeta);
          setPage(nextMeta.total_pages);
          return;
        }
        const items = leadRes.items || [];
        cacheLeadPage(leadCacheKey, page, items, nextMeta);
        applyLeadPage(items, nextMeta);
        prefetchLeadPage(session.token, leadCacheKey, page + 1, nextMeta.total_pages);
        startBackgroundLeadSync(session.token, leadCacheKey, nextMeta.total);
      } catch (e) { if (!ignore) { setError(e.message); if (!leads.length) { setLeads([]); setLeadMeta({ page: 1, page_size: LEADS_PAGE_SIZE, total: 0, total_pages: 1 }); } } } finally { if (!ignore) { setLoading(false); setPageRefreshing(false); } }
    })();
    return () => { ignore = true; };
  }, [session, leadCacheKey, leadQueryBase, page, refreshSeed]);

  useEffect(() => { setPage(1); }, [search, status, product, company]);

  useEffect(() => {
    leadPrefetchRef.current = {
      key: "",
      running: false,
      token: leadPrefetchRef.current.token + 1,
    };
    setBackgroundSync(false);
  }, [leadCacheKey]);

  useEffect(() => {
    leadPageCacheRef.current.clear();
    leadFullCacheRef.current.clear();
    leadPrefetchRef.current = {
      key: "",
      running: false,
      token: leadPrefetchRef.current.token + 1,
    };
    setBackgroundSync(false);
  }, [refreshSeed]);

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
  const ownershipLabel = ["sales", "marketing"].includes(role) ? "Assigned to you" : isPlatformConsole ? company === "all" ? isSuper ? "Cross-tenant" : "Assigned companies" : "Single tenant" : "Tenant-wide";
  const closedWonCount = status === "closed-won" ? totalMatched : leads.filter((lead) => lead.status === "closed-won").length;
  const transferredCount = status === "transferred" ? totalMatched : leads.filter((lead) => ["legal", "finance", "completed"].includes(lead.workflow_stage || "sales")).length;
  const legalTeam = team.filter((user) => user.role === "legal-team");
  const canTransferActiveLead = Boolean(activeLead?.can_transfer_to_legal) && ["super-admin", "platform-admin", "platform-manager", "admin", "manager", "sales"].includes(role);
  const heroStats = useMemo(() => [{ label: "Matched Leads", value: totalMatched }, { label: "Page Value", value: money(leads.reduce((s, lead) => s + Number(lead.estimated_value || 0), 0)), color: "#0f8c53" }, { label: "Loaded", value: leads.length, color: "#2f6fdd" }, { label: "Closed Won", value: closedWonCount, color: "#0f8c53" }], [closedWonCount, leads, totalMatched]);
  const showBlockingLoader = booting || (loading && !leads.length && !totalMatched);
  const personalScope = ["sales", "marketing"].includes(role);
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
    <DashboardShell session={session} title={["sales", "marketing"].includes(role) ? "My Leads" : "Lead Pipeline"} eyebrow={isPlatformConsole ? `Platform · ${isSuper ? "All Tenants" : "Assigned Companies"}` : "Sales Workspace"} hideTitle>
      {error ? <div className="alert error">{error}</div> : null}
      {!error && notice ? <div className="alert">{notice}</div> : null}
      {showBlockingLoader ? <div className="alert">Loading leads workspace...</div> : null}
      {!booting && (!loading || leads.length || totalMatched) ? (
        <section className="lead-board-shell">
          <article className="rounded-[34px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.92),_rgba(247,240,227,0.96)_42%,_rgba(241,232,215,1)_100%)] p-5 shadow-[0_22px_60px_rgba(79,58,22,0.08)] md:p-7">
            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                    Lead Workspace
                  </span>
                  <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                    {ownershipLabel}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {heroStats.map((item, index) => (
                    <article
                      key={item.label}
                      className={`rounded-[24px] border border-[#eadfcd] p-4 shadow-[0_12px_28px_rgba(79,58,22,0.05)] ${
                        index === 0 ? "bg-[#fff6e4]" : "bg-white/82"
                      }`}
                    >
                      <p className={LEAD_KICKER_CLASS}>{item.label}</p>
                      <p className="mt-4 text-2xl font-semibold tracking-tight" style={{ color: item.color || "#060710" }}>
                        {item.value}
                      </p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="space-y-4 xl:justify-self-end xl:w-full xl:max-w-[560px]">
                <label className="flex items-center gap-2 rounded-[22px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#6f614c] shadow-[0_10px_22px_rgba(79,58,22,0.05)]">
                  <DashboardIcon name="leads" className="h-4 w-4 text-[#8f816a]" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search company, contact, email, phone, source, owner"
                    className="w-full border-0 bg-transparent p-0 text-sm text-[#060710] outline-none placeholder:text-[#9c8e76]"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {isPlatformConsole ? (
                    <label className="space-y-2">
                      <span className={LEAD_KICKER_CLASS}>Tenant</span>
                      <select className={LEAD_INPUT_CLASS} value={company} onChange={(event) => setCompany(event.target.value)}>
                        <option value="all">All Companies</option>
                        {companies.map((item) => <option key={item.company_id} value={item.company_id}>{item.name}</option>)}
                      </select>
                    </label>
                  ) : null}
                  <label className="space-y-2">
                    <span className={LEAD_KICKER_CLASS}>Status</span>
                    <select className={LEAD_INPUT_CLASS} value={status} onChange={(event) => setStatus(event.target.value)}>
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
                  <label className="space-y-2">
                    <span className={LEAD_KICKER_CLASS}>Product</span>
                    <select className={LEAD_INPUT_CLASS} value={product} onChange={(event) => setProduct(event.target.value)}>
                      <option value="all">All Products</option>
                      {products.map((item) => <option key={item.value} value={item.value}>{item.label} ({item.count})</option>)}
                    </select>
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  {canCreate ? <Link href="/leads/new" className={LEAD_PRIMARY_BUTTON_CLASS}><DashboardIcon name="leads" className="h-4 w-4" />Create Lead</Link> : null}
                  {canCreate ? <button className={LEAD_GHOST_BUTTON_CLASS} type="button" onClick={() => setShowBulkUpload((current) => !current)}><DashboardIcon name="analytics" className="h-4 w-4" />{showBulkUpload ? "Hide Bulk Upload" : "Bulk Upload"}</button> : null}
                  <Link href="/leads/history" className={LEAD_GHOST_BUTTON_CLASS}><DashboardIcon name="analytics" className="h-4 w-4" />Lead History</Link>
                </div>
              </div>
            </div>
          </article>

          {canCreate && showBulkUpload ? (
            <article className={`${LEAD_PANEL_CLASS} overflow-hidden p-5 md:p-6`}>
              <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
                <div className="space-y-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <span className="inline-flex rounded-full border border-[#ddd3c2] bg-[#fff6e4] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                        Bulk Upload
                      </span>
                      <div>
                        <h3 className="text-2xl font-semibold tracking-tight text-[#060710]">
                          Import leads with the same fields used in Add Lead
                        </h3>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-[#746853]">
                          Paste tab-separated rows or upload a text, TSV, or CSV file in the exact {BULK_IMPORT_COLUMNS.length}-column order.
                          Legal transfer, finance transfer, and auto-import notes are not part of this sheet.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <label className={LEAD_GHOST_BUTTON_CLASS}>
                        <DashboardIcon name="products" className="h-4 w-4" />
                        {bulkUploadFile ? `File: ${bulkUploadFile}` : "Choose File"}
                        <input type="file" accept=".txt,.tsv,.csv" onChange={handleBulkFileChange} hidden />
                      </label>
                      <button
                        className={LEAD_GHOST_BUTTON_CLASS}
                        type="button"
                        onClick={() => downloadBulkTemplate("greencrm-lead-template.csv", blankBulkSheet)}
                      >
                        <DashboardIcon name="message" className="h-4 w-4" />
                        Download Blank Sheet
                      </button>
                      <button
                        className={LEAD_GHOST_BUTTON_CLASS}
                        type="button"
                        onClick={() => downloadBulkTemplate("greencrm-lead-sample.csv", sampleBulkSheet)}
                      >
                        <DashboardIcon name="analytics" className="h-4 w-4" />
                        Download Sample Sheet
                      </button>
                    </div>
                  </div>

                  <label className="space-y-2">
                    <span className={LEAD_KICKER_CLASS}>Paste Lead Rows</span>
                    <textarea
                      rows="10"
                      value={bulkUploadText}
                      onChange={(event) => setBulkUploadText(event.target.value)}
                      placeholder="Paste rows here in the same order as the table on the right..."
                      className={`${LEAD_INPUT_CLASS} min-h-[240px] resize-y`}
                    />
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full border border-[#ddd3c2] bg-[#fff6e4] px-3 py-1 text-[11px] font-bold text-[#7a6230]">
                      {bulkUploadPreview.rowCount || 0} rows ready
                    </span>
                    <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                      {bulkUploadPreview.hasHeader ? "Template header detected" : "Header optional"}
                    </span>
                    <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                      {bulkUploadPreview.delimiter === "tab" ? "Tab-separated format" : "CSV format"}
                    </span>
                    <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                      Max {BULK_IMPORT_MAX_ROWS} rows
                    </span>
                  </div>

                  {bulkUploadPreview.error ? (
                    <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                      {bulkUploadPreview.error}
                    </div>
                  ) : null}

                  {bulkUploadPreview.preview ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        { label: "Company Code", value: bulkUploadPreview.preview.company_id || "--" },
                        { label: "Product Code", value: bulkUploadPreview.preview.product_id || "--" },
                        { label: "Contact", value: bulkUploadPreview.preview.contact_person || "--" },
                        { label: "Company Name", value: bulkUploadPreview.preview.company_name || "--" },
                      ].map((item) => (
                        <div key={item.label} className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9a886d]">{item.label}</p>
                          <p className="mt-3 text-sm font-semibold text-[#060710]">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {bulkUploadReport ? (
                    <div className="rounded-[26px] border border-[#eadfcd] bg-[#fffaf1] p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <strong className="text-base font-semibold text-[#060710]">{bulkUploadReport.imported} imported</strong>
                        <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                          {bulkUploadReport.failed || 0} failed
                        </span>
                      </div>
                      {bulkUploadReport.errors?.length ? (
                        <div className="mt-4 space-y-2">
                          {bulkUploadReport.errors.slice(0, 6).map((item) => (
                            <div key={`${item.row}-${item.message}`} className="rounded-[18px] border border-rose-200 bg-white px-4 py-3">
                              <strong className="block text-sm font-semibold text-[#060710]">Row {item.row}</strong>
                              <span className="mt-1 block text-sm text-[#7a6b57]">{item.message}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[28px] border border-[#eadfcd] bg-[#fffaf1] p-5 shadow-[0_14px_36px_rgba(79,58,22,0.05)]">
                  <div className="space-y-3">
                    <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                      Sheet Template
                    </span>
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight text-[#060710]">Simple Add Lead sheet</h3>
                      <p className="mt-2 text-sm leading-7 text-[#746853]">
                        Ye plain sheet sirf wahi fields rakhti hai jo Add Lead form me dikhte hain. Extra transfer aur note columns hata diye gaye hain.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button className={LEAD_GHOST_BUTTON_CLASS} type="button" onClick={() => loadBulkTemplate(blankBulkSheet, "Blank sheet template")}>
                      Use Blank Sheet
                    </button>
                    <button className={LEAD_GHOST_BUTTON_CLASS} type="button" onClick={() => loadBulkTemplate(sampleBulkSheet, "Sample sheet template")}>
                      Use Sample Sheet
                    </button>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-[24px] border border-[#eadfcd] bg-white">
                    <div className="max-h-[420px] overflow-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="sticky top-0 bg-[#fbf6ec] text-[10px] font-bold uppercase tracking-[0.22em] text-[#8f816a]">
                          <tr>
                            <th className="px-4 py-3">Column</th>
                            <th className="px-4 py-3">Label</th>
                            <th className="px-4 py-3">Required</th>
                            <th className="px-4 py-3">Example</th>
                            <th className="px-4 py-3">Use</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f0e8da]">
                          {BULK_IMPORT_FIELDS.map((item) => (
                            <tr key={item.key} className="align-top">
                              <td className="px-4 py-3 text-[#060710]"><code>{item.key}</code></td>
                              <td className="px-4 py-3 font-medium text-[#060710]">{item.label}</td>
                              <td className="px-4 py-3 text-[#7a6b57]">{item.required}</td>
                              <td className="px-4 py-3 text-[#7a6b57]">{item.example || "--"}</td>
                              <td className="px-4 py-3 text-[#7a6b57]">{item.note}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-[#8f816a]">
                    Keep the exact order shown in this table. Max {BULK_IMPORT_MAX_ROWS} rows in one upload.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-3">
                <button className={LEAD_GHOST_BUTTON_CLASS} type="button" onClick={resetBulkUploadPanel}>
                  Clear Upload
                </button>
                <button
                  className={LEAD_PRIMARY_BUTTON_CLASS}
                  type="button"
                  onClick={submitBulkUpload}
                  disabled={bulkImporting || !bulkUploadPreview.rowCount || Boolean(bulkUploadPreview.error)}
                >
                  {bulkImporting ? "Uploading..." : `Upload ${bulkUploadPreview.rowCount || 0} Leads`}
                </button>
              </div>
            </article>
          ) : null}

          <article className={`${LEAD_PANEL_CLASS} p-5 md:p-6`}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex rounded-full border border-[#ddd3c2] bg-[#fff6e4] px-3 py-1 text-[11px] font-bold text-[#7a6230]">
                  {totalMatched} leads matched
                </span>
                <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                  {ownershipLabel}
                </span>
                {pageRefreshing ? <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">Updating page</span> : null}
                {backgroundSync ? <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">Syncing roster</span> : null}
                <button className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${status === "closed-won" ? "border-[#d7b258] bg-[#fff2cf] text-[#7a6230]" : "border-[#eadfcd] bg-white text-[#7c6d55]"}`} type="button" onClick={() => { setStatus("closed-won"); setPage(1); }}>
                  Closed Won {closedWonCount}
                </button>
                <button className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${status === "transferred" ? "border-[#d7b258] bg-[#fff2cf] text-[#7a6230]" : "border-[#eadfcd] bg-white text-[#7c6d55]"}`} type="button" onClick={() => { setStatus("transferred"); setPage(1); }}>
                  Transferred {transferredCount}
                </button>
              </div>

              <div className="flex justify-end">
                <button className={LEAD_GHOST_BUTTON_CLASS} type="button" onClick={() => { setSearch(""); setStatus("all"); setProduct("all"); if (isPlatformConsole) setCompany("all"); setPage(1); }}>
                  Reset Filters
                </button>
              </div>
            </div>
          </article>

          {canManage && picked.length ? (
            <article className={`${LEAD_PANEL_CLASS} bg-[#fffaf1] p-5 md:p-6`}>
              <div className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr] xl:items-start">
                <div className="space-y-3">
                  <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                    Bulk Assign
                  </span>
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight text-[#060710]">{picked.length} selected leads ready</h3>
                    <p className="mt-2 text-sm leading-7 text-[#746853]">
                      Choose the new owner and log one note for this reassignment so the history stays clean.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
                    <label className="space-y-2">
                      <span className={LEAD_KICKER_CLASS}>New Owner</span>
                      <select className={LEAD_INPUT_CLASS} value={bulkOwner} onChange={(event) => setBulkOwner(event.target.value)}>
                        <option value="">{isSuper && company === "all" ? "Choose a company first" : "Assign selected leads to..."}</option>
                        {team.map((item) => <option key={item.user_id} value={item.user_id}>{item.name} | {item.role}</option>)}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className={LEAD_KICKER_CLASS}>Assignment Note *</span>
                      <textarea
                        rows="3"
                        value={bulkNote}
                        onChange={(event) => setBulkNote(event.target.value)}
                        placeholder="Why are these selected leads being reassigned?"
                        className={`${LEAD_INPUT_CLASS} min-h-[120px] resize-y`}
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      className={LEAD_GHOST_BUTTON_CLASS}
                      type="button"
                      onClick={() => { setPicked([]); setBulkOwner(""); setBulkNote(""); }}
                    >
                      Clear
                    </button>
                    <button
                      className={LEAD_PRIMARY_BUTTON_CLASS}
                      type="button"
                      onClick={bulkAssign}
                      disabled={bulkAssigning || !bulkOwner || !bulkNote.trim() || (isPlatformConsole && company === "all")}
                    >
                      {bulkAssigning ? "Assigning..." : "Assign Selected"}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ) : null}

          <div className="space-y-5">
            <article className={`${LEAD_PANEL_CLASS} overflow-hidden p-5 md:p-6`}>
              <div className="flex flex-col gap-3 border-b border-[#efe6d8] pb-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className={LEAD_KICKER_CLASS}>Roster</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Lead list</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                    Page {Math.min(page, pages)} of {pages}
                  </span>
                  {canManage && rows.length ? (
                    <label className="inline-flex items-center gap-2 rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                      <input
                        type="checkbox"
                        checked={allPicked}
                        onChange={() => setPicked(allPicked ? [] : rows.map((lead) => lead.lead_id))}
                        className="h-4 w-4 rounded border-[#d9ccb8] text-[#cba952] focus:ring-[#f3dfab]"
                      />
                      <span>Select page</span>
                    </label>
                  ) : null}
                  {canManage && picked.length ? (
                    <span className="inline-flex rounded-full border border-[#ddd3c2] bg-[#fff6e4] px-3 py-1 text-[11px] font-bold text-[#7a6230]">
                      {picked.length} selected
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {rows.length ? rows.map((lead) => {
                  const s = STATUS[lead.status] || STATUS.new;
                  const p = PRIORITY[lead.priority] || PRIORITY.medium;
                  const primaryName = leadPrimaryName(lead);
                  const secondaryName = leadSecondaryName(lead);
                  const noteCount = Number(lead.note_count || 0);
                  const selectedRow = selectedId === lead.lead_id;
                  const selectedLead = selectedRow && activeLead?.lead_id === lead.lead_id ? activeLead : lead;
                  const canTransferRow = selectedRow && canTransferActiveLead && activeLead?.lead_id === lead.lead_id;
                  return (
                    <article
                      key={lead.lead_id}
                      className={`rounded-[28px] border p-4 transition ${
                        selectedRow
                          ? "border-[#d7b258] bg-[#fff8e9] shadow-[0_16px_32px_rgba(203,169,82,0.14)]"
                          : "border-[#eadfcd] bg-white/88 shadow-[0_10px_24px_rgba(79,58,22,0.05)] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(79,58,22,0.08)]"
                      }`}
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
                        <div className="flex flex-1 gap-3">
                          {canManage ? (
                            <label className="pt-1">
                              <input
                                type="checkbox"
                                checked={picked.includes(lead.lead_id)}
                                onChange={() => setPicked((cur) => cur.includes(lead.lead_id) ? cur.filter((id) => id !== lead.lead_id) : [...cur, lead.lead_id])}
                                className="h-4 w-4 rounded border-[#d9ccb8] text-[#cba952] focus:ring-[#f3dfab]"
                              />
                            </label>
                          ) : null}

                          <button className="flex flex-1 items-start gap-4 text-left" type="button" onClick={() => setSelectedId(lead.lead_id)}>
                            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-[#10111d] text-lg font-bold text-white shadow-[0_18px_30px_rgba(6,7,16,0.16)]">
                              {initials(lead.contact_person, lead.company_name, lead.email)}
                            </div>
                            <div className="min-w-0 flex-1 space-y-3">
                              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                                <div className="min-w-0 space-y-2">
                                  <div className="flex flex-wrap gap-2">
                                    {lead.product_name ? (
                                      <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fff6e4] px-3 py-1 text-[11px] font-bold text-[#7a6230]">
                                        {lead.product_name}
                                      </span>
                                    ) : null}
                                    {noteCount ? (
                                      <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                                        {noteCount} {noteCount === 1 ? "note" : "notes"}
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="truncate text-lg font-semibold text-[#060710]">{primaryName}</h4>
                                    {secondaryName ? <p className="mt-1 text-sm text-[#746853]">{secondaryName}</p> : null}
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: s[0], color: s[1] }}>
                                    {nice(lead.status)}
                                  </span>
                                  <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: p[0], color: p[1] }}>
                                    {nice(lead.priority || "medium")}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#7a6b57]">
                                <span>{lead.contact_person || "--"}</span>
                                <span>{lead.email || "No email"}</span>
                                <span>{lead.phone || "No phone"}</span>
                                {lead.address_city ? <span>{lead.address_city}</span> : null}
                              </div>

                              <div className="grid gap-2 text-xs text-[#8f816a] sm:grid-cols-2 xl:grid-cols-4">
                                <span>Source: {nice(lead.lead_source || "website")}</span>
                                <span>Value: {money(lead.estimated_value)}</span>
                                <span>Created: {when(lead.created_at)}</span>
                                <span>By: {lead.created_by_name || "Unknown"}</span>
                              </div>

                              {lead.latest_note ? (
                                <div className="rounded-[20px] border border-[#efe2c8] bg-[#fffaf1] px-4 py-3 text-sm text-[#6f614c]">
                                  <strong className="font-semibold text-[#060710]">Latest note:</strong> {lead.latest_note}
                                </div>
                              ) : lead.requirements ? (
                                <div className="rounded-[20px] border border-[#efe2c8] bg-[#fffaf1] px-4 py-3 text-sm text-[#6f614c]">
                                  <strong className="font-semibold text-[#060710]">Brief:</strong> {lead.requirements}
                                </div>
                              ) : null}
                            </div>
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-3 xl:min-w-[180px] xl:flex-col xl:items-end">
                          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${lead.assigned_to ? "border-[#dce8cf] bg-[#eff9e9] text-[#2a7f43]" : "border-[#eadfcd] bg-white text-[#7c6d55]"}`}>
                            <DashboardIcon name="user" className="h-4 w-4" />
                            <span>{lead.assigned_to_name || "Unassigned"}</span>
                          </div>
                          {selectedRow && detailLoading ? (
                            <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                              Refreshing...
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {selectedRow ? (
                        <div className="mt-5 space-y-4 border-t border-[#efe6d8] pt-5">
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {[
                              { label: "Owner", value: selectedLead.assigned_to_name || "Unassigned" },
                              { label: "Source", value: nice(selectedLead.lead_source || "website") },
                              { label: "Follow Up", value: when(selectedLead.follow_up_date, true) },
                              { label: "Estimated Value", value: money(selectedLead.estimated_value) },
                              { label: "Created", value: when(selectedLead.created_at, true) },
                              { label: "Workflow", value: nice(selectedLead.workflow_stage || "sales") },
                              { label: "Created By", value: selectedLead.created_by_name || "Unknown" },
                              { label: "Location", value: [selectedLead.address_city, selectedLead.address_state, selectedLead.address_country].filter(Boolean).join(", ") || "Not added" },
                            ].map((item) => (
                              <div key={item.label} className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8f816a]">{item.label}</p>
                                <p className="mt-3 text-sm font-semibold text-[#060710]">{item.value}</p>
                              </div>
                            ))}
                          </div>

                          {selectedLead.latest_note ? (
                            <div className="rounded-[22px] border border-[#efe2c8] bg-[#fffaf1] px-4 py-4 text-sm text-[#6f614c]">
                              <strong className="font-semibold text-[#060710]">Latest note:</strong> {selectedLead.latest_note}
                            </div>
                          ) : null}

                          {selectedLead.requirements ? (
                            <div className="rounded-[22px] border border-[#efe2c8] bg-[#fffaf1] px-4 py-4 text-sm text-[#6f614c]">
                              <strong className="font-semibold text-[#060710]">Requirements:</strong> {selectedLead.requirements}
                            </div>
                          ) : null}

                          <div className="flex flex-wrap gap-3">
                            <Link href={`/leads/${selectedLead.lead_id}`} className={LEAD_GHOST_BUTTON_CLASS}>
                              View Lead
                            </Link>
                            {canEdit ? <Link href={`/leads/${selectedLead.lead_id}/edit`} className={LEAD_GHOST_BUTTON_CLASS}>Edit Lead</Link> : null}
                          </div>

                          {canTransferRow ? (
                            <div className="rounded-[24px] border border-[#dce8cf] bg-[#f5fbf0] p-4">
                              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                <div>
                                  <p className={LEAD_KICKER_CLASS}>Closed Won</p>
                                  <h4 className="mt-2 text-lg font-semibold text-[#060710]">Transfer this lead to legal</h4>
                                </div>
                                <div className="grid gap-3 xl:min-w-[420px] xl:grid-cols-[0.9fr_1.1fr_auto]">
                                  <label className="space-y-2">
                                    <span className={LEAD_KICKER_CLASS}>Legal Owner</span>
                                    <select className={LEAD_INPUT_CLASS} value={legalTransferOwner} onChange={(event) => setLegalTransferOwner(event.target.value)}>
                                      <option value="">Assign later</option>
                                      {legalTeam.map((item) => <option key={item.user_id} value={item.user_id}>{item.name} | {item.role}</option>)}
                                    </select>
                                  </label>
                                  <label className="space-y-2">
                                    <span className={LEAD_KICKER_CLASS}>Transfer Note *</span>
                                    <textarea
                                      rows="3"
                                      value={legalTransferNote}
                                      onChange={(event) => setLegalTransferNote(event.target.value)}
                                      placeholder="What should legal check next for this won lead?"
                                      className={`${LEAD_INPUT_CLASS} min-h-[120px] resize-y`}
                                    />
                                  </label>
                                  <div className="flex items-end">
                                    <button className={LEAD_PRIMARY_BUTTON_CLASS} type="button" disabled={transferring || !legalTransferNote.trim()} onClick={transferLeadToLegal}>
                                      {transferring ? "Transferring..." : "Transfer to Legal"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {canManage ? (
                            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                              <div className="rounded-[24px] border border-[#eadfcd] bg-white p-4">
                                <p className={LEAD_KICKER_CLASS}>Assignment</p>
                                <h4 className="mt-2 text-lg font-semibold text-[#060710]">Lead owner control</h4>
                                {isPlatformConsole && company === "all" ? (
                                  <p className="mt-4 text-sm text-[#7a6b57]">Select a company before updating ownership.</p>
                                ) : team.length ? (
                                  <div className="mt-4 grid gap-4">
                                    <label className="space-y-2">
                                      <span className={LEAD_KICKER_CLASS}>Lead Owner</span>
                                      <select className={LEAD_INPUT_CLASS} value={owner} onChange={(event) => setOwner(event.target.value)}>
                                        <option value="">Select lead owner</option>
                                        {team.map((item) => <option key={item.user_id} value={item.user_id}>{item.name} | {item.role}</option>)}
                                      </select>
                                    </label>
                                    <label className="space-y-2">
                                      <span className={LEAD_KICKER_CLASS}>Change Note *</span>
                                      <textarea
                                        rows="3"
                                        value={ownerNote}
                                        onChange={(event) => setOwnerNote(event.target.value)}
                                        placeholder="Why are you changing the owner?"
                                        className={`${LEAD_INPUT_CLASS} min-h-[120px] resize-y`}
                                      />
                                    </label>
                                    <div className="flex justify-end">
                                      <button
                                        className={LEAD_PRIMARY_BUTTON_CLASS}
                                        type="button"
                                        disabled={assigning || !owner || owner === selectedLead.assigned_to || !ownerNote.trim()}
                                        onClick={saveOwner}
                                      >
                                        {assigning ? "Saving..." : "Update Owner"}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="mt-4 text-sm text-[#7a6b57]">No active users available for assignment.</p>
                                )}
                              </div>

                              <div className="rounded-[24px] border border-rose-200 bg-white p-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-rose-500">Danger Zone</p>
                                <h4 className="mt-2 text-lg font-semibold text-[#060710]">Archive this lead</h4>
                                <p className="mt-3 text-sm leading-7 text-[#6f614c]">
                                  This action archives the lead instead of deleting it permanently.
                                </p>
                                <div className="mt-5">
                                  <button
                                    className="inline-flex min-h-[46px] items-center justify-center rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    type="button"
                                    disabled={deleting === selectedLead.lead_id}
                                    onClick={() => archiveLead(selectedLead.lead_id)}
                                  >
                                    {deleting === selectedLead.lead_id ? "Archiving..." : "Archive Lead"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                }) : (
                  <div className="rounded-[28px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-14 text-center">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-[20px] bg-white text-[#8d6e27] shadow-[0_12px_24px_rgba(79,58,22,0.08)]">
                      <DashboardIcon name="leads" className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-[#060710]">No leads matched</h3>
                    <p className="mt-2 text-sm text-[#7a6b57]">Adjust the search or filters to widen the result set.</p>
                  </div>
                )}
              </div>

              {totalMatched > leadMeta.page_size ? (
                <div className="mt-5 flex flex-col gap-3 border-t border-[#efe6d8] pt-5 md:flex-row md:items-center md:justify-between">
                  <span className="text-sm text-[#7a6b57]">
                    {totalMatched ? (page - 1) * leadMeta.page_size + 1 : 0}-{Math.min(page * leadMeta.page_size, totalMatched)} of {totalMatched}
                  </span>
                  <div className="flex flex-wrap gap-3">
                    <button className={LEAD_GHOST_BUTTON_CLASS} type="button" disabled={page === 1} onClick={() => setPage((cur) => Math.max(1, cur - 1))}>
                      Previous
                    </button>
                    <button className={LEAD_PRIMARY_BUTTON_CLASS} type="button" disabled={page === pages} onClick={() => setPage((cur) => Math.min(pages, cur + 1))}>
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          </div>
        </section>
      ) : null}
    </DashboardShell>
  );
}
