"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../components/dashboard/DashboardShell";
import DashboardIcon from "../../components/dashboard/icons";
import { apiRequest } from "../../lib/api";
import { customerProfileSummary, parseCustomerProfile, stripCustomerProfile } from "../../lib/customerProfile";
import { loadSession } from "../../lib/session";
import {
  formatScopedError,
  isPlatformConsoleRole,
  loadTeamScopeResources,
  resolveSessionCompanyId,
  teamBadgeLabel,
  teamSelectLabel,
} from "../../lib/teamScope";

const ALLOWED_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager", "sales", "marketing", "support", "viewer"];
const STATUS_STYLES = {
  active: { label: "Active", badge: "border-[#e7d7ab] bg-[#fff4d9] text-[#8d6e27]" },
  inactive: { label: "Inactive", badge: "border-rose-200 bg-rose-50 text-rose-700" },
  suspended: { label: "Suspended", badge: "border-amber-200 bg-amber-50 text-amber-700" },
};
const PANEL_CLASS = "rounded-[30px] border border-[#eadfcd] bg-white/82 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const SOFT_PANEL_CLASS = "rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] p-4";
const KICKER_CLASS = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";
const INPUT_CLASS = "w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none transition placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const PRIMARY_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2.5 text-sm font-semibold text-[#060710] shadow-[0_16px_30px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f] disabled:cursor-not-allowed disabled:opacity-60";
const SECONDARY_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710] disabled:cursor-not-allowed disabled:opacity-60";
const SOFT_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-2.5 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:bg-white hover:text-[#060710] disabled:cursor-not-allowed disabled:opacity-60";
const DANGER_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60";
const PILL_CLASS = "inline-flex rounded-full px-3 py-1 text-[11px] font-bold";
const TINT_PANEL_CLASS = "rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4";
const buildPath = (path, params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === "all") {
      return;
    }
    query.set(key, value);
  });
  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
};

function money(value) { return `INR ${Number(value || 0).toLocaleString("en-IN")}`; }
function dateOnly(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function isOverdue(value) {
  if (!value) return false;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}
function parseCustomerNotes(notes) {
  const cleanNotes = stripCustomerProfile(notes);
  if (!cleanNotes) return [];
  return String(cleanNotes).split("\n").map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const match = line.match(/^\[(.+?)\]\s+([^:]+):\s*(.+)$/);
    if (match) return { id: `${match[1]}-${index}`, author: match[2].trim(), content: match[3].trim(), createdAt: match[1] };
    return { id: `note-${index}`, author: "Team", content: line, createdAt: "" };
  }).reverse();
}
function latestNote(notes) { return parseCustomerNotes(notes)[0]?.content || ""; }
function customerNoteCount(notes) { return parseCustomerNotes(notes).length; }
function getStatusStyle(status) { return STATUS_STYLES[status] || STATUS_STYLES.active; }
function initials(name = "Customer") {
  return String(name).split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
}

