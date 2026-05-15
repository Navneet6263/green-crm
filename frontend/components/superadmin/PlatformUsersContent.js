"use client";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../lib/api";
import { formatDateTime, titleize } from "./format";
import { Badge, EmptyState, INPUT_CLASS, Modal, Notice, PageIntro, Panel, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS, GHOST_BUTTON_CLASS, SUB_PANEL_CLASS } from "./ui";

const PLATFORM_ROLES = ["platform-admin", "platform-manager"];
const TENANT_ROLES = ["admin", "manager", "sales", "marketing", "support", "legal-team", "finance-team", "viewer"];

function isPlatformRoot(r) { return r === "super-admin" || PLATFORM_ROLES.includes(r); }
function isPlatformOp(r) { return PLATFORM_ROLES.includes(r); }
function ini(n = "?") { return String(n).split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("") || "?"; }

function CompanyGroup({ name, count, users, expanded, onToggle, onReset, onToggleUser, togglingId, companyId, onSuspend, suspending, status, isPlatform }) {
  return (
    <div className="rounded-xl border border-slate-100 overflow-hidden">
      <div className="flex items-center bg-white">
        <button type="button" onClick={onToggle} className="flex flex-1 items-center justify-between px-4 py-3 hover:bg-slate-50 transition">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-600 text-[11px] font-bold text-white">{ini(name)}</span>
            <span className="text-sm font-semibold text-slate-900">{name}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">{count} users</span>
            {status ? <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${status === "active" ? "bg-emerald-50 text-emerald-700" : status === "suspended" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-700"}`}>{status}</span> : null}
            <svg className={`h-4 w-4 text-slate-400 transition ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </button>
        {!isPlatform && companyId && onSuspend ? (
          <button type="button" onClick={() => onSuspend(companyId, name, status)} disabled={suspending === companyId} className={`mr-3 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${status === "suspended" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-rose-50 text-rose-600 hover:bg-rose-100"}`}>
            {suspending === companyId ? "…" : status === "suspended" ? "Activate" : "Suspend"}
          </button>
        ) : null}
      </div>
      {expanded ? (
        <div className="border-t border-slate-100 bg-slate-50/50 divide-y divide-slate-100">
          {users.map(u => {
            const active = u.is_active !== false;
            return (
              <div key={u.user_id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white transition">
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-[10px] font-bold text-white ${active ? "bg-emerald-600" : "bg-slate-400"}`}>{ini(u.name)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">{u.name || "Unknown"}</p>
                    <Badge tone={active ? "emerald" : "rose"}>{active ? "Active" : "Off"}</Badge>
                    <Badge>{titleize(u.role)}</Badge>
                  </div>
                  <p className="truncate text-[11px] text-slate-400">{u.email}{u.last_login_at ? ` · Last: ${formatDateTime(u.last_login_at)}` : ""}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" onClick={() => onReset(u)} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 transition">Reset</button>
                  <button type="button" onClick={() => onToggleUser(u)} disabled={togglingId === u.user_id} className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${active ? "bg-rose-50 text-rose-600 hover:bg-rose-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>
                    {togglingId === u.user_id ? "…" : active ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function PlatformUsersContent({ session, data, error, loading, refresh }) {
  const isSuperAdmin = session?.user?.role === "super-admin";
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin", company_id: "", managed_company_ids: [] });
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState("");
  const [query, setQuery] = useState("");
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPw, setResetPw] = useState("");
  const [resetting, setResetting] = useState(false);
  const [expandedCompanies, setExpandedCompanies] = useState(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [suspending, setSuspending] = useState("");

  const users = data.users?.items || [];
  const companies = data.companies?.items || [];
  const safety = data.safety || {};
  const roleOptions = isSuperAdmin ? ["super-admin", ...PLATFORM_ROLES, ...TENANT_ROLES] : TENANT_ROLES;

  // Group users by company
  const companiesById = useMemo(() => new Map(companies.map(c => [c.company_id, c])), [companies]);
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = users.filter(u => {
      if (!q) return true;
      return [u.name, u.email, u.role, u.company_name].filter(Boolean).some(v => String(v).toLowerCase().includes(q));
    });
    const map = new Map();
    // Platform users group
    const platform = filtered.filter(u => isPlatformRoot(u.role));
    if (platform.length) map.set("__platform__", { name: "Platform Operators", users: platform });
    // Company groups
    const companyMap = new Map();
    filtered.filter(u => !isPlatformRoot(u.role)).forEach(u => {
      const key = u.company_id || "__none__";
      const name = u.company_name || "No Company";
      const status = companiesById.get(u.company_id)?.status || "";
      if (!companyMap.has(key)) companyMap.set(key, { name, users: [], status, companyId: u.company_id });
      companyMap.get(key).users.push(u);
    });
    // Sort by user count desc
    [...companyMap.entries()].sort((a, b) => b[1].users.length - a[1].users.length).forEach(([k, v]) => map.set(k, v));
    return map;
  }, [users, query]);

  function toggle(key) { setExpandedCompanies(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; }); }
  function expandAll() { setExpandedCompanies(new Set(grouped.keys())); }
  function collapseAll() { setExpandedCompanies(new Set()); }

  async function handleCreate(e) {
    e.preventDefault(); setSubmitting(true); setNotice(null);
    try {
      const body = { name: form.name, email: form.email, password: form.password, role: form.role, ...(isPlatformOp(form.role) ? { managed_company_ids: form.managed_company_ids } : {}), ...(!isPlatformRoot(form.role) && form.company_id ? { company_id: form.company_id } : {}) };
      const r = await apiRequest("/auth/create-employee", { method: "POST", token: session.token, body });
      const pw = r?.temporary_password ? ` Password: ${r.temporary_password}` : "";
      setNotice({ tone: "success", text: `User created for ${form.email}.${pw}` });
      setForm({ name: "", email: "", password: "", role: "admin", company_id: "", managed_company_ids: [] });
      setShowCreate(false); await refresh();
    } catch (err) { setNotice({ tone: "error", text: err.message }); } finally { setSubmitting(false); }
  }

  async function handleToggle(u) {
    setTogglingId(u.user_id); setNotice(null);
    try { await apiRequest(u.is_active ? `/super-admin/deactivate/${u.user_id}` : `/super-admin/activate/${u.user_id}`, { method: "PUT", token: session.token }); setNotice({ tone: "success", text: `${u.name} ${u.is_active ? "disabled" : "enabled"}.` }); await refresh(); }
    catch (err) { setNotice({ tone: "error", text: err.message }); } finally { setTogglingId(""); }
  }

  async function handleReset(e) {
    e.preventDefault(); if (!resetTarget) return; setResetting(true); setNotice(null);
    try { await apiRequest(`/super-admin/reset-password/${resetTarget.user_id}`, { method: "PUT", token: session.token, body: { password: resetPw } }); setNotice({ tone: "success", text: `Password reset for ${resetTarget.email}.` }); setResetTarget(null); setResetPw(""); await refresh(); }
    catch (err) { setNotice({ tone: "error", text: err.message }); } finally { setResetting(false); }
  }

  async function handleSuspendCompany(companyId, name, currentStatus) {
    const newStatus = currentStatus === "suspended" ? "active" : "suspended";
    if (!window.confirm(`${newStatus === "suspended" ? "Suspend" : "Activate"} "${name}"?`)) return;
    setSuspending(companyId); setNotice(null);
    try {
      await apiRequest(`/companies/${companyId}`, { method: "PUT", token: session.token, body: { status: newStatus } });
      setNotice({ tone: "success", text: `${name} is now ${newStatus}.` }); await refresh();
    } catch (err) { setNotice({ tone: "error", text: err.message }); } finally { setSuspending(""); }
  }

  if (loading) return <Notice tone="info" text="Loading users…" />;

  return (
    <>
      <div className="space-y-4">
        <Notice tone="error" text={error} />
        {notice ? <Notice tone={notice.tone} text={notice.text} /> : null}

        <PageIntro eyebrow="Users" title="Platform Users" meta={<><Badge tone="violet">{users.length} total</Badge><Badge tone="emerald">{users.filter(u => u.is_active !== false).length} active</Badge><Badge>{companies.length} companies</Badge></>} actions={<button type="button" onClick={() => setShowCreate(!showCreate)} className={showCreate ? SECONDARY_BUTTON_CLASS : PRIMARY_BUTTON_CLASS}>{showCreate ? "Close" : "+ Create User"}</button>} />

        {/* Create Form — collapsible */}
        {showCreate ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-5">
            <form onSubmit={handleCreate}>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-1"><span className="text-[11px] font-semibold text-slate-500">Name</span><input className={INPUT_CLASS} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></label>
                <label className="space-y-1"><span className="text-[11px] font-semibold text-slate-500">Email</span><input className={INPUT_CLASS} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></label>
                <label className="space-y-1"><span className="text-[11px] font-semibold text-slate-500">Password</span><input className={INPUT_CLASS} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Auto-generate" /></label>
                <label className="space-y-1"><span className="text-[11px] font-semibold text-slate-500">Role</span><select className={INPUT_CLASS} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value, company_id: isPlatformRoot(e.target.value) ? "" : f.company_id }))}>{roleOptions.map(r => <option key={r} value={r}>{titleize(r)}</option>)}</select></label>
                {!isPlatformRoot(form.role) ? <label className="space-y-1"><span className="text-[11px] font-semibold text-slate-500">Company</span><select className={INPUT_CLASS} value={form.company_id} onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))} required><option value="">Select</option>{companies.map(c => <option key={c.company_id} value={c.company_id}>{c.name}</option>)}</select></label> : null}
              </div>
              {isPlatformOp(form.role) ? (
                <div className="mt-3"><p className="text-[11px] font-semibold text-slate-500 mb-2">Managed Companies</p><div className="flex flex-wrap gap-2">{companies.map(c => { const on = form.managed_company_ids.includes(c.company_id); return <button key={c.company_id} type="button" onClick={() => setForm(f => ({ ...f, managed_company_ids: on ? f.managed_company_ids.filter(x => x !== c.company_id) : [...f.managed_company_ids, c.company_id] }))} className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${on ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{c.name}</button>; })}</div></div>
              ) : null}
              <div className="mt-3 flex gap-2">
                <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create"}</button>
                <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            </form>
          </div>
        ) : null}

        {/* Search + Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <input className={`${INPUT_CLASS} max-w-xs`} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search users…" />
          <button type="button" onClick={expandAll} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 transition">Expand All</button>
          <button type="button" onClick={collapseAll} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 transition">Collapse All</button>
          <span className="ml-auto text-xs text-slate-400">{users.length} users · {grouped.size} groups</span>
        </div>

        {/* Company-wise Accordion */}
        {grouped.size ? (
          <div className="space-y-2">
            {[...grouped.entries()].map(([key, { name, users: grpUsers, status, companyId }]) => (
              <CompanyGroup key={key} name={name} count={grpUsers.length} users={grpUsers} expanded={expandedCompanies.has(key)} onToggle={() => toggle(key)} onReset={u => { setResetTarget(u); setResetPw(""); }} onToggleUser={handleToggle} togglingId={togglingId} companyId={companyId} onSuspend={isSuperAdmin ? handleSuspendCompany : null} suspending={suspending} status={status} isPlatform={key === "__platform__"} />
            ))}
          </div>
        ) : <EmptyState icon="users" title="No users found" description="Try a different search." />}
      </div>

      {/* Reset Password Modal */}
      {resetTarget ? (
        <Modal title={`Reset: ${resetTarget.name || resetTarget.email}`} onClose={() => setResetTarget(null)}>
          <form onSubmit={handleReset} className="space-y-3">
            <input className={INPUT_CLASS} type="password" value={resetPw} onChange={e => setResetPw(e.target.value)} placeholder="New password (min 8)" minLength={8} required />
            <div className="flex gap-2">
              <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={resetting}>{resetting ? "Saving…" : "Save"}</button>
              <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => setResetTarget(null)}>Cancel</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
