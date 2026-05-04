"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../../components/dashboard/DashboardShell";
import DashboardIcon from "../../components/dashboard/icons";
import { CustomerFollowUpBadge, CustomerStatusBadge, isCustomerFollowUpOverdue } from "../../components/customers/CustomerStatusBits";
import { apiRequest } from "../../lib/api";
import { stripCustomerProfile } from "../../lib/customerProfile";
import { loadSession } from "../../lib/session";
import { formatScopedError, isPlatformConsoleRole, loadTeamScopeResources, resolveSessionCompanyId, teamBadgeLabel, teamSelectLabel } from "../../lib/teamScope";
import { AlertError } from "../../components/ui/Alert";

const ALLOWED_ROLES = ["super-admin","platform-admin","platform-manager","admin","manager","sales","marketing","support","viewer"];
const C = {
  panel: "rounded-2xl border border-slate-100 bg-white shadow-sm",
  input: "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50",
  btn: "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-semibold transition disabled:opacity-50",
  kicker: "text-[10px] font-bold uppercase tracking-widest text-slate-400",
};
const Btn = { gold: `${C.btn} border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:border-amber-400`, ghost: `${C.btn} border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900`, danger: `${C.btn} border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100` };

function money(v) { return `₹${Number(v||0).toLocaleString("en-IN")}`; }
function latestNote(notes) {
  const clean = stripCustomerProfile(notes);
  if (!clean) return "";
  return String(clean).split("\n").map(l=>l.trim()).filter(Boolean).reverse()[0]?.replace(/^\[.+?\]\s+[^:]+:\s*/,"") || "";
}
function initials(name="C") { return String(name).split(" ").filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()||"").join(""); }
function buildPath(path, params={}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k,v])=>{ if(v&&v!=="all") q.set(k,v); });
  const s = q.toString(); return s ? `${path}?${s}` : path;
}

const STAT_CFG = [
  { key:"total",    label:"Total",     icon:"customers", bg:"bg-slate-100",   text:"text-slate-500"   },
  { key:"active",   label:"Active",    icon:"company",   bg:"bg-emerald-100", text:"text-emerald-700" },
  { key:"scheduled",label:"Scheduled", icon:"calendar",  bg:"bg-sky-100",     text:"text-sky-700"     },
  { key:"overdue",  label:"Overdue",   icon:"tasks",     bg:"bg-rose-100",    text:"text-rose-600"    },
  { key:"value",    label:"Value",     icon:"finance",   bg:"bg-amber-100",   text:"text-amber-700",  money:true },
];

