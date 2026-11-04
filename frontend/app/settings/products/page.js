"use client";

import Link from "next/link";
import { useState } from "react";
import AdminPage from "../../../components/layout/AdminPage";
import SideDrawer from "../../../components/ui/SideDrawer";
import { AlertError, AlertSuccess } from "../../../components/ui/Alert";
import { teamSelectLabel } from "../../../lib/teamScope";
import { StatCard, T } from "../teams/teams-tokens";
import { ProductFields, ProductMark, ProductTable } from "./ProductParts";
import { isActive, useProducts } from "./useProducts";

/** Products: the catalog every lead is tagged with. Add and edit in side panels. */
export default function ProductsPage() {
  const p = useProducts();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const sel = p.selectedProduct;
  const canCreate = !(p.isPlatformConsole && !p.scopedCompanyId);

  const open = (id) => { p.setSelectedId(id); setEditOpen(true); };
  const create = async (e) => {
    const id = await p.createProduct(e);
    if (id) { setCreateOpen(false); open(id); }
  };

  return (
    <AdminPage session={p.session} title="Products" description="What you sell. Every lead is tagged with a product so reports show what is working"
      actions={(
        <>
          {p.isPlatformConsole ? (
            <select aria-label="Company" value={p.companyId} onChange={(e) => p.setCompanyId(e.target.value)} className="h-9 rounded-[10px] border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700">
              <option value="">Choose company</option>
              {p.companies.map((c) => <option key={c.company_id} value={c.company_id}>{c.name}</option>)}
            </select>
          ) : null}
          <Link href="/pipeline" prefetch className={T.ghost}>Pipeline</Link>
          <button type="button" className={T.gold} disabled={!canCreate} onClick={() => setCreateOpen(true)}>+ New product</button>
        </>
      )}>
      <AlertError message={p.error} onDismiss={() => p.setError("")} />
      {!p.error ? <AlertSuccess message={p.notice} onDismiss={() => p.setNotice("")} /> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Products" value={p.stats.total} accent="sky" />
        <StatCard label="Active" value={p.stats.active} accent="emerald" />
        <StatCard label="Archived" value={p.stats.archived} accent="slate" />
        <StatCard label="Leads tagged" value={p.stats.totalLeads} accent="violet" />
      </div>

      <ProductTable products={p.products} filteredProducts={p.filteredProducts} leadCounts={p.leadCounts} loading={p.loading}
        emptyText={p.isPlatformConsole && !p.scopedCompanyId ? "Choose a company to see its products" : "No products yet"}
        search={p.search} onSearch={p.setSearch} statusFilter={p.statusFilter} onStatusFilter={p.setStatusFilter} onOpen={open}
        onCreate={canCreate ? () => setCreateOpen(true) : null} />

      <SideDrawer open={createOpen} onClose={() => setCreateOpen(false)} title="New product" subtitle="Name it and pick a colour. You can change both later."
        footer={<div className="flex justify-end gap-2"><button type="button" className={T.ghost} onClick={() => setCreateOpen(false)}>Cancel</button><button type="submit" form="product-create" className={T.gold} disabled={p.creating || p.createTeamPending}>{p.creating ? "Creating…" : "Create product"}</button></div>}>
        <form id="product-create" onSubmit={create}>
          <ProductFields form={p.createForm} setForm={p.setCreateForm} teams={p.teams} showTeam={p.teamSelectorVisible} />
        </form>
      </SideDrawer>

      <SideDrawer open={editOpen && Boolean(sel)} onClose={() => setEditOpen(false)} title={sel ? <span className="flex items-center gap-2.5"><ProductMark name={sel.name} color={sel.color} size="h-8 w-8 text-[11px]" />{sel.name}</span> : "Product"}
        subtitle={sel ? `${p.leadCounts[sel.product_id] || 0} leads · ${isActive(sel.is_active) ? "Active" : "Archived"}` : ""}
        footer={p.canEditSelected ? <div className="flex justify-end"><button type="submit" form="product-edit" className={T.gold} disabled={p.saving || p.editTeamPending}>{p.saving ? "Saving…" : "Save changes"}</button></div> : null}>
        {sel ? (
          <div className="space-y-4">
            {!p.canEditSelected ? <p className="rounded-[12px] bg-sky-50 px-4 py-3 text-[12.5px] text-sky-800 ring-1 ring-sky-100">This product is shared with your team. You can tag your leads with it, but only the owning team or an admin can change it.</p> : null}
            <form id="product-edit" onSubmit={p.saveProduct} className="rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
              <fieldset disabled={!p.canEditSelected} className="disabled:opacity-60">
                <ProductFields form={p.editForm} setForm={p.setEditForm} teams={p.teams} showTeam={p.teamSelectorVisible} />
              </fieldset>
            </form>

            {p.canMapTeams ? (
              <form onSubmit={p.saveTeamMappings} className="space-y-3 rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
                <div>
                  <p className="text-[14px] font-bold text-slate-900">Share with other teams</p>
                  <p className="mt-0.5 text-[12.5px] text-slate-500">Picked teams can tag their leads with this product. They still cannot see the owning team&apos;s leads or customers.</p>
                </div>
                {!sel.team_id ? <p className="rounded-[10px] bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">Choose and save an owning team first.</p> : null}
                <fieldset disabled={p.savingMappings || !sel.team_id} className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-[12px] ring-1 ring-slate-200 disabled:opacity-60">
                  {p.teams.map((team) => {
                    const owner = team.team_id === sel.team_id;
                    return (
                      <label key={team.team_id} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50">
                        <input type="checkbox" disabled={owner} checked={owner || p.mappedTeamIds.includes(team.team_id)} className="h-4 w-4 accent-[#0c605d]"
                          onChange={(e) => p.setMappedTeamIds((ids) => (e.target.checked ? [...new Set([...ids, team.team_id])] : ids.filter((id) => id !== team.team_id)))} />
                        <span className="min-w-0 flex-1 truncate">{teamSelectLabel(team)}</span>
                        {owner ? <span className="rounded-full bg-slate-100 px-2 py-px text-[10.5px] font-semibold text-slate-500">Owner</span> : null}
                      </label>
                    );
                  })}
                  {!p.teams.length ? <p className="px-3 py-4 text-center text-[12.5px] text-slate-400">No active teams yet.</p> : null}
                </fieldset>
                <div className="flex justify-end"><button type="submit" className={T.ghost} disabled={p.savingMappings || !sel.team_id}>{p.savingMappings ? "Saving…" : "Save sharing"}</button></div>
              </form>
            ) : null}

            {p.canEditSelected ? (
              <section className="space-y-2 rounded-[14px] bg-white p-4 ring-1 ring-rose-100">
                <p className="text-[14px] font-bold text-slate-900">{isActive(sel.is_active) ? "Archive product" : "Restore product"}</p>
                <p className="text-[12.5px] text-slate-500">{isActive(sel.is_active) ? "Archived products stop showing on new leads. Old leads keep their tag." : "Bring it back so it can be picked on new leads."}</p>
                <button type="button" className={isActive(sel.is_active) ? T.danger : T.ghost} disabled={Boolean(p.togglingId)} onClick={() => p.toggleProduct(sel)}>
                  {p.togglingId === sel.product_id ? "Updating…" : isActive(sel.is_active) ? "Archive" : "Restore"}
                </button>
              </section>
            ) : null}
          </div>
        ) : null}
      </SideDrawer>
    </AdminPage>
  );
}
