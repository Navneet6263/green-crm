"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../components/dashboard/icons";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";

const PANEL = "rounded-[30px] border border-[#eadfcd] bg-white/82 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const HERO = "rounded-[36px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(250,241,221,0.98)_44%,_rgba(245,231,193,0.98)_100%)] p-6 shadow-[0_24px_70px_rgba(79,58,22,0.08)] md:p-8";
const DARK_PANEL = "rounded-[34px] border border-[#1d1a12] bg-[linear-gradient(155deg,#10111d_0%,#171a28_56%,#25212d_100%)] p-6 text-white shadow-[0_24px_80px_rgba(6,7,16,0.3)] md:p-7";
const INPUT = "w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none transition placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const PRIMARY = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2.5 text-sm font-semibold text-[#060710] shadow-[0_16px_30px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f] disabled:cursor-not-allowed disabled:opacity-60";
const GHOST = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710] disabled:cursor-not-allowed disabled:opacity-60";
const KICKER = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";
const SWATCHES = ["#cba952", "#8d6e27", "#e59044", "#df6b57", "#5d503c", "#10111d", "#5e7ce2", "#1dbf73", "#6d5bd0"];

const draft = (v = {}) => ({ name: "", color: "#cba952", is_active: true, ...v });
const hex = (v, f = "#cba952") => (/^#[0-9a-f]{6}$/i.test(String(v || "").trim()) ? String(v).toLowerCase() : f);
const date = (v) => {
  if (!v) return "--";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "--" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
const active = (v) => v === true || v === 1 || v === "1";
const path = (companyId) => `/products?page_size=120${companyId ? `&company_id=${companyId}` : ""}`;

export default function ProductSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [products, setProducts] = useState([]);
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
  const isSuperAdmin = role === "super-admin";
  const scopedCompanyId = isSuperAdmin ? companyId : session?.user?.company_id || session?.company?.company_id || "";
  const selectedProduct = useMemo(() => products.find((item) => item.product_id === selectedId) || null, [products, selectedId]);
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? products.filter((item) => [item.name, item.product_id, item.color].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))) : products;
  }, [products, search]);
  const stats = useMemo(() => ({
    total: products.length,
    active: products.filter((item) => active(item.is_active)).length,
    archived: products.filter((item) => !active(item.is_active)).length,
    colors: new Set(products.map((item) => hex(item.color)).filter(Boolean)).size,
  }), [products]);

  async function loadProducts(activeSession, nextCompanyId) {
    if (isSuperAdmin && !nextCompanyId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await apiRequest(path(nextCompanyId), { token: activeSession.token });
      setProducts(response.items || []);
    } catch (requestError) {
      setProducts([]);
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) return router.replace("/login");
    if (!["super-admin", "admin"].includes(activeSession.user?.role)) return router.replace("/dashboard");
    setSession(activeSession);
    if (activeSession.user?.role === "super-admin") {
      apiRequest("/companies?page_size=120", { token: activeSession.token })
        .then((response) => {
          const items = response.items || [];
          setCompanies(items);
          setCompanyId(activeSession.company?.company_id || activeSession.user?.company_id || items[0]?.company_id || "");
        })
        .catch((requestError) => setError(requestError.message));
    }
  }, [router]);

  useEffect(() => {
    if (session) loadProducts(session, scopedCompanyId);
  }, [isSuperAdmin, scopedCompanyId, session]);

  useEffect(() => {
    if (!products.length) {
      setSelectedId("");
      setEditForm(draft());
      return;
    }
    if (!products.some((item) => item.product_id === selectedId)) setSelectedId(products[0].product_id);
  }, [products, selectedId]);

  useEffect(() => {
    if (selectedProduct) setEditForm(draft({ name: selectedProduct.name || "", color: hex(selectedProduct.color), is_active: active(selectedProduct.is_active) }));
  }, [selectedProduct]);

  async function createProduct(event) {
    event.preventDefault();
    if (!session?.token) return;
    if (isSuperAdmin && !scopedCompanyId) return setError("Choose a company before creating a product.");
    setCreating(true); setError(""); setNotice("");
    try {
      const response = await apiRequest("/products", { method: "POST", token: session.token, body: { name: createForm.name.trim(), color: hex(createForm.color), company_id: isSuperAdmin ? scopedCompanyId : undefined } });
      setCreateForm(draft());
      setNotice("Product created.");
      await loadProducts(session, scopedCompanyId);
      setSelectedId(response.product_id);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setCreating(false);
    }
  }

  async function saveProduct(event) {
    event.preventDefault();
    if (!session?.token || !selectedProduct) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await apiRequest(`/products/${selectedProduct.product_id}`, { method: "PATCH", token: session.token, body: { name: editForm.name.trim(), color: hex(editForm.color), is_active: editForm.is_active } });
      setNotice("Product updated.");
      await loadProducts(session, scopedCompanyId);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleProduct(product) {
    if (!session?.token || !product) return;
    setTogglingId(product.product_id); setError(""); setNotice("");
    try {
      await apiRequest(`/products/${product.product_id}`, { method: "PATCH", token: session.token, body: { is_active: !active(product.is_active) } });
      setNotice(active(product.is_active) ? "Product archived." : "Product restored.");
      await loadProducts(session, scopedCompanyId);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setTogglingId("");
    }
  }

  const colorField = (value, setValue, label) => (
    <div className="space-y-3">
      <span className={KICKER}>{label}</span>
      <div className="grid gap-3 md:grid-cols-[84px_1fr]">
        <input className="h-[54px] w-full cursor-pointer rounded-[18px] border border-[#eadfcd] bg-white p-2" type="color" value={hex(value)} onChange={(event) => setValue(event.target.value)} />
        <input className={INPUT} value={value} onChange={(event) => setValue(event.target.value)} onBlur={() => setValue(hex(value))} placeholder="#cba952" />
      </div>
      <div className="flex flex-wrap gap-2">
        {SWATCHES.map((swatch) => <button key={swatch} type="button" className={`h-10 w-10 rounded-2xl border ${hex(value) === swatch ? "scale-105 border-[#060710] shadow-[0_12px_22px_rgba(6,7,16,0.18)]" : "border-[#eadfcd]"}`} style={{ backgroundColor: swatch }} onClick={() => setValue(swatch)} aria-label={`Use ${swatch}`} />)}
      </div>
    </div>
  );

  return (
    <DashboardShell session={session} title="Product Settings" hideTitle heroStats={[]}>
      <div className="mx-auto grid max-w-[1320px] gap-5">
        {error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
        {!error && notice ? <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div> : null}

        <section className={HERO}>
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5">
              <div className="space-y-3">
                <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">Product Desk</span>
                <div>
                  <h2 className="text-[2rem] font-semibold tracking-tight text-[#060710] md:text-[3rem] md:leading-[1.02]">Shape every product into one cleaner branded catalog.</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[#746853] md:text-base">Create, recolor, activate, and refine your product list from one warmer control surface.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[{ label: "Products", value: stats.total, tint: "bg-[#fff0c8] text-[#8d6e27]", icon: "products" }, { label: "Active", value: stats.active, tint: "bg-[#fff7e8] text-[#8d6e27]", icon: "dashboard" }, { label: "Archived", value: stats.archived, tint: "bg-[#f6efe2] text-[#5d503c]", icon: "documents" }, { label: "Colors", value: stats.colors, tint: "bg-[#fff4d9] text-[#8d6e27]", icon: "analytics" }].map((item) => <article key={item.label} className={PANEL}><div className="flex items-start justify-between gap-4"><div><p className={KICKER}>{item.label}</p><h3 className="mt-1 text-[1.7rem] font-black leading-none text-slate-900">{item.value}</h3></div><div className={`grid h-12 w-12 place-items-center rounded-2xl ${item.tint}`}><DashboardIcon name={item.icon} className="h-5 w-5" /></div></div></article>)}
              </div>
            </div>

            <article className={`${PANEL} bg-[#fffaf1]`}>
              <div className="space-y-2">
                <p className={KICKER}>Create Product</p>
                <h3 className="text-2xl font-semibold tracking-tight text-[#060710]">Add a new branded tile</h3>
              </div>
              <form className="mt-5 grid gap-4" onSubmit={createProduct}>
                {isSuperAdmin ? <label className="space-y-2"><span className={KICKER}>Company</span><select className={INPUT} value={companyId} onChange={(event) => setCompanyId(event.target.value)}><option value="">Choose company</option>{companies.map((item) => <option key={item.company_id} value={item.company_id}>{item.name}</option>)}</select></label> : null}
                <label className="space-y-2"><span className={KICKER}>Product Name</span><input className={INPUT} value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} placeholder="GreenCall Premium" required /></label>
                {colorField(createForm.color, (value) => setCreateForm((current) => ({ ...current, color: value })), "Color")}
                <button className={PRIMARY} type="submit" disabled={creating || (isSuperAdmin && !scopedCompanyId)}><DashboardIcon name="products" className="h-4 w-4" />{creating ? "Creating..." : "Create Product"}</button>
              </form>
            </article>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.04fr_0.96fr] xl:items-start">
          <article className={PANEL}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div><p className={KICKER}>Catalog</p><h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Editable product roster</h3></div>
              <label className="space-y-2"><span className={KICKER}>Search</span><input className={INPUT} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product, id, or color" /></label>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">{selectedProduct ? <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fffaf1] px-3 py-1 text-[11px] font-bold text-[#7c6d55]">{selectedProduct.product_id}</span> : null}{scopedCompanyId ? <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">{selectedId ? filteredProducts.length : products.length} visible</span> : null}</div>
            <div className="mt-5 space-y-3">
              {!loading && filteredProducts.length ? filteredProducts.map((product) => <button key={product.product_id} type="button" onClick={() => setSelectedId(product.product_id)} className={`w-full rounded-[28px] border p-4 text-left transition ${selectedId === product.product_id ? "border-[#d7b258] bg-[#fff8e9] shadow-[0_16px_32px_rgba(203,169,82,0.14)]" : "border-[#eadfcd] bg-white/88 shadow-[0_10px_24px_rgba(79,58,22,0.05)] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(79,58,22,0.08)]"}`}><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="flex min-w-0 items-start gap-4"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-[#10111d] text-base font-black text-white shadow-[0_18px_30px_rgba(6,7,16,0.16)]">{String(product.name || "P").slice(0, 2).toUpperCase()}</div><div className="min-w-0"><div className="flex flex-wrap gap-2"><span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fff6e4] px-3 py-1 text-[11px] font-bold text-[#7a6230]">{product.product_id}</span><span className="inline-flex rounded-full border px-3 py-1 text-[11px] font-bold" style={{ backgroundColor: `${hex(product.color)}18`, color: hex(product.color), borderColor: `${hex(product.color)}55` }}>{hex(product.color)}</span></div><h4 className="mt-3 truncate text-lg font-semibold text-[#060710]">{product.name || "Unnamed product"}</h4><p className="mt-1 text-sm text-[#746853]">Created {date(product.created_at)}</p></div></div><div className="flex flex-wrap items-center gap-2"><span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${active(product.is_active) ? "border-[#e7d7ab] bg-[#fff4d9] text-[#8d6e27]" : "border-[#eadfcd] bg-white text-[#7c6d55]"}`}>{active(product.is_active) ? "Active" : "Archived"}</span><span className="h-9 w-9 rounded-2xl border border-white shadow-sm" style={{ backgroundColor: hex(product.color) }} /></div></div></button>) : <div className="grid min-h-[220px] place-items-center rounded-[28px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-6 text-center text-sm text-[#7a6b57]">{isSuperAdmin && !scopedCompanyId ? "Choose a company first to open the product desk." : loading ? "Loading products..." : "No products matched the current search."}</div>}
            </div>
          </article>

          <article className={selectedProduct ? PANEL : DARK_PANEL}>
            {selectedProduct ? (
              <div className="space-y-5">
                <div><p className={KICKER}>Editor</p><h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Update selected product</h3></div>
                <div className="overflow-hidden rounded-[26px] border border-[#eadfcd] bg-white/84 shadow-[0_12px_30px_rgba(79,58,22,0.08)]"><div className="h-2.5 w-full" style={{ backgroundColor: hex(editForm.color) }} /><div className="space-y-4 p-4"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-[18px] bg-[#10111d] text-sm font-black text-white shadow-[0_16px_28px_rgba(6,7,16,0.16)]">{String(editForm.name || "P").slice(0, 2).toUpperCase()}</div><div><strong className="block text-base font-black text-[#060710]">{editForm.name || "Product name"}</strong><span className="block text-xs font-semibold text-[#8f816a]">{selectedProduct.product_id}</span></div></div><span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${editForm.is_active ? "border-[#e7d7ab] bg-[#fff4d9] text-[#8d6e27]" : "border-[#eadfcd] bg-white text-[#7c6d55]"}`}>{editForm.is_active ? "Active" : "Archived"}</span></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4"><span className={KICKER}>Color</span><strong className="mt-3 block text-sm text-[#060710]">{hex(editForm.color)}</strong></div><div className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4"><span className={KICKER}>Status</span><strong className="mt-3 block text-sm text-[#060710]">{editForm.is_active ? "Visible in lead forms" : "Archived from selection"}</strong></div></div></div></div>
                <form className="grid gap-4" onSubmit={saveProduct}>
                  <label className="space-y-2"><span className={KICKER}>Product Name</span><input className={INPUT} value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} required /></label>
                  {colorField(editForm.color, (value) => setEditForm((current) => ({ ...current, color: value })), "Product Color")}
                  <label className="flex items-center gap-3 rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-3"><input type="checkbox" checked={editForm.is_active} onChange={(event) => setEditForm((current) => ({ ...current, is_active: event.target.checked }))} className="h-4 w-4 rounded border-[#d9ccb8] text-[#cba952] focus:ring-[#f3dfab]" /><span className="text-sm font-semibold text-[#5d503c]">Keep this product active in the catalog</span></label>
                  <div className="flex flex-wrap gap-3"><button className={PRIMARY} type="submit" disabled={saving}><DashboardIcon name="settings" className="h-4 w-4" />{saving ? "Saving..." : "Save Changes"}</button><button className={GHOST} type="button" disabled={Boolean(togglingId)} onClick={() => toggleProduct(selectedProduct)}><DashboardIcon name="documents" className="h-4 w-4" />{togglingId === selectedProduct.product_id ? "Updating..." : active(selectedProduct.is_active) ? "Archive Product" : "Restore Product"}</button></div>
                </form>
              </div>
            ) : <div className="space-y-4"><span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/70">Product Editor</span><h3 className="text-[2rem] font-semibold leading-[1.08] tracking-tight text-white">Select a product card to edit color, name, and status</h3><p className="text-sm leading-7 text-white/68">Your selected product opens here with a live preview and editable color controls.</p></div>}
          </article>
        </div>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <article className={PANEL}>
            <div><p className={KICKER}>Palette Row</p><h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Current product colors</h3></div>
            <div className="mt-5 flex flex-wrap gap-3">{Array.from(new Set(products.map((item) => hex(item.color)).filter(Boolean))).length ? Array.from(new Set(products.map((item) => hex(item.color)).filter(Boolean))).map((color) => <div key={color} className="rounded-[24px] border border-[#eadfcd] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(79,58,22,0.05)]"><div className="h-14 w-24 rounded-[18px] border border-white shadow-sm" style={{ backgroundColor: color }} /><strong className="mt-3 block text-sm text-[#060710]">{color}</strong></div>) : <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-4 py-8 text-sm text-[#7a6b57]">Colors will appear here as soon as products are created.</div>}</div>
          </article>
          <article className={PANEL}>
            <div><p className={KICKER}>Connections</p><h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Use products across the workspace</h3></div>
            <div className="mt-5 grid gap-3"><Link className={GHOST} href="/leads/new"><DashboardIcon name="leads" className="h-4 w-4" />Use in Create Lead</Link><Link className={GHOST} href="/leads"><DashboardIcon name="workflow" className="h-4 w-4" />Open Lead Workspace</Link><Link className={GHOST} href="/analytics"><DashboardIcon name="analytics" className="h-4 w-4" />See Product Analytics</Link></div>
          </article>
        </section>
      </div>
    </DashboardShell>
  );
}
