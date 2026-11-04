"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import DeleteLeadDialog from "../../../components/leads/DeleteLeadDialog";
import { apiRequest } from "../../../lib/api";
import { getLeadStatusLabel } from "../../../lib/leadStatus";
import { loadSession } from "../../../lib/session";

const MANAGE_ROLES = ["super-admin", "admin", "manager"];
const when = (v) => (v ? new Date(v).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) : "–");
const money = (v) => (Number(v) ? `₹${Number(v).toLocaleString("en-IN")}` : "–");

/** Deleted leads: who deleted each one, when and why, with Restore. Admins and managers only. */
export default function DeletedLeadsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [restoring, setRestoring] = useState(null);
  const [seed, setSeed] = useState(0);

  useEffect(() => {
    const s = loadSession();
    if (!s) { router.replace("/login?next=/leads/deleted"); return; }
    if (!MANAGE_ROLES.includes(s.user?.role)) { router.replace("/leads"); return; }
    setSession(s);
  }, [router]);
  useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => {
    if (!session?.token) return;
    apiRequest(`/leads/deleted?${new URLSearchParams({ page: String(page), page_size: "25", ...(query ? { search: query } : {}) })}`, { token: session.token, fresh: true })
      .then((res) => { setData(res); setError(""); })
      .catch((err) => setError(err.message || "Deleted leads could not load."));
  }, [session?.token, query, page, seed]);

  const items = data?.items || [];
  const meta = data?.meta || { total: 0, total_pages: 1 };
  return (
    <DashboardShell session={session} title="Deleted leads" hideTitle heroStats={[]}>
      <div className="tw-buttons min-w-0 space-y-4 pb-10">
        <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
          <div className="flex items-center gap-3">
            <Link href="/leads" prefetch={false} aria-label="Back to leads" className="grid h-9 w-9 place-items-center rounded-[10px] text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50">‹</Link>
            <div>
              <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Deleted leads</h1>
              <p className="text-[13px] text-slate-500">{Number(meta.total || 0).toLocaleString("en-IN")} deleted · who deleted them and why · restore any of them</p>
            </div>
          </div>
          <label className="flex h-9 w-full max-w-[320px] items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3 text-slate-400 focus-within:border-brand-300">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, company or phone" aria-label="Search deleted leads" className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-800 outline-none" />
          </label>
        </div>
        {error ? <p role="alert" className="rounded-[12px] bg-rose-50 px-4 py-3 text-[13px] text-rose-700">{error}</p> : null}
        {notice ? <p role="status" className="rounded-[12px] bg-emerald-50 px-4 py-2.5 text-[13px] font-medium text-emerald-800">✓ {notice}</p> : null}

        <section className="min-w-0 overflow-hidden rounded-[14px] bg-white ring-1 ring-slate-200">
          {!data && !error ? <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-[10px] bg-slate-100" />)}</div> : null}
          {data && !items.length ? (
            <div className="px-6 py-14 text-center">
              <p className="text-[15px] font-semibold text-slate-700">{query ? "No deleted lead matches" : "No deleted leads"}</p>
              <p className="mt-1 text-[13px] text-slate-500">Leads deleted from the list or the lead page show up here.</p>
            </div>
          ) : null}
          {items.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2.5">Lead</th><th className="px-3 py-2.5">Owner</th><th className="px-3 py-2.5">Status when deleted</th>
                    <th className="px-3 py-2.5">Deleted</th><th className="px-3 py-2.5">Why</th><th className="px-3 py-2.5 text-right">Value</th><th className="px-4 py-2.5 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((l) => (
                    <tr key={l.lead_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-2.5">
                        <span className="block text-[13.5px] font-semibold text-slate-900">{l.company_name || l.contact_person}</span>
                        <span className="block text-[11.5px] text-slate-500">{[l.contact_person, l.phone, l.lead_id].filter(Boolean).join(" · ")}</span>
                      </td>
                      <td className="px-3 py-2.5 text-[12.5px] text-slate-700">{l.assigned_to_name || "Unassigned"}{l.team_name ? <span className="block text-[11.5px] text-slate-400">{l.team_name}</span> : null}</td>
                      <td className="px-3 py-2.5"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] font-semibold text-slate-600">{getLeadStatusLabel(l.status)}</span></td>
                      <td className="px-3 py-2.5 text-[12.5px] text-slate-700"><span className="block whitespace-nowrap">{when(l.deleted_at)}</span><span className="text-[11.5px] text-slate-400">by {l.deleted_by_name || "—"}</span></td>
                      <td className="max-w-[260px] px-3 py-2.5 text-[12.5px] text-slate-600"><span className="line-clamp-2">{l.reason || "—"}</span></td>
                      <td className="px-3 py-2.5 text-right text-[12.5px] tabular-nums text-slate-700">{money(l.estimated_value)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button type="button" onClick={() => setRestoring(l)} className="whitespace-nowrap rounded-[8px] bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-800 ring-1 ring-emerald-100 hover:bg-emerald-100">Restore</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {meta.total_pages > 1 ? (
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3 text-[12.5px] text-slate-500">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-[8px] px-3 py-1.5 font-semibold ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40">Previous</button>
              <span>Page {page} of {meta.total_pages}</span>
              <button type="button" disabled={page >= meta.total_pages} onClick={() => setPage(page + 1)} className="rounded-[8px] px-3 py-1.5 font-semibold ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40">Next</button>
            </div>
          ) : null}
        </section>
      </div>
      <DeleteLeadDialog open={Boolean(restoring)} mode="restore" lead={restoring} token={session?.token} onClose={() => setRestoring(null)}
        onDone={() => { setNotice(`${restoring.company_name || restoring.contact_person} is back in the lead lists.`); setSeed((s) => s + 1); }} />
    </DashboardShell>
  );
}
