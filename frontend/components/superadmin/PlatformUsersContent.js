"use client";

import { useMemo, useState } from "react";
import { apiRequest } from "../../lib/api";
import SideDrawer from "../ui/SideDrawer";
import { formatDateTime, titleize } from "./format";
import { Badge, INPUT_CLASS, MetricCard, Modal, Notice, PageIntro, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS, GHOST_BUTTON_CLASS } from "./ui";

const PLATFORM_ROLES = ["platform-admin", "platform-manager"];
const TENANT_ROLES = ["admin", "manager", "sales", "marketing", "support", "legal-team", "finance-team", "viewer"];
const isPlatformRoot = (r) => r === "super-admin" || PLATFORM_ROLES.includes(r);
const isPlatformOp = (r) => PLATFORM_ROLES.includes(r);
const ini = (n = "?") => String(n).split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
const blankForm = { name: "", email: "", password: "", role: "admin", company_id: "", managed_company_ids: [] };

function ago(value) {
  if (!value) return "Never";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  return days < 1 ? "Today" : days === 1 ? "Yesterday" : days < 60 ? `${days} d ago` : formatDateTime(value);
}

function CreateUserDrawer({ open, onClose, form, setForm, companies, roleOptions, onSubmit, submitting }) {
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const label = "block space-y-1 text-[12px] font-semibold text-slate-600";
  return (
    <SideDrawer open={open} onClose={onClose} title="New user" subtitle="A login for a company or for the platform team"
      footer={<div className="flex justify-end gap-2"><button type="button" className={SECONDARY_BUTTON_CLASS} onClick={onClose}>Cancel</button><button type="submit" form="create-user" className={PRIMARY_BUTTON_CLASS} disabled={submitting}>{submitting ? "Creating…" : "Create user"}</button></div>}>
      <form id="create-user" onSubmit={onSubmit} className="space-y-4">
        <section className="grid gap-3 rounded-[14px] bg-white p-4 ring-1 ring-slate-200 sm:grid-cols-2">
          <label className={label}><span>Name</span><input className={INPUT_CLASS} value={form.name} onChange={(e) => set("name", e.target.value)} required /></label>
          <label className={label}><span>Email</span><input className={INPUT_CLASS} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required /></label>
          <label className={label}><span>Password</span><input className={INPUT_CLASS} type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Leave empty to make one" /></label>
          <label className={label}><span>Role</span>
            <select className={INPUT_CLASS} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value, company_id: isPlatformRoot(e.target.value) ? "" : f.company_id }))}>
              {roleOptions.map((r) => <option key={r} value={r}>{titleize(r)}</option>)}
            </select>
          </label>
          {!isPlatformRoot(form.role) ? (
            <label className={`${label} sm:col-span-2`}><span>Company</span>
              <select className={INPUT_CLASS} value={form.company_id} onChange={(e) => set("company_id", e.target.value)} required>
                <option value="">Choose a company</option>
                {companies.map((c) => <option key={c.company_id} value={c.company_id}>{c.name}</option>)}
              </select>
              <span className="block text-[11px] font-normal text-slate-400">The company&apos;s seat limits apply.</span>
            </label>
          ) : null}
        </section>
        {isPlatformOp(form.role) ? (
          <section className="rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
            <p className="text-[13.5px] font-bold text-slate-900">Companies this person manages</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {companies.map((c) => {
                const on = form.managed_company_ids.includes(c.company_id);
                return <button key={c.company_id} type="button" aria-pressed={on} onClick={() => set("managed_company_ids", on ? form.managed_company_ids.filter((x) => x !== c.company_id) : [...form.managed_company_ids, c.company_id])}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 transition ${on ? "bg-brand-50 text-brand-800 ring-brand-200" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}>{c.name}</button>;
              })}
            </div>
          </section>
        ) : null}
      </form>
    </SideDrawer>
  );
}