function MetricCard({ label, value, icon, tint }) {
  return (
    <article className={PANEL_CLASS}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className={KICKER_CLASS}>{label}</p>
          <h3 className="text-[1.7rem] font-black leading-none text-slate-900">{value}</h3>
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-2xl ${tint}`}>
          <DashboardIcon name={icon} className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

function StatCell({ label, value, danger = false }) {
  return (
    <div className={SOFT_PANEL_CLASS}>
      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <strong className={`mt-2 block text-[15px] font-bold ${danger ? "text-rose-600" : "text-slate-900"}`}>{value}</strong>
    </div>
  );
}

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
  const [savingState, setSavingState] = useState("");

  const role = session?.user?.role || "viewer";
  const isPlatformConsole = isPlatformConsoleRole(role);
  const canManage = role !== "viewer";
  const canDelete = ["super-admin", "platform-admin", "platform-manager", "admin", "manager"].includes(role);
  const teamCompanyId = isPlatformConsole ? (companyFilter !== "all" ? companyFilter : "") : resolveSessionCompanyId(session);
  const selectedTeam = useMemo(() => teams.find((team) => team.team_id === teamFilter) || null, [teamFilter, teams]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const nextCustomers = customers.filter((customer) => {
      const text = [customer.name, customer.company_name, customer.email, customer.phone, customer.status, customer.assigned_to_name, customer.team_name, customer.team_code, latestNote(customer.notes)].filter(Boolean).join(" ").toLowerCase();
      const matchesSearch = !query || text.includes(query);
      const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
      const hasFollowUp = Boolean(customer.next_follow_up);
      const overdue = isOverdue(customer.next_follow_up);
      const matchesFollowUp = followUpFilter === "all" || (followUpFilter === "scheduled" && hasFollowUp) || (followUpFilter === "upcoming" && hasFollowUp && !overdue) || (followUpFilter === "overdue" && overdue) || (followUpFilter === "none" && !hasFollowUp);
      return matchesSearch && matchesStatus && matchesFollowUp;
    });

    nextCustomers.sort((left, right) => {
      if (sortBy === "name") return String(left.company_name || left.name || "").localeCompare(String(right.company_name || right.name || ""));
      if (sortBy === "value") return Number(right.total_value || 0) - Number(left.total_value || 0);
      if (sortBy === "follow-up") {
        const leftTime = left.next_follow_up ? new Date(left.next_follow_up).getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.next_follow_up ? new Date(right.next_follow_up).getTime() : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      }
      return new Date(right.updated_at || right.created_at || 0) - new Date(left.updated_at || left.created_at || 0);
    });

    return nextCustomers;
  }, [customers, followUpFilter, search, sortBy, statusFilter]);

  const stats = useMemo(() => ({
    total: customers.length,
    active: customers.filter((customer) => customer.status === "active").length,
    scheduled: customers.filter((customer) => customer.next_follow_up).length,
    overdue: customers.filter((customer) => isOverdue(customer.next_follow_up)).length,
    value: customers.reduce((sum, customer) => sum + Number(customer.total_value || 0), 0),
  }), [customers]);

  async function loadCustomers(activeSession, nextCompanyFilter = "all", nextTeamFilter = "all") {
    setLoading(true);
    setError("");
    try {
      const customerResponse = await apiRequest(
        buildPath("/customers", {
          page_size: 120,
          company_id: isPlatformConsole ? nextCompanyFilter : undefined,
          team_ids: nextTeamFilter,
        }),
        { token: activeSession.token }
      );
      setCustomers(customerResponse.items || []);
    } catch (requestError) {
      setError(formatScopedError(requestError, "Could not load customers."));
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) return router.replace("/login");
    if (!ALLOWED_ROLES.includes(activeSession.user?.role)) return router.replace("/dashboard");
    setSession(activeSession);
    if (isPlatformConsoleRole(activeSession.user?.role)) {
      apiRequest("/companies?page_size=120", { token: activeSession.token })
        .then((response) => {
          const items = response.items || [];
          setCompanies(items);
          setCompanyFilter(activeSession.company?.company_id || activeSession.user?.company_id || "all");
        })
        .catch((requestError) => setError(formatScopedError(requestError, "Could not load companies.")));
    }
  }, [router]);

  useEffect(() => {
    if (!session) {
      return;
    }
    loadCustomers(session, companyFilter, teamFilter);
  }, [companyFilter, isPlatformConsole, session, teamFilter]);

  useEffect(() => {
    if (!session?.token || !teamCompanyId) {
      setTeams([]);
      setTeamFilter("all");
      return;
    }

    let ignore = false;

    (async () => {
      try {
        const { teams: nextTeams } = await loadTeamScopeResources(session.token, {
          companyId: teamCompanyId,
        });

        if (ignore) {
          return;
        }

        setTeams(nextTeams || []);
        if (teamFilter !== "all" && !(nextTeams || []).some((team) => team.team_id === teamFilter)) {
          setTeamFilter("all");
        }
      } catch (_error) {
        if (!ignore) {
          setTeams([]);
          setTeamFilter("all");
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [session, teamCompanyId, teamFilter]);

  async function deleteCustomer(customerId, customerName) {
    if (!canDelete || !session?.token) return;
    if (!window.confirm(`Delete customer "${customerName}"?`)) return;
    setSavingState(customerId);
    setError("");
    try {
      await apiRequest(`/customers/${customerId}`, { method: "DELETE", token: session.token });
      setCustomers((current) => current.filter((item) => item.customer_id !== customerId));
    } catch (requestError) {
      setError(formatScopedError(requestError, "Could not delete this customer."));
    } finally {
      setSavingState("");
    }
  }

  function exportCsv() {
    if (!filteredCustomers.length) {
      setError("No customer data is available for export.");
      return;
    }
    const rows = [["Customer", "Company", "Email", "Phone", "Status", "Owner", "Team", "Total Value", "Next Follow-up", "Latest Note"], ...filteredCustomers.map((customer) => [customer.name || "", customer.company_name || "", customer.email || "", customer.phone || "", customer.status || "", customer.assigned_to_name || "Unassigned", teamBadgeLabel(customer) || "", Number(customer.total_value || 0), customer.next_follow_up || "", latestNote(customer.notes) || ""])];
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <DashboardShell session={session} title="Customers" hideTitle heroStats={[]}>
      <div className="mx-auto grid max-w-[1280px] gap-5">
        {error ? <div className={`${PANEL_CLASS} border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700`}>{error}</div> : null}
        {loading ? <div className={`${PANEL_CLASS} px-5 py-4 text-sm font-semibold text-slate-600`}>Loading customers...</div> : null}
        {!loading ? (
          <>
            <section className={`${PANEL_CLASS} flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between`}>
              <div className="space-y-1">
                <span className={KICKER_CLASS}>Customer Desk</span>
                <h2 className="text-[2rem] font-semibold tracking-tight text-[#060710] md:text-[2.5rem]">Customers</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className={SECONDARY_BUTTON_CLASS} type="button" onClick={exportCsv}>
                  <DashboardIcon name="documents" className="h-4 w-4" />
                  Export CSV
                </button>
                {canManage ? (
                  <Link href="/customers/new" className={PRIMARY_BUTTON_CLASS}>
                    <DashboardIcon name="customers" className="h-4 w-4" />
                    Add Customer
                  </Link>
                ) : null}
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Total Customers" value={stats.total} icon="customers" tint="bg-[#fff0c8] text-[#8d6e27]" />
              <MetricCard label="Active Accounts" value={stats.active} icon="company" tint="bg-[#fff7e8] text-[#8d6e27]" />
              <MetricCard label="Scheduled Follow-ups" value={stats.scheduled} icon="calendar" tint="bg-[#fff7e8] text-[#8d6e27]" />
              <MetricCard label="Overdue Follow-ups" value={stats.overdue} icon="tasks" tint="bg-rose-50 text-rose-600" />
              <MetricCard label="Portfolio Value" value={money(stats.value)} icon="finance" tint="bg-[#fff0c8] text-[#8d6e27]" />
            </section>

            <section className={PANEL_CLASS}>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className={`${PILL_CLASS} border border-[#eadfcd] bg-[#fffaf1] text-[#7c6d55]`}>
                  {filteredCustomers.length} visible
                </span>
                <span className={`${PILL_CLASS} border border-[#eadfcd] bg-[#fff4d9] text-[#8d6e27]`}>
                  {stats.active} active
                </span>
                <span className={`${PILL_CLASS} border border-amber-200 bg-amber-50 text-amber-700`}>
                  {stats.scheduled} scheduled
                </span>
                <span className={`${PILL_CLASS} border border-rose-200 bg-rose-50 text-rose-700`}>
                  {stats.overdue} overdue
                </span>
              </div>
              <div className={`grid gap-4 ${isPlatformConsole || teams.length > 1 ? "xl:grid-cols-[minmax(240px,1.3fr)_repeat(5,minmax(150px,0.7fr))]" : "xl:grid-cols-[minmax(280px,1.6fr)_repeat(3,minmax(170px,0.72fr))]"}`}>
                <label className="grid gap-2">
                  <span className={KICKER_CLASS}>Search</span>
                  <div className="relative">
                    <DashboardIcon name="leads" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input className={`${INPUT_CLASS} pl-11`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, company, email, phone, note" />
                  </div>
                </label>
                {isPlatformConsole ? (
                  <label className="grid gap-2">
                    <span className={KICKER_CLASS}>Company</span>
                    <select className={INPUT_CLASS} value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
                      <option value="all">All companies</option>
                      {companies.map((company) => <option key={company.company_id} value={company.company_id}>{company.name}</option>)}
                    </select>
                  </label>
                ) : null}
                {teams.length > 1 ? (
                  <label className="grid gap-2">
                    <span className={KICKER_CLASS}>Team</span>
                    <select className={INPUT_CLASS} value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
                      <option value="all">All teams</option>
                      {teams.map((team) => <option key={team.team_id} value={team.team_id}>{teamSelectLabel(team)}</option>)}
                    </select>
                  </label>
                ) : null}
                <label className="grid gap-2">
                  <span className={KICKER_CLASS}>Status</span>
                  <select className={INPUT_CLASS} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className={KICKER_CLASS}>Follow-up</span>
                  <select className={INPUT_CLASS} value={followUpFilter} onChange={(event) => setFollowUpFilter(event.target.value)}>
                    <option value="all">All follow-ups</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="overdue">Overdue</option>
                    <option value="none">No follow-up</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className={KICKER_CLASS}>Sort</span>
                  <select className={INPUT_CLASS} value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                    <option value="recent">Most recent</option>
                    <option value="name">Company name</option>
                    <option value="value">Highest value</option>
                    <option value="follow-up">Nearest follow-up</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              {filteredCustomers.length ? filteredCustomers.map((customer) => {
                const notePreview = latestNote(customer.notes);
                const notesCount = customerNoteCount(customer.notes);
                const tone = getStatusStyle(customer.status);
                const overdue = isOverdue(customer.next_follow_up);
                const summary = customerProfileSummary(parseCustomerProfile(customer.notes));

                return (
                  <article key={customer.customer_id} className={`${PANEL_CLASS} flex flex-col gap-5 overflow-hidden`}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-[linear-gradient(145deg,#10111d_0%,#2a2431_100%)] text-base font-black text-white shadow-[0_18px_28px_rgba(6,7,16,0.18)]">
                          {initials(customer.name || customer.company_name || "Customer")}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={KICKER_CLASS}>Account</span>
                            {customer.customer_id ? (
                              <span className="rounded-full border border-[#eadfcd] bg-[#fffaf1] px-2.5 py-1 text-[11px] font-bold text-[#7c6d55]">
                                {customer.customer_id}
                              </span>
                            ) : null}
                          </div>
                          <h3 className="truncate text-[1.55rem] font-black leading-tight tracking-tight text-slate-900">
                            {customer.name || "Unnamed customer"}
                          </h3>
                          <p className="text-sm font-medium text-[#736650]">
                            {customer.company_name || "No company name"}
                          </p>
                        </div>
                      </div>
                      <span className={`${PILL_CLASS} border ${tone.badge}`}>{tone.label}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className={`${PILL_CLASS} border border-[#eadfcd] bg-[#fff4d9] text-[#8d6e27]`}>Notes {notesCount}</span>
                      <span className={`${PILL_CLASS} border border-slate-200 bg-slate-100 text-slate-600`}>{customer.assigned_to_name || "Unassigned"}</span>
                      {teamBadgeLabel(customer) ? <span className={`${PILL_CLASS} border border-[#eadfcd] bg-white text-[#7c6d55]`}>{teamBadgeLabel(customer)}</span> : null}
                      <span className={`${PILL_CLASS} border ${overdue ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                        {overdue ? "Follow-up overdue" : customer.next_follow_up ? "Follow-up set" : "No follow-up"}
                      </span>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className={`${TINT_PANEL_CLASS} sm:col-span-2`}>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Email</span>
                                <strong className="mt-2 block break-words text-[15px] font-bold text-slate-900">{customer.email || "No email"}</strong>
                              </div>
                              <div>
                                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Phone</span>
                                <strong className="mt-2 block text-[15px] font-bold text-slate-900">{customer.phone || "No phone"}</strong>
                              </div>
                            </div>
                          </div>
                          <StatCell label="Owner" value={customer.assigned_to_name || "Unassigned"} />
                          <StatCell label="Team" value={teamBadgeLabel(customer) || "Auto team"} />
                        </div>

                        <div className={TINT_PANEL_CLASS}>
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Latest Note</span>
                            <strong className="text-xs font-bold text-slate-500">{notesCount} saved</strong>
                          </div>
                          <p className="min-h-[72px] text-sm leading-7 text-slate-600">{notePreview || "No notes added yet."}</p>
                        </div>

                        {summary ? (
                          <div className={TINT_PANEL_CLASS}>
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Company Summary</span>
                              <strong className="text-xs font-bold text-slate-500">{parseCustomerProfile(customer.notes).industry || "Profile"}</strong>
                            </div>
                            <p className="text-sm leading-7 text-slate-600">{summary}</p>
                          </div>
                        ) : null}
                      </div>

                      <div className="grid gap-3">
                        <div className="rounded-[24px] border border-[#eadfcd] bg-[linear-gradient(135deg,#fffdf8_0%,#fff4dc_100%)] p-4">
                          <span className={KICKER_CLASS}>Next Follow-up</span>
                          <strong className={`mt-3 block text-xl font-black ${overdue ? "text-rose-600" : "text-[#060710]"}`}>
                            {dateOnly(customer.next_follow_up)}
                          </strong>
                          <p className="mt-2 text-sm leading-6 text-[#756752]">
                            {overdue ? "This account needs attention now." : customer.next_follow_up ? "The next account touchpoint is already lined up." : "No follow-up has been scheduled yet."}
                          </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <StatCell label="Value" value={money(customer.total_value)} />
                          <div className={TINT_PANEL_CLASS}>
                            <span className={KICKER_CLASS}>Last Update</span>
                            <strong className="mt-3 block text-lg font-black text-[#060710]">
                              {dateOnly(customer.updated_at || customer.created_at)}
                            </strong>
                            <p className="mt-2 text-sm leading-6 text-[#756752]">
                              Latest customer record update or creation date.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={`grid gap-3 ${canManage ? "grid-cols-[1fr_1fr_auto]" : "grid-cols-1"}`}>
                      <Link className={SECONDARY_BUTTON_CLASS} href={`/customers/${customer.customer_id}`}>
                        <DashboardIcon name="message" className="h-4 w-4" />
                        View
                      </Link>
                      {canManage ? <Link className={SOFT_BUTTON_CLASS} href={`/customers/${customer.customer_id}/edit`}><DashboardIcon name="settings" className="h-4 w-4" />Edit</Link> : null}
                      {canDelete ? <button className={DANGER_BUTTON_CLASS} type="button" onClick={() => deleteCustomer(customer.customer_id, customer.company_name || customer.name || "customer")} disabled={savingState === customer.customer_id} title="Delete customer"><DashboardIcon name="audit" className="h-4 w-4" /></button> : null}
                    </div>
                  </article>
                );
              }) : (
                <article className={`${PANEL_CLASS} grid min-h-[280px] place-items-center p-8 text-center xl:col-span-2`}>
                  <div className="space-y-4">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                      <DashboardIcon name="customers" className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-slate-900">No customers matched the current filters</h3>
                      <p className="max-w-xl text-sm leading-6 text-slate-600">{teamFilter !== "all" && selectedTeam ? `Try a different search or clear ${teamSelectLabel(selectedTeam)} to view more customers.` : "Try a different search or clear the filters to view the full list."}</p>
                    </div>
                  </div>
                </article>
              )}
            </section>
          </>
        ) : null}
      </div>

    </DashboardShell>
  );
}
