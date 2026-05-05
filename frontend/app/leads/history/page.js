"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../components/dashboard/icons";
import { apiRequest } from "../../../lib/api";
import { formatIndiaDateTime } from "../../../lib/dateTime";
import { ROLE_HOME_ROUTE } from "../../../lib/roles";
import { loadSession } from "../../../lib/session";
import { teamBadgeLabel } from "../../../lib/teamScope";
import { LeadHistoryCard } from "./LeadHistoryCard";
import { LeadHistorySidebar } from "./LeadHistorySidebar";

const OK_ROLES = ["super-admin","platform-admin","platform-manager","admin","manager","sales","marketing","viewer"];
const K = "text-[10px] font-bold uppercase tracking-widest text-slate-400";
const INPUT = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-50";
const BTN_GHOST = "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:opacity-50";
const BTN_GOLD  = "inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50";

function qp(path, params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== "" && v !== "all") q.set(k, v); });
  const s = q.toString(); return s ? `${path}?${s}` : path;
}
const formatMoney = v => `₹${Number(v||0).toLocaleString("en-IN")}`;
const formatDate  = (v, full=false) => formatIndiaDateTime(v, full);
function normalizeMeta(m={}, page=1, ps=15) {
  return { page:Number(m.page||page||1), page_size:Number(m.page_size||ps||15), total:Number(m.total||0), total_pages:Math.max(Number(m.total_pages||1),1) };
}

export default function LeadHistoryPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leads, setLeads] = useState([]);
  const [meta, setMeta] = useState({ page:1, page_size:15, total:0, total_pages:1 });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [workflowFilter, setWorkflowFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  async function load(s, pg=page) {
    setLoading(true); setError("");
    try {
      const r = await apiRequest(qp("/leads",{ page:pg, page_size:pageSize, search:search.trim()||undefined, status:statusFilter }), { token:s.token });
      setLeads(r.items||[]); setMeta(normalizeMeta(r.meta, pg, pageSize));
    } catch(e) { setError(e.message); setLeads([]); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const s = loadSession();
    if (!s) return router.replace("/login");
    if (!OK_ROLES.includes(s.user?.role)) return router.replace(ROLE_HOME_ROUTE[s.user?.role]||"/dashboard");
    setSession(s);
  }, [router]);

  useEffect(() => { if (session?.token) load(session, page); }, [page, search, session, statusFilter]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const filtered = useMemo(() => {
    const list = leads.filter(l => workflowFilter === "all" || (l.workflow_stage||"sales") === workflowFilter);
    list.sort((a,b) => {
      if (sortBy === "oldest") return new Date(a.created_at||0) - new Date(b.created_at||0);
      if (sortBy === "value")  return Number(b.estimated_value||0) - Number(a.estimated_value||0);
      if (sortBy === "follow-up") {
        const at = a.follow_up_date ? new Date(a.follow_up_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bt = b.follow_up_date ? new Date(b.follow_up_date).getTime() : Number.MAX_SAFE_INTEGER;
        return at - bt;
      }
      return new Date(b.updated_at||b.created_at||0) - new Date(a.updated_at||a.created_at||0);
    });
    return list;
  }, [leads, sortBy, workflowFilter]);

  const stageRows = useMemo(() => {
    const m = {}; filtered.forEach(l => { const k=l.workflow_stage||"sales"; m[k]=(m[k]||0)+1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,4);
  }, [filtered]);

  const sourceRows = useMemo(() => {
    const m = {}; filtered.forEach(l => { const k=l.lead_source||"website"; m[k]=(m[k]||0)+1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,4);
  }, [filtered]);

  const totalPages = Math.max(Number(meta.total_pages||1),1);
  const from = meta.total ? (page-1)*pageSize+1 : 0;
  const to   = meta.total ? Math.min((page-1)*pageSize+filtered.length, meta.total) : 0;

  return (
    <DashboardShell session={session} title="Lead History" hideTitle heroStats={[]}>
      <div className="mx-auto max-w-[1320px] space-y-5 px-1">
        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={K}>Lead History</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">Timeline</h1>
            <p className="mt-0.5 text-sm text-slate-400">{from}–{to} of {meta.total} records · Page {page} of {totalPages}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="relative sm:col-span-2">
              <DashboardIcon name="leads" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className={`${INPUT} pl-10`} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search company, contact, source…" />
            </div>
            <select className={INPUT} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              {["new","contacted","qualified","proposal","negotiation","booked-demo","demo-done","trial-started","closed-won","closed-lost"].map(s=>(
                <option key={s} value={s}>{s.replace(/-/g," ").replace(/\b\w/g,l=>l.toUpperCase())}</option>
              ))}
            </select>
            <select className={INPUT} value={workflowFilter} onChange={e=>setWorkflowFilter(e.target.value)}>
              <option value="all">All stages</option>
              {["sales","legal","finance","completed"].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
            <select className={INPUT} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
              <option value="recent">Latest activity</option>
              <option value="oldest">Oldest first</option>
              <option value="value">Highest value</option>
              <option value="follow-up">Nearest follow-up</option>
            </select>
          </div>
        </div>

        {loading ? <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 text-sm text-slate-500">Loading lead history…</div> : null}

        {!loading ? (
          <div className="grid gap-5 xl:grid-cols-[1fr_280px] xl:items-start">
            {/* Lead cards */}
            <div className="space-y-3">
              {filtered.length ? filtered.map(lead => (
                <LeadHistoryCard key={lead.lead_id} lead={lead} formatDate={formatDate} formatMoney={formatMoney} teamBadgeLabel={teamBadgeLabel} />
              )) : (
                <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                    <DashboardIcon name="leads" className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">No history matched</p>
                  <p className="text-xs text-slate-400">Change filters to bring the timeline back into view.</p>
                </div>
              )}

              {/* Pagination */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button className={BTN_GHOST} type="button" disabled={page<=1} onClick={()=>setPage(p=>Math.max(p-1,1))}>← Prev</button>
                  <button className={BTN_GOLD}  type="button" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(p+1,totalPages))}>Next →</button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <LeadHistorySidebar stageRows={stageRows} sourceRows={sourceRows} latestLead={filtered[0]||null} filteredLeads={filtered} formatDate={formatDate} />
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}