/** Every login on the platform in one table: filter by company, role or status; reset passwords and switch people on or off. */
export default function PlatformUsersContent({ session, data, error, loading, refresh }) {
  const isSuperAdmin = session?.user?.role === "super-admin";
  const [form, setForm] = useState(blankForm);
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState("");
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [status, setStatus] = useState("");
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPw, setResetPw] = useState("");
  const [resetting, setResetting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const users = data.users?.items || [];
  const companies = data.companies?.items || [];
  const roleOptions = isSuperAdmin ? ["super-admin", ...PLATFORM_ROLES, ...TENANT_ROLES] : TENANT_ROLES;
  const active = users.filter((u) => u.is_active !== false && u.is_active !== 0);
  const seenWeek = users.filter((u) => u.last_login_at && Date.now() - new Date(u.last_login_at).getTime() < 7 * 86400000).length;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const on = u.is_active !== false && u.is_active !== 0;
      if (company === "__platform__" ? !isPlatformRoot(u.role) : company && u.company_id !== company) return false;
      if (roleFilter && u.role !== roleFilter) return false;
      if (status && (status === "active") !== on) return false;
      return !q || [u.name, u.email, u.role, u.company_name, u.phone].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    }).sort((a, b) => new Date(b.last_login_at || 0) - new Date(a.last_login_at || 0));
  }, [users, query, company, roleFilter, status]);

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      const body = { name: form.name, email: form.email, password: form.password, role: form.role, ...(isPlatformOp(form.role) ? { managed_company_ids: form.managed_company_ids } : {}), ...(!isPlatformRoot(form.role) && form.company_id ? { company_id: form.company_id } : {}) };
      const r = await apiRequest("/auth/create-employee", { method: "POST", token: session.token, body });
      setNotice({ tone: "success", text: `Login created for ${form.email}.${r?.temporary_password ? ` Password: ${r.temporary_password}` : ""}` });
      setForm(blankForm);
      setShowCreate(false);
      await refresh();
    } catch (err) { setNotice({ tone: "error", text: err.message }); } finally { setSubmitting(false); }
  }

  async function handleToggle(u) {
    const on = u.is_active !== false && u.is_active !== 0;
    if (on && !window.confirm(`Switch off ${u.name || u.email}? They are signed out and cannot sign in.`)) return;
    setTogglingId(u.user_id);
    setNotice(null);
    try { await apiRequest(on ? `/super-admin/deactivate/${u.user_id}` : `/super-admin/activate/${u.user_id}`, { method: "PUT", token: session.token }); setNotice({ tone: "success", text: `${u.name} ${on ? "switched off" : "switched on"}.` }); await refresh(); }
    catch (err) { setNotice({ tone: "error", text: err.message }); } finally { setTogglingId(""); }
  }

  async function handleReset(e) {
    e.preventDefault();
    setResetting(true);
    setNotice(null);
    try { await apiRequest(`/super-admin/reset-password/${resetTarget.user_id}`, { method: "PUT", token: session.token, body: { password: resetPw } }); setNotice({ tone: "success", text: `Password changed for ${resetTarget.email}.` }); setResetTarget(null); setResetPw(""); await refresh(); }
    catch (err) { setNotice({ tone: "error", text: err.message }); } finally { setResetting(false); }
  }

  if (loading) return <Notice tone="info" text="Loading users…" />;

  return (
    <div className="tw-buttons min-w-0 space-y-4 pb-10">
      <PageIntro title="Platform users" description="Every login across all companies. Change passwords and switch people on or off from here."
        actions={<><button type="button" className={SECONDARY_BUTTON_CLASS} onClick={refresh}>Refresh</button><button type="button" className={PRIMARY_BUTTON_CLASS} onClick={() => setShowCreate(true)}>+ New user</button></>} />
      <Notice tone="error" text={error} />
      {notice ? <Notice tone={notice.tone} text={notice.text} /> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="People" value={users.length} note={`${active.length} active`} tone="violet" />
        <MetricCard label="Signed in this week" value={seenWeek} note={`${users.length ? Math.round((seenWeek / users.length) * 100) : 0}% of everyone`} tone="emerald" />
        <MetricCard label="Platform team" value={users.filter((u) => isPlatformRoot(u.role)).length} note="Super admins and operators" tone="teal" />
        <MetricCard label="Switched off" value={users.length - active.length} note="Cannot sign in" tone="rose" />
      </div>

      <div className="rounded-[14px] bg-white ring-1 ring-slate-200">
        <div className="grid gap-2 border-b border-slate-100 p-3 md:grid-cols-[minmax(0,1fr)_180px_150px_130px]">
          <input className={INPUT_CLASS} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone or company" />
          <select className={INPUT_CLASS} value={company} onChange={(e) => setCompany(e.target.value)} aria-label="Company">
            <option value="">All companies</option>
            <option value="__platform__">Platform team</option>
            {companies.map((c) => <option key={c.company_id} value={c.company_id}>{c.name}</option>)}
          </select>
          <select className={INPUT_CLASS} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Role">
            <option value="">Any role</option>
            {["super-admin", ...PLATFORM_ROLES, ...TENANT_ROLES, "expert"].map((r) => <option key={r} value={r}>{titleize(r)}</option>)}
          </select>
          <select className={INPUT_CLASS} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">Any status</option><option value="active">Active</option><option value="off">Switched off</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[12.5px]">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400">
              <tr>{["Person", "Company", "Role", "Status", "Last sign-in", ""].map((h) => <th key={h} className="px-4 py-2.5 font-bold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((u) => {
                const on = u.is_active !== false && u.is_active !== 0;
                return (
                  <tr key={u.user_id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-[11px] font-bold text-white ${on ? "bg-brand-700" : "bg-slate-400"}`}>{ini(u.name)}</span>
                        <span className="min-w-0"><span className="block truncate font-semibold text-slate-900">{u.name || "Unknown"}</span><span className="block truncate text-[11px] text-slate-500">{u.email}</span></span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{isPlatformRoot(u.role) ? <Badge tone="teal">Platform</Badge> : u.company_name || "–"}</td>
                    <td className="px-4 py-2.5"><Badge tone={u.role === "super-admin" ? "violet" : u.role === "admin" ? "blue" : "slate"}>{titleize(u.role)}</Badge></td>
                    <td className="px-4 py-2.5"><Badge tone={on ? "emerald" : "rose"}>{on ? "Active" : "Off"}</Badge></td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{ago(u.last_login_at)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" className={GHOST_BUTTON_CLASS} onClick={() => { setResetTarget(u); setResetPw(""); }}>Password</button>
                        <button type="button" disabled={togglingId === u.user_id || u.user_id === session?.user?.user_id} onClick={() => handleToggle(u)}
                          className={`${GHOST_BUTTON_CLASS} ${on ? "text-rose-700" : "text-emerald-700"}`}>{togglingId === u.user_id ? "…" : on ? "Switch off" : "Switch on"}</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length ? <tr><td colSpan={6} className="px-4 py-10 text-center text-[13px] text-slate-500">Nobody matches.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-4 py-2.5 text-[12px] text-slate-500">{rows.length} of {users.length} people · newest sign-in first</p>
      </div>

      <CreateUserDrawer open={showCreate} onClose={() => setShowCreate(false)} form={form} setForm={setForm} companies={companies} roleOptions={roleOptions} onSubmit={handleCreate} submitting={submitting} />
      {resetTarget ? (
        <Modal title={`New password for ${resetTarget.name || resetTarget.email}`} description="They can sign in with it right away. Share it privately." onClose={() => setResetTarget(null)}>
          <form onSubmit={handleReset} className="space-y-3">
            <input className={INPUT_CLASS} type="password" value={resetPw} onChange={(e) => setResetPw(e.target.value)} placeholder="At least 8 characters" minLength={8} required autoFocus />
            <div className="flex justify-end gap-2">
              <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => setResetTarget(null)}>Cancel</button>
              <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={resetting}>{resetting ? "Saving…" : "Save password"}</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
