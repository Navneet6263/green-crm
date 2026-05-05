"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../components/dashboard/icons";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";
import {
  formatScopedError, isPlatformConsoleRole, loadProductsForScope,
  loadTeamScopeResources, resolveInitialTeamId, resolveScopedCompanyId,
  scopedProductsEmptyMessage, shouldShowTeamSelector, teamBadgeLabel,
  teamSelectLabel, teamSelectionRequiredMessage,
} from "../../../lib/teamScope";
import { AlertError, AlertSuccess } from "../../../components/ui/Alert";

const T = {
  panel: "rounded-2xl border border-slate-100 bg-white shadow-sm",
  input: "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-50",
  gold:  "inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed",
  ghost: "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50",
  K:     "text-[10px] font-bold uppercase tracking-widest text-slate-400",
};
const SWATCHES = ["#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#06b6d4","#f97316","#ec4899","#84cc16"];
const draft = (v={}) => ({ name:"", color:"#f59e0b", is_active:true, team_id:"", ...v });
const hex = (v, f="#f59e0b") => (/^#[0-9a-f]{6}$/i.test(String(v||"").trim()) ? String(v).toLowerCase() : f);
const fmtDate = v => { if(!v) return "--"; const d=new Date(v); return isNaN(d.getTime()) ? "--" : d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}); };
const isActive = v => v===true||v===1||v==="1";

function ColorField({ value, onChange, label }) {
  return (
    <div className="space-y-2">
      <span className={T.K}>{label}</span>
      <div className="flex gap-2">
        <input className="h-10 w-12 shrink-0 cursor-pointer rounded-xl border border-slate-200 p-1" type="color" value={hex(value)} onChange={e => onChange(e.target.value)} />
        <input className={T.input} value={value} onChange={e => onChange(e.target.value)} onBlur={() => onChange(hex(value))} placeholder="#f59e0b" />
      </div>
      <div className="flex flex-wrap gap-2">
        {SWATCHES.map(s => (
          <button key={s} type="button" onClick={() => onChange(s)}
            className={`h-8 w-8 rounded-xl border-2 transition hover:scale-110 ${hex(value)===s ? "border-slate-900 scale-110" : "border-transparent"}`}
            style={{ backgroundColor: s }} />
        ))}
      </div>
    </div>
  );
}

