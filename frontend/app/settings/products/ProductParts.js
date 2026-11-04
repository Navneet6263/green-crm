"use client";

import { teamBadgeLabel, teamSelectLabel } from "../../../lib/teamScope";
import { T } from "../teams/teams-tokens";
import { hex, isActive } from "./useProducts";

const SWATCHES = ["#009a8c", "#3b6fd8", "#d9467c", "#b98300", "#8a55e6", "#e06a10", "#0c605d", "#475569", "#16a34a"];
const label = "block space-y-1 text-[12px] font-semibold text-slate-600";
const when = (v) => { if (!v) return "–"; const d = new Date(v); return isNaN(d.getTime()) ? "–" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); };
// "GreenCRM Pro" -> "GP", "GreenHR" -> "GR".
const mark = (name) => {
  const words = String(name || "P").trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || "P").slice(0, 2)).toUpperCase();
};

export function ProductMark({ name, color, size = "h-9 w-9 text-[12px]" }) {
  return <span className={`grid ${size} shrink-0 place-items-center rounded-[10px] font-bold text-white`} style={{ background: hex(color) }}>{mark(name)}</span>;
}

function ColorField({ value, onChange }) {
  return (
    <div className="space-y-2">
      <span className="text-[12px] font-semibold text-slate-600">Colour</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {SWATCHES.map((s) => (
          <button key={s} type="button" onClick={() => onChange(s)} aria-label={`Use ${s}`}
            className={`h-7 w-7 rounded-full transition hover:scale-110 ${hex(value) === s ? "ring-2 ring-slate-900 ring-offset-2" : ""}`} style={{ background: s }} />
        ))}
        <label className="ml-1 flex h-8 items-center gap-1.5 rounded-[9px] border border-slate-200 bg-white pl-1 pr-2">
          <input type="color" value={hex(value)} onChange={(e) => onChange(e.target.value)} aria-label="Pick any colour" className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0" />
          <input value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => onChange(hex(value))} aria-label="Hex colour" className="w-[72px] bg-transparent text-[12.5px] font-mono text-slate-700 outline-none" />
        </label>
      </div>
    </div>
  );
}

/** Name, owning team and colour, with a live preview. Shared by the create and edit panels. */
export function ProductFields({ form, setForm, teams, showTeam }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-[12px] bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
        <ProductMark name={form.name} color={form.color} size="h-11 w-11 text-[14px]" />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold text-slate-900">{form.name || "Product name"}</p>
          <p className="text-[12px] text-slate-500">This is how it shows on leads and reports</p>
        </div>
      </div>
      <label className={label}>Product name<input className={T.input} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. GreenCall Premium" required /></label>
      {showTeam ? (
        <label className={label}>Owning team
          <select className={T.input} value={form.team_id} onChange={(e) => setForm((f) => ({ ...f, team_id: e.target.value }))}>
            <option value="">Select team</option>
            {teams.map((t) => <option key={t.team_id} value={t.team_id}>{teamSelectLabel(t)}</option>)}
          </select>
        </label>
      ) : null}
      <ColorField value={form.color} onChange={(v) => setForm((f) => ({ ...f, color: v }))} />
    </div>
  );
}

/** The catalog as a table; a row click opens the product. */
export function ProductTable({ products, filteredProducts, leadCounts, loading, emptyText, search, onSearch, statusFilter, onStatusFilter, onOpen, onCreate }) {
  const filters = [["all", "All"], ["active", "Active"], ["archived", "Archived"]];
  return (
    <section className={`${T.panel} overflow-hidden`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2.5">
        <label className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-[10px] border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-brand-300 focus-within:bg-white sm:max-w-[300px]">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search products" aria-label="Search products" className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-800 outline-none" />
        </label>
        <div className="flex gap-1 rounded-[10px] bg-slate-100 p-0.5">
          {filters.map(([k, n]) => (
            <button key={k} type="button" onClick={() => onStatusFilter(k)} aria-pressed={statusFilter === k}
              className={`rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold ${statusFilter === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{n}</button>
          ))}
        </div>
        <span className="ml-auto text-[12px] text-slate-400">{filteredProducts.length} of {products.length}</span>
      </div>

      {loading ? (
        <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-[10px] bg-slate-100" />)}</div>
      ) : filteredProducts.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="bg-slate-50/70 text-[11.5px] font-semibold text-slate-500">
              <tr><th className="px-4 py-2.5">Product</th><th className="px-4 py-2.5">Team</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5 text-right">Leads</th><th className="px-4 py-2.5">Created</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const active = isActive(p.is_active);
                return (
                  <tr key={p.product_id} onClick={() => onOpen(p.product_id)} onKeyDown={(e) => { if (e.key === "Enter") onOpen(p.product_id); }} tabIndex={0}
                    className="cursor-pointer transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none">
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-3">
                        <ProductMark name={p.name} color={p.color} />
                        <span className="min-w-0">
                          <b className="block truncate font-semibold text-slate-900">{p.name || "Unnamed"}</b>
                          {p.can_manage === false ? <span className="text-[11.5px] text-sky-700">Shared with your team · use only</span> : <span className="text-[11.5px] text-slate-400">{hex(p.color)}</span>}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{teamBadgeLabel(p) || <span className="text-slate-400">Whole company</span>}{p.mapped_team_ids?.length ? <span className="ml-1.5 rounded-full bg-violet-50 px-1.5 py-px text-[10.5px] font-semibold text-violet-700">+{p.mapped_team_ids.length} shared</span> : null}</td>
                    <td className="px-4 py-2.5"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}><span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />{active ? "Active" : "Archived"}</span></td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-800">{leadCounts[p.product_id] || 0}</td>
                    <td className="px-4 py-2.5 text-slate-500">{when(p.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : products.length ? (
        <p className="px-6 py-14 text-center text-[13px] text-slate-400">No product matches.</p>
      ) : (
        <div className="px-6 py-14 text-center">
          <p className="text-[14px] font-semibold text-slate-700">{emptyText || "No products yet"}</p>
          <p className="mt-1 text-[12.5px] text-slate-400">Products tag every lead so you can see what sells.</p>
          {onCreate ? <button type="button" className={`${T.gold} mt-3`} onClick={onCreate}>+ Add the first product</button> : null}
        </div>
      )}
    </section>
  );
}
