"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../components/dashboard/icons";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";

const PANEL = "rounded-[30px] border border-[#eadfcd] bg-white/82 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const HERO = "rounded-[36px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(250,241,221,0.98)_44%,_rgba(245,231,193,0.98)_100%)] p-6 shadow-[0_24px_70px_rgba(79,58,22,0.08)] md:p-8";
const DARK = "rounded-[34px] border border-[#1d1a12] bg-[linear-gradient(155deg,#10111d_0%,#171a28_56%,#25212d_100%)] p-6 text-white shadow-[0_24px_80px_rgba(6,7,16,0.3)] md:p-7";
const SOFT = "rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4";
const INPUT = "w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none transition placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const DARK_INPUT = "w-full rounded-[18px] border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/45 focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const PRIMARY = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2.5 text-sm font-semibold text-[#060710] shadow-[0_16px_30px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f] disabled:cursor-not-allowed disabled:opacity-60";
const GHOST = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710] disabled:cursor-not-allowed disabled:opacity-60";
const DANGER = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60";
const KICKER = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";

const LIMITS = [["admin","Admins"],["manager","Managers"],["sales","Sales"],["marketing","Marketing"],["support","Support"],["legal-team","Legal Team"],["finance-team","Finance Team"],["viewer","Viewer"]];
const BASE_ROLES = [["manager","Manager"],["sales","Sales"],["marketing","Marketing"],["support","Support"],["legal-team","Legal Team"],["finance-team","Finance Team"],["viewer","Viewer"]];
const parseJson = (v) => { try { return !v ? {} : typeof v === "string" ? JSON.parse(v) : v; } catch { return {}; } };
const pretty = (v = "") => String(v).replaceAll("_", "-").split("-").filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1)).join(" ");
const when = (v, full = false) => !v ? "--" : (() => { const d = new Date(v); return Number.isNaN(d.getTime()) ? "--" : d.toLocaleString("en-IN", full ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short", year: "numeric" }); })();
const initials = (v = "TM") => String(v).split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase() || "").join("") || "TM";
const formDraft = (company_id = "", role = "sales") => ({ company_id, name: "", email: "", role, password: "", phone: "", department: "" });
const editDraft = (u) => ({ name: u?.name || "", email: u?.email || "", role: u?.role || "sales", password: "", phone: u?.phone || "", department: u?.department || "" });
const roleOptions = (isSuperAdmin) => isSuperAdmin ? [["admin","Admin"], ...BASE_ROLES] : BASE_ROLES;

export default function UserSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [users, setUsers] = useState([]);
  const [company, setCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [createForm, setCreateForm] = useState(formDraft());
  const [memberForm, setMemberForm] = useState(editDraft());
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState("");

  const role = session?.user?.role || "";
  const isSuperAdmin = role === "super-admin";
  const scopedCompanyId = isSuperAdmin ? selectedCompanyId : session?.company?.company_id || session?.user?.company_id || "";
  const roles = useMemo(() => roleOptions(isSuperAdmin), [isSuperAdmin]);
  const selectedUser = useMemo(() => users.find((u) => u.user_id === selectedUserId) || null, [selectedUserId, users]);
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const hay = [u.name, u.email, u.role, u.department, u.phone, u.talent_id, u.company_name].filter(Boolean).join(" ").toLowerCase();
      return (!q || hay.includes(q)) && (roleFilter === "all" || u.role === roleFilter) && (statusFilter === "all" || (statusFilter === "active" ? u.is_active : !u.is_active));
    });
  }, [roleFilter, search, statusFilter, users]);
  const limits = parseJson(parseJson(company?.service_settings).staff_limits);
  const stats = useMemo(() => ({ total: users.length, active: users.filter((u) => u.is_active).length, inactive: users.filter((u) => !u.is_active).length, roles: new Set(users.map((u) => u.role).filter(Boolean)).size }), [users]);
  const usage = LIMITS.map(([key, label]) => {
    const used = users.filter((u) => u.is_active && u.role === key).length;
    const limit = limits[key];
    return { key, label, used, limit: limit === null || limit === undefined || limit === "" ? null : Number(limit) };
  });

  async function loadWorkspace(activeSession, companyId = "") {
    if (activeSession.user?.role === "super-admin" && !companyId) { setUsers([]); setCompany(null); setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const [usersResponse, scopeResponse] = await Promise.all([
        apiRequest(`/auth/users?page_size=120${companyId ? `&company_id=${companyId}` : ""}`, { token: activeSession.token }),
        activeSession.user?.role === "super-admin" ? apiRequest(`/companies/${companyId}`, { token: activeSession.token }) : apiRequest("/auth/profile", { token: activeSession.token }),
      ]);
      setUsers(usersResponse.items || []);
      setCompany(activeSession.user?.role === "super-admin" ? scopeResponse : scopeResponse.company || null);
      if (activeSession.user?.role !== "super-admin") setCompanies(scopeResponse.company ? [scopeResponse.company] : []);
    } catch (requestError) {
      setUsers([]); setError(requestError.message);
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
      apiRequest("/companies?page_size=120", { token: activeSession.token }).then((response) => {
        const items = response.items || [];
        const nextCompanyId = activeSession.company?.company_id || activeSession.user?.company_id || items[0]?.company_id || "";
        setCompanies(items); setSelectedCompanyId(nextCompanyId); setCreateForm(formDraft(nextCompanyId));
      }).catch((requestError) => { setLoading(false); setError(requestError.message); });
      return;
    }
    const nextCompanyId = activeSession.company?.company_id || activeSession.user?.company_id || "";
    setSelectedCompanyId(nextCompanyId); setCreateForm(formDraft(nextCompanyId)); loadWorkspace(activeSession, nextCompanyId);
  }, [router]);

  useEffect(() => {
    if (!session || !isSuperAdmin) return;
    setCreateForm((c) => ({ ...c, company_id: selectedCompanyId }));
    loadWorkspace(session, selectedCompanyId);
  }, [isSuperAdmin, selectedCompanyId, session]);

  useEffect(() => {
    if (!users.length) { setSelectedUserId(""); setMemberForm(editDraft()); return; }
    if (!users.some((u) => u.user_id === selectedUserId)) setSelectedUserId(users[0].user_id);
  }, [selectedUserId, users]);

  useEffect(() => { if (selectedUser) setMemberForm(editDraft(selectedUser)); }, [selectedUser]);

  async function createUser(event) {
    event.preventDefault();
    if (!session?.token) return;
    if (isSuperAdmin && !scopedCompanyId) return setError("Choose a company before creating a team member.");
    setCreating(true); setError(""); setMessage("");
    try {
      const response = await apiRequest("/auth/create-employee", { method: "POST", token: session.token, body: { ...createForm, company_id: isSuperAdmin ? scopedCompanyId : undefined } });
      setMessage(response.temporary_password ? `User created. Temporary password: ${response.temporary_password}` : "User created successfully.");
      setCreateForm(formDraft(scopedCompanyId)); await loadWorkspace(session, scopedCompanyId); if (response.user_id) setSelectedUserId(response.user_id);
    } catch (requestError) { setError(requestError.message); } finally { setCreating(false); }
  }

  async function saveUser(event) {
    event.preventDefault();
    if (!session?.token || !selectedUser) return;
    setSaving(true); setError(""); setMessage("");
    try {
      await apiRequest(`/auth/users/${selectedUser.user_id}`, { method: "PUT", token: session.token, body: { name: memberForm.name, email: memberForm.email, role: memberForm.role, phone: memberForm.phone, department: memberForm.department, ...(memberForm.password.trim() ? { password: memberForm.password } : {}) } });
      setMessage("Team member updated."); await loadWorkspace(session, scopedCompanyId);
    } catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  }

  async function toggleUser(user) {
    if (!session?.token || !user) return;
    setWorkingId(user.user_id); setError(""); setMessage("");
    try {
      await apiRequest(`/auth/users/${user.user_id}/toggle`, { method: "PUT", token: session.token, body: { is_active: !user.is_active } });
      setMessage(user.is_active ? "Team member deactivated." : "Team member activated."); await loadWorkspace(session, scopedCompanyId);
    } catch (requestError) { setError(requestError.message); } finally { setWorkingId(""); }
  }

  async function removeUser(user) {
    if (!session?.token || !user || !window.confirm(`Deactivate ${user.name || user.email}?`)) return;
    setWorkingId(user.user_id); setError(""); setMessage("");
    try {
      await apiRequest(`/auth/users/${user.user_id}`, { method: "DELETE", token: session.token });
      setMessage("Team member removed from the active roster."); await loadWorkspace(session, scopedCompanyId);
    } catch (requestError) { setError(requestError.message); } finally { setWorkingId(""); }
  }

  return (
    <DashboardShell session={session} title="Team Members" hideTitle heroStats={[]}>
      <div className="mx-auto grid max-w-[1320px] gap-5">
        {error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
        {message ? <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div> : null}

        <section className={HERO}>
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="space-y-5">
              <div className="space-y-3">
                <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">Team Members</span>
                <div>
                  <h2 className="text-[2rem] font-semibold tracking-tight text-[#060710] md:text-[3rem] md:leading-[1.02]">Build a cleaner, richer team roster for this workspace.</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[#746853] md:text-base">Create member IDs with role, phone, department, credentials, and sharper controls from one premium team desk.</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[["Total Members",stats.total,"users","bg-[#fff0c8] text-[#8d6e27]"],["Active",stats.active,"dashboard","bg-[#fff7e8] text-[#8d6e27]"],["Roles",stats.roles,"analytics","bg-[#f6efe2] text-[#5d503c]"],["Inactive",stats.inactive,"documents","bg-[#fff4d9] text-[#8d6e27]"]].map(([label,value,icon,tint]) => <article key={label} className={PANEL}><div className="flex items-start justify-between gap-4"><div><p className={KICKER}>{label}</p><h3 className="mt-1 text-[1.7rem] font-black leading-none text-slate-900">{value}</h3></div><div className={`grid h-12 w-12 place-items-center rounded-2xl ${tint}`}><DashboardIcon name={icon} className="h-5 w-5" /></div></div></article>)}
              </div>
            </div>

            <article className={DARK}>
              <div className="space-y-4">
                <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/70">Create Member</span>
                <h3 className="text-[2rem] font-semibold leading-[1.08] tracking-tight text-white">Add a stronger team identity</h3>
                <p className="text-sm leading-7 text-white/68">Role, phone, department, and temporary password sab ek hi intake flow me.</p>
              </div>
              <form className="mt-6 grid gap-4" onSubmit={createUser}>
                {isSuperAdmin ? <label className="space-y-2"><span className={KICKER}>Company</span><select className={DARK_INPUT} value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)}><option value="">Choose company</option>{companies.map((item) => <option key={item.company_id} value={item.company_id} className="text-[#060710]">{item.name}</option>)}</select></label> : null}
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2"><span className={KICKER}>Full Name</span><input className={DARK_INPUT} value={createForm.name} onChange={(e) => setCreateForm((c) => ({ ...c, name: e.target.value }))} required /></label>
                  <label className="space-y-2"><span className={KICKER}>Email</span><input className={DARK_INPUT} type="email" value={createForm.email} onChange={(e) => setCreateForm((c) => ({ ...c, email: e.target.value }))} required /></label>
                  <label className="space-y-2"><span className={KICKER}>Role</span><select className={DARK_INPUT} value={createForm.role} onChange={(e) => setCreateForm((c) => ({ ...c, role: e.target.value }))}>{roles.map(([value,label]) => <option key={value} value={value} className="text-[#060710]">{label}</option>)}</select></label>
                  <label className="space-y-2"><span className={KICKER}>Department</span><input className={DARK_INPUT} value={createForm.department} onChange={(e) => setCreateForm((c) => ({ ...c, department: e.target.value }))} placeholder="Sales Desk" /></label>
                  <label className="space-y-2"><span className={KICKER}>Phone</span><input className={DARK_INPUT} value={createForm.phone} onChange={(e) => setCreateForm((c) => ({ ...c, phone: e.target.value }))} placeholder="+91 98..." /></label>
                  <label className="space-y-2"><span className={KICKER}>Temporary Password</span><input className={DARK_INPUT} type="password" value={createForm.password} onChange={(e) => setCreateForm((c) => ({ ...c, password: e.target.value }))} placeholder="Optional" /></label>
                </div>
                <button className={PRIMARY} type="submit" disabled={creating || (isSuperAdmin && !selectedCompanyId)}><DashboardIcon name="users" className="h-4 w-4" />{creating ? "Creating..." : "Create Team Member"}</button>
              </form>
            </article>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.06fr_0.94fr] xl:items-start">
          <article className={PANEL}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div><p className={KICKER}>Roster</p><h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Team Members</h3></div>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2"><span className={KICKER}>Search</span><input className={INPUT} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, role" /></label>
                <label className="space-y-2"><span className={KICKER}>Role</span><select className={INPUT} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}><option value="all">All roles</option>{roles.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="space-y-2"><span className={KICKER}>Status</span><select className={INPUT} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {loading ? <div className="grid min-h-[240px] place-items-center rounded-[28px] border border-[#eadfcd] bg-[#fffaf1] px-6 text-sm text-[#7a6b57]">Loading team roster...</div> : filteredUsers.length ? filteredUsers.map((user) => <button key={user.user_id} type="button" onClick={() => setSelectedUserId(user.user_id)} className={`w-full rounded-[28px] border p-4 text-left transition ${selectedUserId === user.user_id ? "border-[#d7b258] bg-[#fff8e9] shadow-[0_16px_32px_rgba(203,169,82,0.14)]" : "border-[#eadfcd] bg-white/88 shadow-[0_10px_24px_rgba(79,58,22,0.05)] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(79,58,22,0.08)]"}`}><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="flex min-w-0 items-start gap-4"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-[#10111d] text-base font-black text-white shadow-[0_18px_30px_rgba(6,7,16,0.16)]">{initials(user.name)}</div><div className="min-w-0"><div className="flex flex-wrap gap-2"><span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fff6e4] px-3 py-1 text-[11px] font-bold text-[#7a6230]">{pretty(user.role)}</span>{user.talent_id ? <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">{user.talent_id}</span> : null}</div><h4 className="mt-3 truncate text-lg font-semibold text-[#060710]">{user.name}</h4><p className="truncate text-sm text-[#746853]">{user.email}</p></div></div><span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${user.is_active ? "border-[#e7d7ab] bg-[#fff4d9] text-[#8d6e27]" : "border-[#eadfcd] bg-white text-[#7c6d55]"}`}>{user.is_active ? "Active" : "Inactive"}</span></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm text-[#7a6b57]"><div><p className={KICKER}>Department</p><p className="mt-2 font-semibold text-[#060710]">{user.department || "Not set"}</p></div><div><p className={KICKER}>Phone</p><p className="mt-2 font-semibold text-[#060710]">{user.phone || "Not set"}</p></div><div><p className={KICKER}>Last Login</p><p className="mt-2 font-semibold text-[#060710]">{when(user.last_login_at, true)}</p></div><div><p className={KICKER}>Joined</p><p className="mt-2 font-semibold text-[#060710]">{when(user.created_at)}</p></div></div></button>) : <div className="grid min-h-[240px] place-items-center rounded-[28px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-6 text-center text-sm text-[#7a6b57]">No team members matched the current filters.</div>}
            </div>
          </article>

          <div className="space-y-5">
            <article className={selectedUser ? PANEL : DARK}>
              {selectedUser ? (
                <div className="space-y-5">
                  <div><p className={KICKER}>Member Editor</p><h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Update selected team member</h3></div>
                  <div className="overflow-hidden rounded-[26px] border border-[#eadfcd] bg-white/84 shadow-[0_12px_30px_rgba(79,58,22,0.08)]"><div className="space-y-4 p-4"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-[18px] bg-[#10111d] text-sm font-black text-white shadow-[0_16px_28px_rgba(6,7,16,0.16)]">{initials(selectedUser.name)}</div><div><strong className="block text-base font-black text-[#060710]">{selectedUser.name}</strong><span className="block text-xs font-semibold text-[#8f816a]">{selectedUser.talent_id || selectedUser.user_id}</span></div></div><span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${selectedUser.is_active ? "border-[#e7d7ab] bg-[#fff4d9] text-[#8d6e27]" : "border-[#eadfcd] bg-white text-[#7c6d55]"}`}>{selectedUser.is_active ? "Active" : "Inactive"}</span></div><div className="grid gap-3 sm:grid-cols-2"><div className={SOFT}><span className={KICKER}>Company</span><strong className="mt-3 block text-sm text-[#060710]">{selectedUser.company_name || company?.name || "Workspace"}</strong></div><div className={SOFT}><span className={KICKER}>Last Login</span><strong className="mt-3 block text-sm text-[#060710]">{when(selectedUser.last_login_at, true)}</strong></div></div></div></div>
                  <form className="grid gap-4" onSubmit={saveUser}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2"><span className={KICKER}>Full Name</span><input className={INPUT} value={memberForm.name} onChange={(e) => setMemberForm((c) => ({ ...c, name: e.target.value }))} required /></label>
                      <label className="space-y-2"><span className={KICKER}>Email</span><input className={INPUT} type="email" value={memberForm.email} onChange={(e) => setMemberForm((c) => ({ ...c, email: e.target.value }))} required /></label>
                      <label className="space-y-2"><span className={KICKER}>Role</span><select className={INPUT} value={memberForm.role} onChange={(e) => setMemberForm((c) => ({ ...c, role: e.target.value }))}>{roles.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                      <label className="space-y-2"><span className={KICKER}>Department</span><input className={INPUT} value={memberForm.department} onChange={(e) => setMemberForm((c) => ({ ...c, department: e.target.value }))} placeholder="Sales Desk" /></label>
                      <label className="space-y-2"><span className={KICKER}>Phone</span><input className={INPUT} value={memberForm.phone} onChange={(e) => setMemberForm((c) => ({ ...c, phone: e.target.value }))} placeholder="+91 98..." /></label>
                      <label className="space-y-2"><span className={KICKER}>Reset Password</span><input className={INPUT} type="password" value={memberForm.password} onChange={(e) => setMemberForm((c) => ({ ...c, password: e.target.value }))} placeholder="Leave blank to keep current password" /></label>
                    </div>
                    <div className="flex flex-wrap gap-3"><button className={PRIMARY} type="submit" disabled={saving}><DashboardIcon name="settings" className="h-4 w-4" />{saving ? "Saving..." : "Save Member"}</button><button className={GHOST} type="button" disabled={workingId === selectedUser.user_id} onClick={() => toggleUser(selectedUser)}><DashboardIcon name="documents" className="h-4 w-4" />{workingId === selectedUser.user_id ? "Updating..." : selectedUser.is_active ? "Deactivate" : "Activate"}</button><button className={DANGER} type="button" disabled={workingId === selectedUser.user_id} onClick={() => removeUser(selectedUser)}><DashboardIcon name="audit" className="h-4 w-4" />{workingId === selectedUser.user_id ? "Removing..." : "Remove"}</button></div>
                  </form>
                </div>
              ) : <div className="space-y-4"><span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/70">Member Editor</span><h3 className="text-[2rem] font-semibold leading-[1.08] tracking-tight text-white">Select a member card to edit role, phone, department, and password</h3><p className="text-sm leading-7 text-white/68">Selected team member yahin richer controls ke saath khulega.</p></div>}
            </article>

            <article className={PANEL}>
              <div><p className={KICKER}>Seat Usage</p><h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Role capacity snapshot</h3></div>
              <div className="mt-5 grid gap-3">{usage.map((item) => <div key={item.key} className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4"><div className="flex items-center justify-between gap-3"><div><strong className="block text-sm text-[#060710]">{item.label}</strong><span className="mt-1 block text-xs text-[#8f816a]">{item.limit === null ? `${item.used} active | unlimited` : `${item.used} active of ${item.limit} allowed`}</span></div><span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${item.limit !== null && item.used >= item.limit ? "bg-rose-50 text-rose-700" : "bg-white text-[#5d503c]"}`}>{item.limit === null ? "Open" : `${Math.max(item.limit - item.used, 0)} left`}</span></div></div>)}</div>
            </article>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
