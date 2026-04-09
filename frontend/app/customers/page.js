"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../components/dashboard/DashboardShell";
import DashboardIcon from "../../components/dashboard/icons";
import { apiRequest } from "../../lib/api";
import { loadSession } from "../../lib/session";

const ALLOWED_ROLES = ["admin", "manager", "sales", "marketing", "support", "viewer"];
const STATUS_STYLES = {
  active: { label: "Active", badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  inactive: { label: "Inactive", badge: "border-rose-200 bg-rose-50 text-rose-700" },
  suspended: { label: "Suspended", badge: "border-amber-200 bg-amber-50 text-amber-700" },
};

function money(value) { return `INR ${Number(value || 0).toLocaleString("en-IN")}`; }
function dateOnly(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function dateTime(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
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
  if (!notes) return [];
  return String(notes).split("\n").map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const match = line.match(/^\[(.+?)\]\s+([^:]+):\s*(.+)$/);
    if (match) return { id: `${match[1]}-${index}`, author: match[2].trim(), content: match[3].trim(), createdAt: match[1] };
    return { id: `note-${index}`, author: "Team", content: line, createdAt: "" };
  }).reverse();
}
function latestNote(notes) { return parseCustomerNotes(notes)[0]?.content || ""; }
function customerNoteCount(notes) { return parseCustomerNotes(notes).length; }
function titleCase(value) { return String(value || "").split("-").filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(" "); }
function getStatusStyle(status) { return STATUS_STYLES[status] || STATUS_STYLES.active; }
function createEditForm(customer = null) {
  return {
    customer_id: customer?.customer_id || "",
    name: customer?.name || "",
    company_name: customer?.company_name || "",
    email: customer?.email || "",
    phone: customer?.phone || "",
    status: customer?.status || "active",
    total_value: String(customer?.total_value || ""),
    assigned_to: customer?.assigned_to || "",
    next_follow_up: customer?.next_follow_up ? new Date(customer.next_follow_up).toISOString().slice(0, 16) : "",
  };
}
function initials(name = "Customer") {
  return String(name).split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
}

function MetricCard({ label, value, icon, tint }) {
  return (
    <article className="crm-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
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
    <div className="crm-surface-soft p-4">
      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <strong className={`mt-2 block text-[15px] font-bold ${danger ? "text-rose-600" : "text-slate-900"}`}>{value}</strong>
    </div>
  );
}

