"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../components/dashboard/icons";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";
import { T, pretty } from "./users-tokens";
import { UserRoster } from "./UserRoster";
import { UserDetail, SeatUsage } from "./UserDetail";

const LIMITS_MAP = [["admin","Admins"],["manager","Managers"],["sales","Sales"],["marketing","Marketing"],["support","Support"],["legal-team","Legal Team"],["finance-team","Finance Team"],["viewer","Viewer"]];
const BASE_ROLES = [["manager","Manager"],["sales","Sales"],["marketing","Marketing"],["support","Support"],["legal-team","Legal Team"],["finance-team","Finance Team"],["viewer","Viewer"]];
const parseJson = v => { try { return !v ? {} : typeof v === "string" ? JSON.parse(v) : v; } catch { return {}; } };
const formDraft = (cid="",role="sales") => ({ company_id:cid, name:"", email:"", role, password:"", phone:"", department:"" });
const editDraft = u => ({ name:u?.name||"", email:u?.email||"", role:u?.role||"sales", password:"", phone:u?.phone||"", department:u?.department||"" });

function buildCreateFeedback(r) {
  const delivery = r?.credential_delivery?.delivery || "preview";
  const email = r?.email || "this inbox";
  const tmp = r?.temporary_password ? ` Temp password: ${r.temporary_password}.` : "";
  const preview = r?.credential_delivery?.preview_login_url ? ` Login: ${r.credential_delivery.preview_login_url}.` : "";
  const err = r?.credential_delivery?.error ? ` Mail error: ${r.credential_delivery.error}.` : "";
  if (delivery === "email") return { tone:"success", text:`User created and credentials sent to ${email}.${preview}` };
  if (delivery === "queued") return { tone:"warning", text:`User created for ${email}. Credentials sending in background.${tmp}${preview}` };
  return { tone:"warning", text:`User created for ${email}, but email not confirmed.${tmp}${preview}${err} Share password manually if needed.` };
}

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
  const [messageTone, setMessageTone] = useState("success");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState("");

  const role = session?.user?.role || "";
  const isSuperAdmin = role === "super-admin";
  const scopedCompanyId = isSuperAdmin ? selectedCompanyId : session?.company?.company_id || session?.user?.company_id || "";
  const roles = useMemo(() => isSuperAdmin ? [["admin","Admin"], ...BASE_ROLES] : BASE_ROLES, [isSuperAdmin]);
  const selectedUser = useMemo(() => users.find(u => u.user_id === selectedUserId) || null, [selectedUserId, users]);
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => {
      const hay = [u.name, u.email, u.role, u.department, u.phone, u.talent_id].filter(Boolean).join(" ").toLowerCase();
      return (!q || hay.includes(q)) && (roleFilter === "all" || u.role === roleFilter) && (statusFilter === "all" || (statusFilter === "active" ? u.is_active : !u.is_active));
    });
  }, [roleFilter, search, statusFilter, users]);
  const limits = parseJson(parseJson(company?.service_settings).staff_limits);
  const stats = useMemo(() => ({ total:users.length, active:users.filter(u=>u.is_active).length, inactive:users.filter(u=>!u.is_active).length, roles:new Set(users.map(u=>u.role).filter(Boolean)).size }), [users]);
  const usage = LIMITS_MAP.map(([key, label]) => {
    const used = users.filter(u => u.is_active && u.role === key).length;
    const limit = limits[key];
    return { key, label, used, limit: limit === null || limit === undefined || limit === "" ? null : Number(limit) };
  });

  async function loadWorkspace(s, cid = "") {
    if (s.user?.role === "super-admin" && !cid) { setUsers([]); setCompany(null); setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const [ur, sr] = await Promise.all([
        apiRequest(`/auth/users?page_size=120${cid ? `&company_id=${cid}` : ""}`, { token: s.token }),
        s.user?.role === "super-admin" ? apiRequest(`/companies/${cid}`, { token: s.token }) : apiRequest("/auth/profile", { token: s.token }),
      ]);
      setUsers(ur.items || []);
      setCompany(s.user?.role === "super-admin" ? sr : sr.company || null);
      if (s.user?.role !== "super-admin") setCompanies(sr.company ? [sr.company] : []);
    } catch (e) { setUsers([]); setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const s = loadSession();
    if (!s) return router.replace("/login");
    if (!["super-admin","admin","manager"].includes(s.user?.role)) return router.replace("/dashboard");
    setSession(s);
    if (s.user?.role === "super-admin") {
      apiRequest("/companies?page_size=120", { token: s.token }).then(r => {
        const items = r.items || [];
        const cid = s.company?.company_id || s.user?.company_id || items[0]?.company_id || "";
        setCompanies(items); setSelectedCompanyId(cid); setCreateForm(formDraft(cid));
      }).catch(e => { setLoading(false); setError(e.message); });
      return;
    }
    const cid = s.company?.company_id || s.user?.company_id || "";
    setSelectedCompanyId(cid); setCreateForm(formDraft(cid)); loadWorkspace(s, cid);
  }, [router]);

  useEffect(() => { if (session && isSuperAdmin) { setCreateForm(f => ({ ...f, company_id: selectedCompanyId })); loadWorkspace(session, selectedCompanyId); } }, [isSuperAdmin, selectedCompanyId, session]);
  useEffect(() => { if (!users.length) { setSelectedUserId(""); setMemberForm(editDraft()); return; } if (!users.some(u => u.user_id === selectedUserId)) setSelectedUserId(users[0].user_id); }, [selectedUserId, users]);
  useEffect(() => { if (selectedUser) setMemberForm(editDraft(selectedUser)); }, [selectedUser]);

  async function createUser(e) {
    e.preventDefault();
    if (!session?.token) return;
    if (isSuperAdmin && !scopedCompanyId) return setError("Choose a company first.");
    setCreating(true); setError(""); setMessage(""); setMessageTone("success");
    try {
      const r = await apiRequest("/auth/create-employee", { method:"POST", token:session.token, body:{ ...createForm, company_id: isSuperAdmin ? scopedCompanyId : undefined } });
      const fb = buildCreateFeedback(r);
      setMessage(fb.text); setMessageTone(fb.tone);
      setCreateForm(formDraft(scopedCompanyId));
      await loadWorkspace(session, scopedCompanyId);
      if (r.user_id) setSelectedUserId(r.user_id);
    } catch (e) { setError(e.message); }
    finally { setCreating(false); }
  }

  async function saveUser(e) {
    e.preventDefault();
    if (!session?.token || !selectedUser) return;
    setSaving(true); setError(""); setMessage(""); setMessageTone("success");
    try {
      await apiRequest(`/auth/users/${selectedUser.user_id}`, { method:"PUT", token:session.token, body:{ name:memberForm.name, email:memberForm.email, role:memberForm.role, phone:memberForm.phone, department:memberForm.department, ...(memberForm.password.trim() ? { password:memberForm.password } : {}) } });
      setMessage("Team member updated."); await loadWorkspace(session, scopedCompanyId);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function toggleUser() {
    if (!session?.token || !selectedUser) return;
    setWorkingId(selectedUser.user_id); setError(""); setMessage(""); setMessageTone("success");
    try {
      await apiRequest(`/auth/users/${selectedUser.user_id}/toggle`, { method:"PUT", token:session.token, body:{ is_active:!selectedUser.is_active } });
      setMessage(selectedUser.is_active ? "Member deactivated." : "Member activated."); await loadWorkspace(session, scopedCompanyId);
    } catch (e) { setError(e.message); }
    finally { setWorkingId(""); }
  }

  async function removeUser() {
    if (!session?.token || !selectedUser || !window.confirm(`Remove ${selectedUser.name || selectedUser.email}?`)) return;
    setWorkingId(selectedUser.user_id); setError(""); setMessage(""); setMessageTone("success");
    try {
      await apiRequest(`/auth/users/${selectedUser.user_id}`, { method:"DELETE", token:session.token });
      setMessage("Member removed."); await loadWorkspace(session, scopedCompanyId);
    } catch (e) { setError(e.message); }
    finally { setWorkingId(""); }
  }

  return (
    <DashboardShell session={session} title="Workspace Users" hideTitle heroStats={[]}>
      <div className="mx-auto max-w-[1320px] space-y-5 px-1">

        {/* Alerts */}
        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
        {message ? <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${messageTone === "warning" ? "border border-amber-200 bg-amber-50 text-amber-800" : "border border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{message}</div> : null}

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={T.kicker}>Settings · Users</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">Workspace Users</h1>
            <p className="mt-0.5 text-sm text-slate-400">Create, manage, and control access for every team member.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Total Members",stats.total,"border-slate-200 bg-slate-100"],["Active",stats.active,"border-emerald-200 bg-emerald-100"],["Roles in Use",stats.roles,"border-sky-200 bg-sky-100"],["Inactive",stats.inactive,"border-rose-200 bg-rose-100"]].map(([l,v,a])=>(
            <div key={l} className={`rounded-2xl border px-4 py-3.5 ${a}`}>
              <p className={T.kicker}>{l}</p>
              <p className="mt-1 text-2xl font-bold leading-none text-slate-900">{v}</p>
            </div>
          ))}
        </div>

        {/* Company selector */}
        {isSuperAdmin ? (
          <div className={`${T.panel} flex flex-wrap items-center gap-4 px-5 py-4`}>
            <p className="text-sm font-semibold text-slate-700">Company</p>
            <select className={`${T.input} max-w-[280px]`} value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)}>
              <option value="">Choose company</option>
              {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.name}</option>)}
            </select>
          </div>
        ) : null}

        {/* Create member form */}
        <div className={`${T.panel} px-5 py-5`}>
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <DashboardIcon name="users" className="h-4 w-4" />
            </div>
            <div>
              <p className={T.kicker}>Add Member</p>
              <h2 className="text-base font-bold text-slate-900">Create new team member</h2>
            </div>
          </div>
          <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" onSubmit={createUser}>
            {isSuperAdmin ? (
              <label className="block space-y-1.5 sm:col-span-2 xl:col-span-3">
                <span className={T.kicker}>Company</span>
                <select className={`${T.input} max-w-[280px]`} value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)}>
                  <option value="">Choose company</option>
                  {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.name}</option>)}
                </select>
              </label>
            ) : null}
            <label className="block space-y-1.5">
              <span className={T.kicker}>Full Name *</span>
              <input className={T.input} value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" required />
            </label>
            <label className="block space-y-1.5">
              <span className={T.kicker}>Email *</span>
              <input className={T.input} type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" required />
            </label>
            <label className="block space-y-1.5">
              <span className={T.kicker}>Role *</span>
              <select className={T.input} value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}>
                {roles.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className={T.kicker}>Department</span>
              <input className={T.input} value={createForm.department} onChange={e => setCreateForm(f => ({ ...f, department: e.target.value }))} placeholder="Sales Desk" />
            </label>
            <label className="block space-y-1.5">
              <span className={T.kicker}>Phone</span>
              <input className={T.input} value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
            </label>
            <label className="block space-y-1.5">
              <span className={T.kicker}>Temp Password</span>
              <input className={T.input} type="password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="Optional" />
            </label>
            <div className="flex items-end sm:col-span-2 xl:col-span-3">
              <button className={T.gold} type="submit" disabled={creating || (isSuperAdmin && !selectedCompanyId)}>
                <DashboardIcon name="users" className="h-4 w-4" />
                {creating ? "Creating…" : "Create Team Member"}
              </button>
            </div>
          </form>
        </div>

        {/* Main layout */}
        <div className="grid gap-5 xl:grid-cols-[1fr_400px] xl:items-start">
          <UserRoster
            users={users} filteredUsers={filteredUsers} selectedUserId={selectedUserId}
            search={search} roleFilter={roleFilter} statusFilter={statusFilter} roles={roles} loading={loading}
            onSelect={setSelectedUserId} onSearch={setSearch} onRoleFilter={setRoleFilter} onStatusFilter={setStatusFilter}
          />
          <div className="space-y-4">
            <UserDetail
              selectedUser={selectedUser} memberForm={memberForm} saving={saving}
              workingId={workingId} roles={roles} company={company}
              onFormChange={(k, v) => setMemberForm(f => ({ ...f, [k]: v }))}
              onSave={saveUser} onToggle={toggleUser} onRemove={removeUser}
            />
            <SeatUsage usage={usage} />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