export default function ProductSettingsPage() {
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
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const role = session?.user?.role || "";
  const isPlatformConsole = isPlatformConsoleRole(role);
  const scopedCompanyId = resolveScopedCompanyId(session, companyId);
  const selectedProduct = useMemo(() => products.find(p => p.product_id === selectedId)||null, [products, selectedId]);
  const teamSelectorVisible = shouldShowTeamSelector(role, teams);
  const createTeamPending = teamSelectorVisible && !createForm.team_id;
  const editTeamPending = teamSelectorVisible && Boolean(selectedProduct) && !editForm.team_id;
  const selectedTeam = useMemo(() => teams.find(t => t.team_id === editForm.team_id)||null, [editForm.team_id, teams]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? products.filter(p => [p.name, p.product_id, p.color].filter(Boolean).some(v => String(v).toLowerCase().includes(q))) : products;
  }, [products, search]);

  const stats = useMemo(() => ({
    total: products.length,
    active: products.filter(p => isActive(p.is_active)).length,
    archived: products.filter(p => !isActive(p.is_active)).length,
    totalLeads: Object.values(leadCounts).reduce((s,v)=>s+v, 0),
  }), [products, leadCounts]);

  async function loadProducts(s, cid) {
    if (isPlatformConsole && !cid) { setProducts([]); setLoading(false); return; }
    setLoading(true);
    try {
      const items = await loadProductsForScope(s.token, { companyId: cid, pageSize: 120 });
      setProducts(items);
      // Load lead counts per product
      try {
        const counts = {};
        await Promise.all(items.map(async p => {
          const r = await apiRequest(`/leads?product_id=${p.product_id}&page_size=1`, { token: s.token });
          counts[p.product_id] = Number(r.meta?.total || r.items?.length || 0);
        }));
        setLeadCounts(counts);
      } catch(_) {}
    } catch(e) { setProducts([]); setError(formatScopedError(e, "Could not load products.")); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const s = loadSession();
    if (!s) return router.replace("/login");
    if (!["super-admin","platform-admin","platform-manager","admin","manager"].includes(s.user?.role)) return router.replace("/dashboard");
    setSession(s);
    if (isPlatformConsoleRole(s.user?.role)) {
      apiRequest("/companies?page_size=120", { token: s.token }).then(r => {
        const items = r.items||[];
        setCompanies(items);
        setCompanyId(s.company?.company_id||s.user?.company_id||items[0]?.company_id||"");
      }).catch(e => setError(formatScopedError(e, "Could not load companies.")));
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
        setCreateForm(f => ({ ...f, team_id: resolveInitialTeamId(t, f.team_id||teamId) }));
      } catch(_) { if (!ignore) setTeams([]); }
    }
    loadTeams();
    return () => { ignore = true; };
  }, [scopedCompanyId, session]);

  useEffect(() => {
    if (!products.length) { setSelectedId(""); setEditForm(draft()); return; }
    if (!products.some(p => p.product_id === selectedId)) setSelectedId(products[0].product_id);
  }, [products, selectedId]);

  useEffect(() => {
    if (selectedProduct) setEditForm(draft({ name: selectedProduct.name||"", color: hex(selectedProduct.color), is_active: isActive(selectedProduct.is_active), team_id: resolveInitialTeamId(teams, selectedProduct.team_id) }));
  }, [selectedProduct, teams]);

  async function createProduct(e) {
    e.preventDefault();
    if (!session?.token) return;
    if (isPlatformConsole && !scopedCompanyId) return setError("Choose a company first.");
    if (createTeamPending) return setError(teamSelectionRequiredMessage("product"));
    setCreating(true); setError(""); setNotice("");
    try {
      const r = await apiRequest("/products", { method:"POST", token:session.token, body:{ name:createForm.name.trim(), color:hex(createForm.color), company_id:isPlatformConsole?scopedCompanyId:undefined, team_id:createForm.team_id||undefined } });
      setCreateForm(draft({ team_id: resolveInitialTeamId(teams, createForm.team_id) }));
      setNotice("Product created."); await loadProducts(session, scopedCompanyId); setSelectedId(r.product_id);
    } catch(e) { setError(formatScopedError(e, "Could not create product.")); }
    finally { setCreating(false); }
  }

  async function saveProduct(e) {
    e.preventDefault();
    if (!session?.token || !selectedProduct) return;
    if (editTeamPending) return setError(teamSelectionRequiredMessage("product"));
    setSaving(true); setError(""); setNotice("");
    try {
      await apiRequest(`/products/${selectedProduct.product_id}`, { method:"PATCH", token:session.token, body:{ name:editForm.name.trim(), color:hex(editForm.color), is_active:editForm.is_active, team_id:editForm.team_id||undefined } });
      setNotice("Product updated."); await loadProducts(session, scopedCompanyId);
    } catch(e) { setError(formatScopedError(e, "Could not update product.")); }
    finally { setSaving(false); }
  }

  async function toggleProduct(product) {
    if (!session?.token || !product) return;
    setTogglingId(product.product_id); setError(""); setNotice("");
    try {
      await apiRequest(`/products/${product.product_id}`, { method:"PATCH", token:session.token, body:{ is_active:!isActive(product.is_active) } });
      setNotice(isActive(product.is_active) ? "Product archived." : "Product restored."); await loadProducts(session, scopedCompanyId);
    } catch(e) { setError(formatScopedError(e, "Could not update product.")); }
    finally { setTogglingId(""); }
  }

  return (
    <DashboardShell session={session} title="Products" hideTitle heroStats={[]}>
      <div className="mx-auto max-w-[1320px] space-y-5 px-1">
        <AlertError message={error} onDismiss={() => setError("")} />
        {!error ? <AlertSuccess message={notice} onDismiss={() => setNotice("")} /> : null}

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={T.K}>Settings · Products</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">Product Desk</h1>
            <p className="mt-0.5 text-sm text-slate-400">Create, recolor, and manage your product catalog.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Products",stats.total,"border-amber-200 bg-amber-50"],["Active",stats.active,"border-emerald-200 bg-emerald-100"],["Archived",stats.archived,"border-slate-200 bg-slate-100"],["Total Leads",stats.totalLeads,"border-sky-200 bg-sky-100"]].map(([l,v,a])=>(
            <div key={l} className={`rounded-2xl border px-4 py-3.5 ${a}`}>
              <p className={T.K}>{l}</p>
              <p className="mt-1 text-2xl font-bold leading-none text-slate-900">{v}</p>
            </div>
          ))}
        </div>

        {/* Company selector */}
        {isPlatformConsole ? (
          <div className={`${T.panel} flex flex-wrap items-center gap-4 px-5 py-4`}>
            <p className="text-sm font-semibold text-slate-700">Company</p>
            <select className={`${T.input} max-w-[280px]`} value={companyId} onChange={e => setCompanyId(e.target.value)}>
              <option value="">Choose company</option>
              {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.name}</option>)}
            </select>
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[1fr_380px] xl:items-start">
          {/* Product list */}
          <div className={`${T.panel} px-5 py-5`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={T.K}>Catalog</p>
                <h2 className="mt-0.5 text-base font-bold text-slate-900">Product roster · {filteredProducts.length}</h2>
              </div>
              <input className={`${T.input} max-w-[220px]`} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product…" />
            </div>

            {loading ? <p className="py-6 text-center text-sm text-slate-400">Loading products…</p> : filteredProducts.length ? (
              <div className="space-y-2.5">
                {filteredProducts.map(product => {
                  const color = hex(product.color);
                  const leads = leadCounts[product.product_id] || 0;
                  const active = isActive(product.is_active);
                  return (
                    <button
                      key={product.product_id} type="button"
                      onClick={() => setSelectedId(product.product_id)}
                      className={`group relative w-full overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                        selectedId === product.product_id ? "border-amber-300 bg-amber-50 shadow-sm" : "border-slate-100 bg-white hover:border-amber-200"
                      }`}
                    >
                      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                      <div className="flex items-center gap-3">
                        {/* Product color avatar */}
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold text-white shadow-sm" style={{ backgroundColor: color }}>
                          {String(product.name||"P").slice(0,2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-sm font-bold text-slate-900">{product.name||"Unnamed"}</p>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${active ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
                              {active ? "Active" : "Archived"}
                            </span>
                            {teamBadgeLabel(product) ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">{teamBadgeLabel(product)}</span> : null}
                          </div>
                          <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-400">
                            <span style={{ color }}>{color}</span>
                            <span>Created {fmtDate(product.created_at)}</span>
                          </div>
                        </div>
                        {/* Lead count badge */}
                        <div className="shrink-0 text-right">
                          <p className="text-lg font-bold text-slate-900">{leads}</p>
                          <p className="text-[10px] font-semibold text-slate-400">leads</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-[160px] items-center justify-center text-center text-sm text-slate-400">
                {isPlatformConsole && !scopedCompanyId ? "Choose a company to load products." : "No products found."}
              </div>
            )}
          </div>

          {/* Right column — create + edit */}
          <div className="space-y-4">
            {/* Create form */}
            <div className={`${T.panel} px-5 py-5`}>
              <p className={T.K}>Create Product</p>
              <h3 className="mt-0.5 mb-4 text-base font-bold text-slate-900">Add a new product</h3>
              <form className="space-y-4" onSubmit={createProduct}>
                <label className="block space-y-1.5">
                  <span className={T.K}>Product Name *</span>
                  <input className={T.input} value={createForm.name} onChange={e => setCreateForm(f=>({...f,name:e.target.value}))} placeholder="e.g. GreenCall Premium" required />
                </label>
                {teamSelectorVisible ? (
                  <label className="block space-y-1.5">
                    <span className={T.K}>Owning Team</span>
                    <select className={T.input} value={createForm.team_id} onChange={e => setCreateForm(f=>({...f,team_id:e.target.value}))}>
                      <option value="">Select team</option>
                      {teams.map(t => <option key={t.team_id} value={t.team_id}>{teamSelectLabel(t)}</option>)}
                    </select>
                  </label>
                ) : null}
                <ColorField value={createForm.color} onChange={v => setCreateForm(f=>({...f,color:v}))} label="Product Color" />
                {/* Live preview */}
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl text-sm font-bold text-white" style={{ backgroundColor: hex(createForm.color) }}>
                    {String(createForm.name||"P").slice(0,2).toUpperCase()||"P"}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{createForm.name||"Product name"}</p>
                    <p className="text-xs text-slate-400">{hex(createForm.color)}</p>
                  </div>
                </div>
                <button className={T.gold} type="submit" disabled={creating||(isPlatformConsole&&!scopedCompanyId)||createTeamPending}>
                  <DashboardIcon name="products" className="h-4 w-4" />
                  {creating ? "Creating…" : "Create Product"}
                </button>
              </form>
            </div>

            {/* Edit form */}
            {selectedProduct ? (
              <div className={`${T.panel} px-5 py-5`}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl text-sm font-bold text-white" style={{ backgroundColor: hex(editForm.color) }}>
                    {String(editForm.name||"P").slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <p className={T.K}>Edit Product</p>
                    <h3 className="text-sm font-bold text-slate-900">{selectedProduct.name}</h3>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xl font-bold text-slate-900">{leadCounts[selectedProduct.product_id]||0}</p>
                    <p className="text-[10px] font-semibold text-slate-400">leads</p>
                  </div>
                </div>
                <form className="space-y-4" onSubmit={saveProduct}>
                  <label className="block space-y-1.5">
                    <span className={T.K}>Product Name</span>
                    <input className={T.input} value={editForm.name} onChange={e => setEditForm(f=>({...f,name:e.target.value}))} required />
                  </label>
                  {teamSelectorVisible ? (
                    <label className="block space-y-1.5">
                      <span className={T.K}>Owning Team</span>
                      <select className={T.input} value={editForm.team_id} onChange={e => setEditForm(f=>({...f,team_id:e.target.value}))}>
                        <option value="">Select team</option>
                        {teams.map(t => <option key={t.team_id} value={t.team_id}>{teamSelectLabel(t)}</option>)}
                      </select>
                    </label>
                  ) : null}
                  <ColorField value={editForm.color} onChange={v => setEditForm(f=>({...f,color:v}))} label="Product Color" />
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <input type="checkbox" checked={editForm.is_active} onChange={e => setEditForm(f=>({...f,is_active:e.target.checked}))} className="h-4 w-4 rounded border-slate-300 accent-amber-500" />
                    <span className="text-sm font-semibold text-slate-700">Keep active in catalog</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button className={T.gold} type="submit" disabled={saving||editTeamPending}>
                      <DashboardIcon name="settings" className="h-4 w-4" />{saving ? "Saving…" : "Save Changes"}
                    </button>
                    <button className={T.ghost} type="button" disabled={Boolean(togglingId)} onClick={() => toggleProduct(selectedProduct)}>
                      {togglingId===selectedProduct.product_id ? "Updating…" : isActive(selectedProduct.is_active) ? "Archive" : "Restore"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className={`${T.panel} flex min-h-[200px] flex-col items-center justify-center gap-3 px-5 py-8 text-center`}>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-400">
                  <DashboardIcon name="products" className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Select a product to edit</p>
                <p className="text-xs text-slate-400">Click any product card to update its name, color, and status.</p>
              </div>
            )}

            {/* Quick links */}
            <div className={`${T.panel} px-5 py-5`}>
              <p className={`${T.K} mb-3`}>Quick Links</p>
              <div className="space-y-2">
                <Link className={T.ghost} href="/leads/new"><DashboardIcon name="leads" className="h-4 w-4" />Use in Create Lead</Link>
                <Link className={T.ghost} href="/analytics"><DashboardIcon name="analytics" className="h-4 w-4" />Product Analytics</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
