"use client";

import Link from "next/link";
import WorkspacePage from "../../components/dashboard/WorkspacePage";
import DashboardIcon from "../../components/dashboard/icons";

function fmt(v) {
  const n = Number(v || 0);
  return new Intl.NumberFormat("en-IN", {
    notation: n >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(n);
}

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function av(v = "?") {
  return String(v).split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("") || "?";
}

function cap(v = "") {
  return String(v).split("-").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

const STATUS_STYLE = {
  active:    { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  trial:     { dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  suspended: { dot: "bg-red-500",     badge: "bg-red-50 text-red-600 ring-1 ring-red-200" },
};

const ROLE_STYLE = {
  admin:          "bg-blue-50 text-blue-700",
  manager:        "bg-cyan-50 text-cyan-700",
  sales:          "bg-emerald-50 text-emerald-700",
  marketing:      "bg-pink-50 text-pink-700",
  support:        "bg-red-50 text-red-600",
  "legal-team":   "bg-orange-50 text-orange-700",
  "finance-team": "bg-yellow-50 text-yellow-700",
  "super-admin":  "bg-violet-50 text-violet-700",
};

const STAGE_STYLE = {
  sales:     "bg-blue-50 text-blue-700",
  legal:     "bg-orange-50 text-orange-700",
  finance:   "bg-yellow-50 text-yellow-700",
  completed: "bg-emerald-50 text-emerald-700",
};

function NavCard({ href, icon, title, desc, color }) {
  return (
    <Link href={href}
      className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all group">
      <span className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl ${color}`}>
        <DashboardIcon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="text-xs text-slate-400 truncate">{desc}</p>
      </div>
      <span className="text-slate-300 group-hover:text-slate-500 text-sm transition-colors">→</span>
    </Link>
  );
}

function SafetyCard({ icon, iconBg, label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-center gap-2.5 mb-3">
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${iconBg}`}>
          <DashboardIcon name={icon} className="h-4 w-4" />
        </span>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-800 leading-none">{fmt(value)}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}

export default function SuperAdminDashboard() {
  return (
    <WorkspacePage
      title="Super Admin Console"
      eyebrow="Platform Control"
      allowedRoles={["super-admin", "platform-admin", "platform-manager"]}
      requestBuilder={(session) => [
        { key: "summary", path: "/dashboard/summary" },
        { key: "companies", path: "/companies?page_size=6" },
        { key: "users", path: "/users?page_size=6" },
        { key: "leads", path: "/leads?page_size=5" },
        ...( ["super-admin", "platform-admin"].includes(session?.user?.role)
          ? [{ key: "safety", path: "/super-admin/safety-status" }]
          : []
        ),
      ]}
      heroStats={({ data }) => {
        if (!data?.summary) return [];
        return [
          { label: "Total Companies", value: data.summary.companies || 0, color: "#16a34a" },
          { label: "Platform Users",  value: data.summary.users || 0,     color: "#2563eb" },
          { label: "Active Leads",    value: data.summary.leads || 0,     color: "#d97706" },
          { label: "Products Listed", value: data.summary.products || 0,  color: "#9333ea" },
        ];
      }}
    >
      {({ data, error, loading }) => (
        <>
          {error   && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm font-medium mb-2">{error}</div>}
          {loading && (
            <div className="flex items-center gap-3 text-slate-400 text-sm py-10">
              <span className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              Loading platform data...
            </div>
          )}

          {!loading && data && (
            <div className="flex flex-col gap-5">

              {/* Safety guardrails */}
              {data.safety && (
                <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Guardrails</span>
                      <h2 className="text-base font-bold text-slate-800 mt-0.5">Platform Safety Status</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Root-seat limits, inactive admins, and suspended tenants watch.</p>
                    </div>
                    <Link href="/super-admin/security"
                      className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white text-slate-600 transition-colors">
                      Security Logs →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <SafetyCard icon="security"   iconBg="bg-indigo-50 text-indigo-600" label="Super Admin Count"    value={data.safety?.super_admin_count}    sub="Active root seats" />
                    <SafetyCard icon="dashboard"  iconBg="bg-blue-50 text-blue-600"    label="Max Allowed"          value={data.safety?.max_super_admins}     sub="Safety threshold" />
                    <SafetyCard icon="users"      iconBg="bg-amber-50 text-amber-600"  label="Inactive Admins"      value={data.safety?.inactive_admins}      sub="Review queue" />
                    <SafetyCard icon="company"    iconBg="bg-rose-50 text-rose-600"    label="Suspended Companies"  value={data.safety?.suspended_companies}  sub="Escalation watch" />
                  </div>
                </section>
              )}

              {/* Companies + Quick nav */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Companies */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Tenants</span>
                      <h2 className="text-sm font-bold text-slate-700 mt-0.5">Recent Companies</h2>
                    </div>
                    <Link href="/super-admin/companies" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                      View all →
                    </Link>
                  </div>

                  {(data.companies?.items || []).length ? (
                    <div className="flex flex-col gap-2">
                      {(data.companies?.items || []).map(c => {
                        const s = STATUS_STYLE[c.status] || STATUS_STYLE.trial;
                        return (
                          <div key={c.company_id}
                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {av(c.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                              <p className="text-xs text-slate-400">{c.slug} · {fmtDate(c.created_at)}</p>
                            </div>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${s.badge}`}>
                              {cap(c.status || "trial")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-300 gap-2">
                      <span className="text-4xl">🏢</span>
                      <p className="text-sm">No companies yet</p>
                    </div>
                  )}
                </div>

                {/* Quick nav */}
                <div className="flex flex-col gap-4">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-3">Quick Actions</span>
                    <div className="flex flex-col gap-2">
                      <NavCard href="/super-admin/companies"    icon="company"   title="Tenant Workspaces"  desc="Manage all onboarded companies"      color="bg-emerald-100 text-emerald-700" />
                      <NavCard href="/super-admin/users"        icon="users"     title="Platform Users"     desc="Control global access & identities"  color="bg-blue-100 text-blue-700" />
                      <NavCard href="/super-admin/audit-logs"   icon="audit"     title="Audit Logs"         desc="Review security and usage trails"    color="bg-slate-200 text-slate-700" />
                      <NavCard href="/super-admin/demo-requests" icon="demo"     title="Demo Requests"      desc="Incoming demo & trial requests"      color="bg-violet-100 text-violet-700" />
                      <NavCard href="/super-admin/settings"     icon="settings"  title="Global Settings"    desc="Configure platform-wide defaults"    color="bg-purple-100 text-purple-700" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Leads + Users */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Recent Leads */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Pipeline</span>
                      <h2 className="text-sm font-bold text-slate-700 mt-0.5">Recent Leads</h2>
                    </div>
                    <Link href="/leads" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                      Open workspace →
                    </Link>
                  </div>

                  {(data.leads?.items || []).length ? (
                    <div className="flex flex-col gap-2">
                      {(data.leads?.items || []).map(l => (
                        <Link key={l.lead_id} href={`/leads/${l.lead_id}`}
                          className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {av(l.company_name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800 truncate">{l.company_name || "Unnamed"}</p>
                            <p className="text-xs text-slate-400 truncate">
                              {l.contact_person || "No contact"} · ₹{Number(l.estimated_value || 0).toLocaleString("en-IN")}
                            </p>
                          </div>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${STAGE_STYLE[l.workflow_stage] || "bg-slate-100 text-slate-600"}`}>
                            {cap(l.workflow_stage || "sales")}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-300 gap-2">
                      <span className="text-4xl">🎯</span>
                      <p className="text-sm">No lead activity yet</p>
                    </div>
                  )}
                </div>

                {/* Users */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Directory</span>
                      <h2 className="text-sm font-bold text-slate-700 mt-0.5">Platform Users</h2>
                    </div>
                    <Link href="/super-admin/users" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                      Manage all →
                    </Link>
                  </div>

                  {(data.users?.items || []).length ? (
                    <div className="flex flex-col gap-2">
                      {(data.users?.items || []).map(u => (
                        <div key={u.user_id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {av(u.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800 truncate">{u.name || "Unknown"}</p>
                            <p className="text-xs text-slate-400 truncate">{u.email || "No email"}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ROLE_STYLE[u.role] || "bg-slate-100 text-slate-600"}`}>
                              {cap(u.role || "user")}
                            </span>
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${u.is_active === false ? "bg-red-400" : "bg-emerald-400"}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-300 gap-2">
                      <span className="text-4xl">👥</span>
                      <p className="text-sm">No users loaded</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </>
      )}
    </WorkspacePage>
  );
}