export default function CustomersPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [teams, setTeams] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [followUpFilter, setFollowUpFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [saving, setSaving] = useState("");

  const role = session?.user?.role || "viewer";
  const isPlatformConsole = isPlatformConsoleRole(role);
  const canManage = role !== "viewer";
  const canDelete = ["super-admin","platform-admin","platform-manager","admin","manager"].includes(role);
  const teamCompanyId = isPlatformConsole ? (companyFilter !== "all" ? companyFilter : "") : resolveSessionCompanyId(session);
  const selectedTeam = useMemo(()=>teams.find(t=>t.team_id===teamFilter)||null,[teamFilter,teams]);

  const filtered = useMemo(()=>{
    const q = search.trim().toLowerCase();
    const list = customers.filter(c=>{
      const txt = [c.name,c.company_name,c.email,c.phone,c.status,c.assigned_to_name,c.team_name,latestNote(c.notes)].filter(Boolean).join(" ").toLowerCase();
      const overdue = isCustomerFollowUpOverdue(c.next_follow_up);
      const has = Boolean(c.next_follow_up);
      return (!q||txt.includes(q)) &&
        (statusFilter==="all"||c.status===statusFilter) &&
        (followUpFilter==="all"||(followUpFilter==="scheduled"&&has)||(followUpFilter==="upcoming"&&has&&!overdue)||(followUpFilter==="overdue"&&overdue)||(followUpFilter==="none"&&!has));
    });
    list.sort((a,b)=>{
      if(sortBy==="name") return String(a.company_name||a.name||"").localeCompare(String(b.company_name||b.name||""));
      if(sortBy==="value") return Number(b.total_value||0)-Number(a.total_value||0);
      if(sortBy==="follow-up"){
        const at=a.next_follow_up?new Date(a.next_follow_up).getTime():Number.MAX_SAFE_INTEGER;
        const bt=b.next_follow_up?new Date(b.next_follow_up).getTime():Number.MAX_SAFE_INTEGER;
        return at-bt;
      }
      return new Date(b.updated_at||b.created_at||0)-new Date(a.updated_at||a.created_at||0);
    });
    return list;
  },[customers,followUpFilter,search,sortBy,statusFilter]);

  const stats = useMemo(()=>({
    total: customers.length,
    active: customers.filter(c=>c.status==="active").length,
    scheduled: customers.filter(c=>c.next_follow_up).length,
    overdue: customers.filter(c=>isCustomerFollowUpOverdue(c.next_follow_up)).length,
    value: customers.reduce((s,c)=>s+Number(c.total_value||0),0),
  }),[customers]);

  async function loadCustomers(s, cf="all", tf="all") {
    setLoading(true); setError("");
    try {
      const r = await apiRequest(buildPath("/customers",{page_size:120,company_id:isPlatformConsole?cf:undefined,team_ids:tf}),{token:s.token});
      setCustomers(r.items||[]);
    } catch(e) { setError(formatScopedError(e,"Could not load customers.")); setCustomers([]); }
    finally { setLoading(false); }
  }

  useEffect(()=>{
    const s = loadSession();
    if(!s) return router.replace("/login");
    if(!ALLOWED_ROLES.includes(s.user?.role)) return router.replace("/dashboard");
    setSession(s);
    if(isPlatformConsoleRole(s.user?.role)){
      apiRequest("/companies?page_size=120",{token:s.token}).then(r=>{
        setCompanies(r.items||[]);
        setCompanyFilter(s.company?.company_id||s.user?.company_id||"all");
      }).catch(e=>setError(formatScopedError(e,"Could not load companies.")));
    }
  },[router]);

  useEffect(()=>{ if(session) loadCustomers(session,companyFilter,teamFilter); },[companyFilter,isPlatformConsole,session,teamFilter]);

  useEffect(()=>{
    if(!session?.token||!teamCompanyId){ setTeams([]); setTeamFilter("all"); return; }
    let ignore=false;
    (async()=>{
      try {
        const {teams:t}=await loadTeamScopeResources(session.token,{companyId:teamCompanyId});
        if(ignore) return;
        setTeams(t||[]);
        if(teamFilter!=="all"&&!(t||[]).some(x=>x.team_id===teamFilter)) setTeamFilter("all");
      } catch(_){ if(!ignore){ setTeams([]); setTeamFilter("all"); } }
    })();
    return ()=>{ ignore=true; };
  },[session,teamCompanyId,teamFilter]);

  async function deleteCustomer(id, name) {
    if(!canDelete||!session?.token) return;
    if(!window.confirm(`Delete customer "${name}"?`)) return;
    setSaving(id); setError("");
    try {
      await apiRequest(`/customers/${id}`,{method:"DELETE",token:session.token});
      setCustomers(c=>c.filter(x=>x.customer_id!==id));
    } catch(e){ setError(formatScopedError(e,"Could not delete this customer.")); }
    finally { setSaving(""); }
  }

  function exportCsv() {
    if(!filtered.length){ setError("No data to export."); return; }
    const rows=[["Customer","Company","Email","Phone","Status","Owner","Team","Total Value","Next Follow-up","Latest Note"],...filtered.map(c=>[c.name||"",c.company_name||"",c.email||"",c.phone||"",c.status||"",c.assigned_to_name||"Unassigned",teamBadgeLabel(c)||"",Number(c.total_value||0),c.next_follow_up||"",latestNote(c.notes)||""])];
    const blob=new Blob([rows.map(r=>r.map(cell=>`"${String(cell).replace(/"/g,'""')}"`).join(",")).join("\n")],{type:"text/csv;charset=utf-8;"});
    const url=window.URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`customers-${new Date().toISOString().slice(0,10)}.csv`; a.click(); window.URL.revokeObjectURL(url);
  }

  function exportHtml() {
    if(!filtered.length){ setError("No data to export."); return; }
    const esc=v=>String(v??"").replace(/[&<>"']/g,c=({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    const rows=filtered.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.company_name)}</td><td>${esc(c.email)}</td><td>${esc(c.phone)}</td><td>${esc(c.status)}</td><td>${esc(c.assigned_to_name||"Unassigned")}</td><td>${esc(teamBadgeLabel(c))}</td><td>${esc(money(c.total_value))}</td><td>${esc(c.next_follow_up)}</td></tr>`).join("");
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>Customers</title><style>body{font-family:Arial,sans-serif}table{border-collapse:collapse;width:100%}th,td{border:1px solid #e2e8f0;padding:8px;font-size:13px}th{background:#f8fafc}</style></head><body><h2>Customers Export</h2><table><thead><tr><th>Customer</th><th>Company</th><th>Email</th><th>Phone</th><th>Status</th><th>Owner</th><th>Team</th><th>Value</th><th>Next Follow-up</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const blob=new Blob([html],{type:"application/vnd.ms-excel;charset=utf-8;"}); const url=window.URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`customers-${new Date().toISOString().slice(0,10)}.xls`; a.click(); window.URL.revokeObjectURL(url);
  }

  return (
    <DashboardShell session={session} title="Customers" hideTitle heroStats={[]}>
      <div className="mx-auto max-w-[1320px] space-y-5 px-1">
        {error ? <AlertError message={error} onDismiss={()=>setError("")} /> : null}

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={C.kicker}>Customer Desk</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">Customers</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={Btn.ghost} type="button" onClick={exportCsv}><DashboardIcon name="documents" className="h-4 w-4" />CSV</button>
            <button className={Btn.ghost} type="button" onClick={exportHtml}><DashboardIcon name="documents" className="h-4 w-4" />Excel</button>
            {canManage ? <Link href="/customers/new" className={Btn.gold}><DashboardIcon name="customers" className="h-4 w-4" />Add Customer</Link> : null}
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {STAT_CFG.map(s=>(
            <div key={s.key} className={`${C.panel} flex items-center gap-3 px-4 py-3.5`}>
              <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${s.bg} ${s.text}`}>
                <DashboardIcon name={s.icon} className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className={C.kicker}>{s.label}</p>
                <p className="mt-0.5 text-lg font-bold text-slate-900 leading-none">{s.money ? money(stats[s.key]) : stats[s.key]}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className={`${C.panel} px-4 py-4`}>
          <div className={`grid gap-3 ${isPlatformConsole||teams.length>1?"xl:grid-cols-6":"xl:grid-cols-4"}`}>
            <div className="relative xl:col-span-2">
              <DashboardIcon name="leads" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className={`${C.input} pl-10`} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, company, email, phone…" />
            </div>
            {isPlatformConsole ? (
              <select className={C.input} value={companyFilter} onChange={e=>setCompanyFilter(e.target.value)}>
                <option value="all">All companies</option>
                {companies.map(c=><option key={c.company_id} value={c.company_id}>{c.name}</option>)}
              </select>
            ) : null}
            {teams.length>1 ? (
              <select className={C.input} value={teamFilter} onChange={e=>setTeamFilter(e.target.value)}>
                <option value="all">All teams</option>
                {teams.map(t=><option key={t.team_id} value={t.team_id}>{teamSelectLabel(t)}</option>)}
              </select>
            ) : null}
            <select className={C.input} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
            <select className={C.input} value={followUpFilter} onChange={e=>setFollowUpFilter(e.target.value)}>
              <option value="all">All follow-ups</option>
              <option value="upcoming">Upcoming</option>
              <option value="overdue">Overdue</option>
              <option value="none">No follow-up</option>
            </select>
            <select className={C.input} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
              <option value="recent">Most recent</option>
              <option value="name">Company name</option>
              <option value="value">Highest value</option>
              <option value="follow-up">Nearest follow-up</option>
            </select>
          </div>
          <p className="mt-3 text-xs text-slate-400">{filtered.length} of {customers.length} customers</p>
        </div>

        {/* ── List ── */}
        {loading ? (
          <div className={`${C.panel} px-5 py-4 text-sm text-slate-500`}>Loading customers…</div>
        ) : filtered.length ? (
          <div className="space-y-2.5">
            {filtered.map(customer=>{
              const overdue = isCustomerFollowUpOverdue(customer.next_follow_up);
              const note = latestNote(customer.notes);
              return (
                <article key={customer.customer_id} className={`${C.panel} flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center`}>
                  {/* Avatar + identity */}
                  <div className="flex min-w-0 flex-1 items-center gap-3.5">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-sm font-bold text-white">
                      {initials(customer.name||customer.company_name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-slate-900">{customer.name||"Unnamed"}</h3>
                        <CustomerStatusBadge status={customer.status} />
                      </div>
                      <p className="truncate text-xs text-slate-500">{customer.company_name||"No company"}</p>
                      <p className="truncate text-xs text-slate-400">{[customer.email,customer.phone].filter(Boolean).join(" · ")||"No contact"}</p>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 sm:shrink-0">
                    <span><span className={C.kicker}>Owner</span><br /><strong className="text-slate-700">{customer.assigned_to_name||"Unassigned"}</strong></span>
                    <span><span className={C.kicker}>Team</span><br /><strong className="text-slate-700">{teamBadgeLabel(customer)||"—"}</strong></span>
                    <span><span className={C.kicker}>Value</span><br /><strong className="text-slate-700">{money(customer.total_value)}</strong></span>
                    <span><span className={C.kicker}>Follow-up</span><br /><CustomerFollowUpBadge value={customer.next_follow_up} /></span>
                  </div>

                  {/* Note preview */}
                  {note ? <p className="hidden max-w-[220px] truncate text-xs text-slate-400 xl:block" title={note}>{note}</p> : null}

                  {/* Actions */}
                  <div className="flex shrink-0 gap-2">
                    <Link className={Btn.ghost} href={`/customers/${customer.customer_id}`}><DashboardIcon name="message" className="h-3.5 w-3.5" />View</Link>
                    {canManage ? <Link className={Btn.ghost} href={`/customers/${customer.customer_id}/edit`}><DashboardIcon name="settings" className="h-3.5 w-3.5" />Edit</Link> : null}
                    {canDelete ? <button className={Btn.danger} type="button" onClick={()=>deleteCustomer(customer.customer_id,customer.company_name||customer.name||"customer")} disabled={saving===customer.customer_id}><DashboardIcon name="audit" className="h-3.5 w-3.5" /></button> : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={`${C.panel} flex min-h-[260px] flex-col items-center justify-center gap-3 text-center`}>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
              <DashboardIcon name="customers" className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No customers matched</p>
            <p className="max-w-sm text-xs text-slate-400">{teamFilter!=="all"&&selectedTeam?`Try clearing the ${teamSelectLabel(selectedTeam)} filter.`:"Adjust search or filters to see results."}</p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
