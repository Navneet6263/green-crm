"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";
import {
  formatScopedError, isPlatformConsoleRole, loadProductsForScope,
  loadTeamScopeResources, resolveInitialTeamId, resolveScopedCompanyId,
  shouldShowTeamSelector, teamSelectionRequiredMessage,
} from "../../../lib/teamScope";

export const draft = (v = {}) => ({ name: "", color: "#009a8c", is_active: true, team_id: "", ...v });
export const hex = (v, f = "#009a8c") => (/^#[0-9a-f]{6}$/i.test(String(v || "").trim()) ? String(v).toLowerCase() : f);
export const isActive = (v) => v === true || v === 1 || v === "1";

/** Everything the Products page loads and changes: catalog, lead counts, teams and the two forms. */
export function useProducts() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [teams, setTeams] = useState([]);
  const [products, setProducts] = useState([]);
  const [leadCounts, setLeadCounts] = useState({});
  const [selectedId, setSelectedId] = useState("");
  const [createForm, setCreateForm] = useState(draft());
  const [editForm, setEditForm] = useState(draft());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mappedTeamIds, setMappedTeamIds] = useState([]);
  const [savingMappings, setSavingMappings] = useState(false);

  const role = session?.user?.role || "";
  const isPlatformConsole = isPlatformConsoleRole(role);
  const scopedCompanyId = resolveScopedCompanyId(session, companyId);
  const selectedProduct = useMemo(() => products.find((p) => p.product_id === selectedId) || null, [products, selectedId]);
  const canEditSelected = selectedProduct?.can_manage !== false;
  const canMapTeams = ["super-admin", "platform-admin", "platform-manager", "admin"].includes(role);
  const teamSelectorVisible = shouldShowTeamSelector(role, teams);
  const createTeamPending = teamSelectorVisible && !createForm.team_id;
  const editTeamPending = teamSelectorVisible && Boolean(selectedProduct) && !editForm.team_id;

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (statusFilter === "active" && !isActive(p.is_active)) return false;
      if (statusFilter === "archived" && isActive(p.is_active)) return false;
      return !q || [p.name, p.product_id, p.color, p.team_name].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [products, search, statusFilter]);

  const stats = useMemo(() => ({
    total: products.length,
    active: products.filter((p) => isActive(p.is_active)).length,
    archived: products.filter((p) => !isActive(p.is_active)).length,
    totalLeads: Object.values(leadCounts).reduce((s, v) => s + v, 0),
  }), [products, leadCounts]);

  async function loadProducts(s, cid) {
    if (isPlatformConsole && !cid) { setProducts([]); setLoading(false); return; }
    setLoading(true);
    try {
      const items = await loadProductsForScope(s.token, { companyId: cid, pageSize: 120 });
      setProducts(items);
      // Lead counts are a nice-to-have; the list shows even if they fail.
      try {
        const counts = {};
        await Promise.all(items.map(async (p) => {
          const r = await apiRequest(`/leads?product_id=${p.product_id}&page_size=1`, { token: s.token });
          counts[p.product_id] = Number(r.meta?.total || r.items?.length || 0);
        }));
        setLeadCounts(counts);
      } catch (_) {}
    } catch (e) { setProducts([]); setError(formatScopedError(e, "Could not load products.")); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const s = loadSession();
    if (!s) return router.replace("/login");
    if (!["super-admin", "platform-admin", "platform-manager", "admin", "manager"].includes(s.user?.role)) return router.replace("/dashboard");
    setSession(s);
    if (isPlatformConsoleRole(s.user?.role)) {
      apiRequest("/companies?page_size=120", { token: s.token }).then((r) => {
        const items = r.items || [];
        setCompanies(items);
        setCompanyId(s.company?.company_id || s.user?.company_id || items[0]?.company_id || "");
      }).catch((e) => setError(formatScopedError(e, "Could not load companies.")));
    }
  }, [router]);

  useEffect(() => { if (session) loadProducts(session, scopedCompanyId); }, [isPlatformConsole, scopedCompanyId, session]);

  useEffect(() => {
    let ignore = false;
    async function loadTeams() {
      if (!session?.token || !scopedCompanyId) { setTeams([]); return; }
      try {
        const { teams: t, teamId } = await loadTeamScopeResources(session.token, { companyId: scopedCompanyId });
        if (ignore) return;
        setTeams(t);
        setCreateForm((f) => ({ ...f, team_id: resolveInitialTeamId(t, f.team_id || teamId) }));
      } catch (_) { if (!ignore) setTeams([]); }
    }
    loadTeams();
    return () => { ignore = true; };
  }, [scopedCompanyId, session]);

  useEffect(() => {
    if (selectedId && !products.some((p) => p.product_id === selectedId)) setSelectedId("");
  }, [products, selectedId]);

  useEffect(() => {
    if (selectedProduct) setEditForm(draft({ name: selectedProduct.name || "", color: hex(selectedProduct.color), is_active: isActive(selectedProduct.is_active), team_id: resolveInitialTeamId(teams, selectedProduct.team_id) }));
    setMappedTeamIds(selectedProduct?.mapped_team_ids || []);
  }, [selectedProduct, teams]);

  async function saveTeamMappings(e) {
    e.preventDefault();
    if (!canMapTeams || !selectedProduct?.team_id || savingMappings) return;
    setSavingMappings(true); setError(""); setNotice("");
    try {
      await apiRequest(`/products/${selectedProduct.product_id}/teams`, { method: "PUT", token: session.token, body: { team_ids: mappedTeamIds } });
      await loadProducts(session, scopedCompanyId);
      setNotice("Team sharing saved. Leads and customers stay private to their own teams.");
    } catch (err) { setError(formatScopedError(err, "Could not save product team mapping.")); }
    finally { setSavingMappings(false); }
  }

  /** Returns the new product id, or "" when it failed. */
  async function createProduct(e) {
    e.preventDefault();
    if (!session?.token) return "";
    if (isPlatformConsole && !scopedCompanyId) { setError("Choose a company first."); return ""; }
    if (createTeamPending) { setError(teamSelectionRequiredMessage("product")); return ""; }
    setCreating(true); setError(""); setNotice("");
    try {
      const r = await apiRequest("/products", { method: "POST", token: session.token, body: { name: createForm.name.trim(), color: hex(createForm.color), company_id: isPlatformConsole ? scopedCompanyId : undefined, team_id: createForm.team_id || undefined } });
      setCreateForm(draft({ team_id: resolveInitialTeamId(teams, createForm.team_id) }));
      setNotice("Product created."); await loadProducts(session, scopedCompanyId);
      return r.product_id || "";
    } catch (err) { setError(formatScopedError(err, "Could not create product.")); return ""; }
    finally { setCreating(false); }
  }

  async function saveProduct(e) {
    e.preventDefault();
    if (!session?.token || !selectedProduct || !canEditSelected) return;
    if (editTeamPending) return setError(teamSelectionRequiredMessage("product"));
    setSaving(true); setError(""); setNotice("");
    try {
      await apiRequest(`/products/${selectedProduct.product_id}`, { method: "PATCH", token: session.token, body: { name: editForm.name.trim(), color: hex(editForm.color), is_active: editForm.is_active, team_id: editForm.team_id || undefined } });
      setNotice("Product updated."); await loadProducts(session, scopedCompanyId);
    } catch (err) { setError(formatScopedError(err, "Could not update product.")); }
    finally { setSaving(false); }
  }

  async function toggleProduct(product) {
    if (!session?.token || !product || product.can_manage === false) return;
    setTogglingId(product.product_id); setError(""); setNotice("");
    try {
      await apiRequest(`/products/${product.product_id}`, { method: "PATCH", token: session.token, body: { is_active: !isActive(product.is_active) } });
      setNotice(isActive(product.is_active) ? "Product archived." : "Product restored."); await loadProducts(session, scopedCompanyId);
    } catch (err) { setError(formatScopedError(err, "Could not update product.")); }
    finally { setTogglingId(""); }
  }

  return {
    session, companies, companyId, setCompanyId, teams, products, filteredProducts, leadCounts, stats,
    selectedId, setSelectedId, selectedProduct, createForm, setCreateForm, editForm, setEditForm,
    search, setSearch, statusFilter, setStatusFilter, loading, creating, saving, togglingId,
    error, setError, notice, setNotice, mappedTeamIds, setMappedTeamIds, savingMappings,
    isPlatformConsole, scopedCompanyId, canEditSelected, canMapTeams, teamSelectorVisible, createTeamPending, editTeamPending,
    createProduct, saveProduct, toggleProduct, saveTeamMappings,
  };
}