export default function CustomersPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [followUpFilter, setFollowUpFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [detailCustomerId, setDetailCustomerId] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [followUpDraft, setFollowUpDraft] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(createEditForm());
  const [savingState, setSavingState] = useState("");

  const role = session?.user?.role || "viewer";
  const canManage = role !== "viewer";
  const canDelete = ["admin", "manager"].includes(role);
  const canAssign = ["admin", "manager"].includes(role);

  const selectedCustomer = useMemo(() => customers.find((customer) => customer.customer_id === detailCustomerId) || null, [customers, detailCustomerId]);
  const selectedCustomerNotes = useMemo(() => parseCustomerNotes(selectedCustomer?.notes), [selectedCustomer?.notes]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const nextCustomers = customers.filter((customer) => {
      const text = [customer.name, customer.company_name, customer.email, customer.phone, customer.status, customer.assigned_to_name, latestNote(customer.notes)].filter(Boolean).join(" ").toLowerCase();
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

  async function loadCustomers(activeSession) {
    setLoading(true);
    setError("");
    try {
      const requests = [apiRequest("/customers?page_size=120", { token: activeSession.token })];
      if (activeSession.user?.role !== "viewer") requests.push(apiRequest("/auth/users?page_size=80", { token: activeSession.token }));
      const [customerResponse, usersResponse] = await Promise.all(requests);
      setCustomers(customerResponse.items || []);
      setUsers(usersResponse?.items || []);
      setDetailCustomerId((current) => current || customerResponse.items?.[0]?.customer_id || "");
    } catch (requestError) {
      setError(requestError.message);
      setCustomers([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) return router.replace("/login");
    if (!ALLOWED_ROLES.includes(activeSession.user?.role)) return router.replace("/dashboard");
    setSession(activeSession);
    loadCustomers(activeSession);
  }, [router]);

  function upsertCustomer(updatedCustomer) {
    setCustomers((current) => {
      const exists = current.some((item) => item.customer_id === updatedCustomer.customer_id);
      if (!exists) return [updatedCustomer, ...current];
      return current.map((item) => item.customer_id === updatedCustomer.customer_id ? updatedCustomer : item);
    });
  }

  async function openCustomer(customerId) {
    if (!session?.token) return;
    setError("");
    try {
      const customer = await apiRequest(`/customers/${customerId}`, { token: session.token });
      upsertCustomer(customer);
      setDetailCustomerId(customer.customer_id);
      setDetailOpen(true);
      setNoteDraft("");
      setFollowUpDraft(customer.next_follow_up ? new Date(customer.next_follow_up).toISOString().slice(0, 16) : "");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function openEdit(customer) {
    setEditForm(createEditForm(customer));
    setEditOpen(true);
  }

  async function saveCustomer() {
    if (!editForm.name.trim() || !editForm.company_name.trim() || !editForm.email.trim() || !editForm.phone.trim()) {
      setError("Name, company, email, and phone are required.");
      return;
    }
    setSavingState("edit");
    setError("");
    try {
      const updated = await apiRequest(`/customers/${editForm.customer_id}`, {
        method: "PATCH",
        token: session.token,
        body: {
          name: editForm.name.trim(),
          company_name: editForm.company_name.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim(),
          status: editForm.status,
          total_value: Number(editForm.total_value || 0),
          assigned_to: canAssign ? editForm.assigned_to || null : undefined,
          next_follow_up: editForm.next_follow_up || null,
        },
      });
      upsertCustomer(updated);
      if (detailCustomerId === updated.customer_id) setDetailCustomerId(updated.customer_id);
      setEditOpen(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingState("");
    }
  }

  async function deleteCustomer(customerId, customerName) {
    if (!canDelete || !session?.token) return;
    if (!window.confirm(`Delete customer "${customerName}"?`)) return;
    setSavingState(customerId);
    setError("");
    try {
      await apiRequest(`/customers/${customerId}`, { method: "DELETE", token: session.token });
      setCustomers((current) => current.filter((item) => item.customer_id !== customerId));
      if (detailCustomerId === customerId) {
        setDetailOpen(false);
        setDetailCustomerId("");
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingState("");
    }
  }

  async function saveNote() {
    if (!selectedCustomer || !noteDraft.trim() || !session?.token) return;
    setSavingState("note");
    setError("");
    try {
      const updated = await apiRequest(`/customers/${selectedCustomer.customer_id}/notes`, { method: "POST", token: session.token, body: { content: noteDraft.trim() } });
      upsertCustomer(updated);
      setDetailCustomerId(updated.customer_id);
      setNoteDraft("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingState("");
    }
  }

  async function scheduleFollowUp() {
    if (!selectedCustomer || !followUpDraft || !session?.token) return;
    setSavingState("follow-up");
    setError("");
    try {
      const updated = await apiRequest(`/customers/${selectedCustomer.customer_id}/followups`, { method: "POST", token: session.token, body: { next_follow_up: followUpDraft } });
      upsertCustomer(updated);
      setDetailCustomerId(updated.customer_id);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingState("");
    }
  }

  function exportCsv() {
    if (!filteredCustomers.length) {
      setError("No customer data is available for export.");
      return;
    }
    const rows = [["Customer", "Company", "Email", "Phone", "Status", "Owner", "Total Value", "Next Follow-up", "Latest Note"], ...filteredCustomers.map((customer) => [customer.name || "", customer.company_name || "", customer.email || "", customer.phone || "", customer.status || "", customer.assigned_to_name || "Unassigned", Number(customer.total_value || 0), customer.next_follow_up || "", latestNote(customer.notes) || ""])];
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <DashboardShell session={session} title="Customers" eyebrow="Customer Management" heroStats={[]}>
      <div className="mx-auto grid max-w-[1280px] gap-5">
        {error ? <div className="crm-surface border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">{error}</div> : null}
        {loading ? <div className="crm-surface px-5 py-4 text-sm font-semibold text-slate-600">Loading customers...</div> : null}
        {!loading ? (
          <>
            <section className="crm-surface p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="space-y-2">
                  <span className="crm-kicker">Workspace Controls</span>
                  <p className="max-w-3xl text-[15px] leading-7 text-slate-600">
                    Export customer sheets, add new accounts, and manage the directory from one clean action bar.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button className="crm-btn-secondary" type="button" onClick={exportCsv}>
                    <DashboardIcon name="documents" className="h-4 w-4" />
                    Export CSV
                  </button>
                  {canManage ? (
                    <Link href="/customers/new" className="crm-btn-primary">
                      <DashboardIcon name="customers" className="h-4 w-4" />
                      Add Customer
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Total Customers" value={stats.total} icon="customers" tint="bg-blue-50 text-blue-600" />
              <MetricCard label="Active Accounts" value={stats.active} icon="company" tint="bg-emerald-50 text-emerald-600" />
              <MetricCard label="Scheduled Follow-ups" value={stats.scheduled} icon="calendar" tint="bg-amber-50 text-amber-600" />
              <MetricCard label="Overdue Follow-ups" value={stats.overdue} icon="tasks" tint="bg-rose-50 text-rose-600" />
              <MetricCard label="Portfolio Value" value={money(stats.value)} icon="finance" tint="bg-violet-50 text-violet-600" />
            </section>

            <section className="crm-surface p-5">
              <div className="grid gap-4 xl:grid-cols-[minmax(280px,1.6fr)_repeat(3,minmax(170px,0.72fr))]">
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Search</span>
                  <div className="relative">
                    <DashboardIcon name="leads" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input className="crm-input pl-11" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, company, email, phone, note" />
                  </div>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Status</span>
                  <select className="crm-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Follow-up</span>
                  <select className="crm-input" value={followUpFilter} onChange={(event) => setFollowUpFilter(event.target.value)}>
                    <option value="all">All follow-ups</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="overdue">Overdue</option>
                    <option value="none">No follow-up</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Sort</span>
                  <select className="crm-input" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                    <option value="recent">Most recent</option>
                    <option value="name">Company name</option>
                    <option value="value">Highest value</option>
                    <option value="follow-up">Nearest follow-up</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {filteredCustomers.length ? filteredCustomers.map((customer) => {
                const notePreview = latestNote(customer.notes);
                const notesCount = customerNoteCount(customer.notes);
                const tone = getStatusStyle(customer.status);
                const overdue = isOverdue(customer.next_follow_up);

                return (
                  <article key={customer.customer_id} className="crm-surface flex flex-col gap-5 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-400 to-lime-300 text-sm font-black text-white shadow-[0_16px_26px_rgba(34,197,94,0.2)]">
                          {initials(customer.name || customer.company_name || "Customer")}
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-xl font-black leading-tight text-slate-900">{customer.name || "Unnamed customer"}</h3>
                          <p className="text-sm text-slate-500">{customer.company_name || "No company name"}</p>
                        </div>
                      </div>
                      <span className={`crm-pill border ${tone.badge}`}>{tone.label}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="crm-pill border border-emerald-100 bg-emerald-50 text-emerald-700">Notes {notesCount}</span>
                      <span className="crm-pill border border-slate-200 bg-slate-100 text-slate-600">{customer.assigned_to_name || "Unassigned"}</span>
                      <span className={`crm-pill border ${overdue ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                        {overdue ? "Follow-up overdue" : customer.next_follow_up ? "Follow-up set" : "No follow-up"}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <StatCell label="Email" value={customer.email || "No email"} />
                      <StatCell label="Phone" value={customer.phone || "No phone"} />
                      <StatCell label="Owner" value={customer.assigned_to_name || "Unassigned"} />
                      <StatCell label="Value" value={money(customer.total_value)} />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="crm-surface-soft p-4">
                        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Next Follow-up</span>
                        <strong className={`mt-2 block text-[15px] font-bold ${overdue ? "text-rose-600" : "text-slate-900"}`}>{dateOnly(customer.next_follow_up)}</strong>
                      </div>
                      <div className="crm-surface-soft p-4">
                        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Updated</span>
                        <strong className="mt-2 block text-[15px] font-bold text-slate-900">{dateOnly(customer.updated_at || customer.created_at)}</strong>
                      </div>
                    </div>

                    <div className="crm-surface-soft p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Latest Note</span>
                        <strong className="text-xs font-bold text-slate-500">{notesCount} saved</strong>
                      </div>
                      <p className="min-h-[66px] text-sm leading-6 text-slate-600">{notePreview || "No notes added yet."}</p>
                    </div>

                    <div className={`grid gap-3 ${canManage ? "grid-cols-[1fr_1fr_auto]" : "grid-cols-1"}`}>
                      <button className="crm-btn-secondary" type="button" onClick={() => openCustomer(customer.customer_id)}>
                        <DashboardIcon name="message" className="h-4 w-4" />
                        View Details
                      </button>
                      {canManage ? <button className="crm-btn-soft" type="button" onClick={() => openEdit(customer)}><DashboardIcon name="settings" className="h-4 w-4" />Edit</button> : null}
                      {canDelete ? <button className="crm-btn-danger px-3" type="button" onClick={() => deleteCustomer(customer.customer_id, customer.company_name || customer.name || "customer")} disabled={savingState === customer.customer_id} title="Delete customer"><DashboardIcon name="audit" className="h-4 w-4" /></button> : null}
                    </div>
                  </article>
                );
              }) : (
                <article className="crm-surface grid min-h-[280px] place-items-center p-8 text-center lg:col-span-2 2xl:col-span-3">
                  <div className="space-y-4">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                      <DashboardIcon name="customers" className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-slate-900">No customers matched the current filters</h3>
                      <p className="max-w-xl text-sm leading-6 text-slate-600">Try a different search or clear the filters to view the full list.</p>
                    </div>
                  </div>
                </article>
              )}
            </section>
          </>
        ) : null}
      </div>

      {detailOpen && selectedCustomer ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={() => setDetailOpen(false)}>
          <div className="max-h-[92vh] w-full max-w-[1120px] overflow-y-auto rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.28)]" onClick={(event) => event.stopPropagation()}>
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <span className="crm-kicker">Customer Detail</span>
                <div>
                  <h2 className="text-[2rem] font-black tracking-tight text-slate-900">{selectedCustomer.company_name || selectedCustomer.name}</h2>
                  <p className="mt-2 text-sm text-slate-600">{selectedCustomer.name || "Primary contact"} | {selectedCustomer.email || "No email"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="crm-pill border border-emerald-100 bg-emerald-50 text-emerald-700">Notes {selectedCustomerNotes.length}</span>
                  <span className="crm-pill border border-slate-200 bg-slate-100 text-slate-600">Owner {selectedCustomer.assigned_to_name || "Unassigned"}</span>
                  <span className={`crm-pill border ${getStatusStyle(selectedCustomer.status).badge}`}>{titleCase(selectedCustomer.status || "active")}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {canManage ? (
                  <button className="crm-btn-soft" type="button" onClick={() => { setDetailOpen(false); openEdit(selectedCustomer); }}>
                    <DashboardIcon name="settings" className="h-4 w-4" />
                    Edit
                  </button>
                ) : null}
                <button className="crm-btn-secondary" type="button" onClick={() => setDetailOpen(false)}>Close</button>
              </div>
            </div>

            <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <MetricCard label="Status" value={titleCase(selectedCustomer.status || "active")} icon="company" tint="bg-emerald-50 text-emerald-600" />
              <MetricCard label="Total Value" value={money(selectedCustomer.total_value)} icon="finance" tint="bg-violet-50 text-violet-600" />
              <MetricCard label="Owner" value={selectedCustomer.assigned_to_name || "Unassigned"} icon="user" tint="bg-slate-100 text-slate-600" />
              <MetricCard label="Next Follow-up" value={dateOnly(selectedCustomer.next_follow_up)} icon="calendar" tint="bg-amber-50 text-amber-600" />
              <MetricCard label="Notes Logged" value={selectedCustomerNotes.length} icon="documents" tint="bg-blue-50 text-blue-600" />
              <MetricCard label="Updated" value={dateOnly(selectedCustomer.updated_at || selectedCustomer.created_at)} icon="tasks" tint="bg-slate-100 text-slate-600" />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.1fr_0.95fr_0.95fr]">
              <article className="crm-surface p-5">
                <div className="mb-4 space-y-1">
                  <span className="crm-kicker">Account</span>
                  <h3 className="text-xl font-black text-slate-900">Snapshot</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatCell label="Status" value={titleCase(selectedCustomer.status || "active")} />
                  <StatCell label="Total Value" value={money(selectedCustomer.total_value)} />
                  <StatCell label="Owner" value={selectedCustomer.assigned_to_name || "Unassigned"} />
                  <StatCell label="Next Follow-up" value={dateTime(selectedCustomer.next_follow_up)} danger={isOverdue(selectedCustomer.next_follow_up)} />
                  <StatCell label="Notes Logged" value={selectedCustomerNotes.length} />
                  <StatCell label="Email" value={selectedCustomer.email || "No email"} />
                  <StatCell label="Phone" value={selectedCustomer.phone || "No phone"} />
                  <StatCell label="Updated" value={dateTime(selectedCustomer.updated_at || selectedCustomer.created_at)} />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link className="crm-btn-secondary" href={`/communications?entity=customer&id=${selectedCustomer.customer_id}`}><DashboardIcon name="message" className="h-4 w-4" />Email</Link>
                  <a className="crm-btn-secondary" href={`tel:${String(selectedCustomer.phone || "").replace(/[^\d+]/g, "")}`}><DashboardIcon name="support" className="h-4 w-4" />Call</a>
                </div>
              </article>

              <article className="crm-surface p-5">
                <div className="mb-4 space-y-1">
                  <span className="crm-kicker">Follow-up</span>
                  <h3 className="text-xl font-black text-slate-900">Schedule next step</h3>
                </div>
                <div className="grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Next follow-up</span>
                    <input className="crm-input" type="datetime-local" value={followUpDraft} onChange={(event) => setFollowUpDraft(event.target.value)} />
                  </label>
                  <button className="crm-btn-primary w-full" type="button" onClick={scheduleFollowUp} disabled={!followUpDraft || savingState === "follow-up"}>
                    <DashboardIcon name="calendar" className="h-4 w-4" />
                    {savingState === "follow-up" ? "Saving..." : "Save Follow-up"}
                  </button>
                </div>
              </article>

              <article className="crm-surface p-5">
                <div className="mb-4 space-y-1">
                  <span className="crm-kicker">Notes</span>
                  <h3 className="text-xl font-black text-slate-900">Add note</h3>
                </div>
                <div className="grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Note</span>
                    <textarea className="crm-input min-h-[170px] resize-y" rows="6" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Capture context, updates, or next actions" />
                  </label>
                  <button className="crm-btn-primary w-full" type="button" onClick={saveNote} disabled={!noteDraft.trim() || savingState === "note"}>
                    <DashboardIcon name="documents" className="h-4 w-4" />
                    {savingState === "note" ? "Saving..." : "Save Note"}
                  </button>
                </div>
              </article>
            </div>

            <article className="crm-surface mt-5 p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="crm-kicker">History</span>
                  <h3 className="text-xl font-black text-slate-900">Notes timeline</h3>
                </div>
                <span className="crm-pill border border-slate-200 bg-slate-100 text-slate-600">{selectedCustomerNotes.length} items</span>
              </div>
              <div className="grid gap-3">
                {selectedCustomerNotes.length ? selectedCustomerNotes.map((note) => (
                  <div key={note.id} className="crm-surface-soft p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-sm font-bold text-slate-900">{note.author}</strong>
                      <span className="text-xs font-semibold text-slate-500">{note.createdAt ? dateTime(note.createdAt) : "Manual note"}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{note.content}</p>
                  </div>
                )) : (
                  <div className="grid min-h-[180px] place-items-center rounded-[20px] border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center">
                    <div className="space-y-3">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500"><DashboardIcon name="documents" className="h-5 w-5" /></div>
                      <p className="text-sm font-medium text-slate-500">No notes recorded for this customer yet.</p>
                    </div>
                  </div>
                )}
              </div>
            </article>
          </div>
        </div>
      ) : null}

      {editOpen ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={() => setEditOpen(false)}>
          <div className="w-full max-w-[820px] rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.28)]" onClick={(event) => event.stopPropagation()}>
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <span className="crm-kicker">Edit Customer</span>
                <h2 className="text-[1.85rem] font-black tracking-tight text-slate-900">{editForm.company_name || "Customer record"}</h2>
                <p className="text-sm text-slate-600">Update the account details with the same clean Tailwind workspace pattern.</p>
              </div>
              <button className="crm-btn-secondary" type="button" onClick={() => setEditOpen(false)}>Close</button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2"><span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Contact name</span><input className="crm-input" value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} /></label>
              <label className="grid gap-2"><span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Company name</span><input className="crm-input" value={editForm.company_name} onChange={(event) => setEditForm((current) => ({ ...current, company_name: event.target.value }))} /></label>
              <label className="grid gap-2"><span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Email</span><input className="crm-input" type="email" value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} /></label>
              <label className="grid gap-2"><span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Phone</span><input className="crm-input" value={editForm.phone} onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))} /></label>
              <label className="grid gap-2"><span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Status</span><select className="crm-input" value={editForm.status} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))}><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select></label>
              <label className="grid gap-2"><span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Total value</span><input className="crm-input" type="number" value={editForm.total_value} onChange={(event) => setEditForm((current) => ({ ...current, total_value: event.target.value }))} /></label>
              <label className="grid gap-2"><span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Next follow-up</span><input className="crm-input" type="datetime-local" value={editForm.next_follow_up} onChange={(event) => setEditForm((current) => ({ ...current, next_follow_up: event.target.value }))} /></label>
              <label className="grid gap-2"><span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Owner</span><select className="crm-input" value={editForm.assigned_to} onChange={(event) => setEditForm((current) => ({ ...current, assigned_to: event.target.value }))} disabled={!canAssign}><option value="">Unassigned</option>{users.map((user) => <option key={user.user_id} value={user.user_id}>{user.name} | {user.role}</option>)}</select></label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button className="crm-btn-secondary" type="button" onClick={() => setEditOpen(false)}>Cancel</button>
              <button className="crm-btn-primary" type="button" onClick={saveCustomer} disabled={savingState === "edit"}>
                <DashboardIcon name="settings" className="h-4 w-4" />
                {savingState === "edit" ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
