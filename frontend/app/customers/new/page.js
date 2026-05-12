"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../components/dashboard/icons";
import { apiRequest } from "../../../lib/api";
import { buildCustomerNotes } from "../../../lib/customerProfile";
import { loadSession } from "../../../lib/session";
import {
  canManageScopedAssignments, formatScopedError, isPlatformConsoleRole,
  loadTeamScopeResources, resolveScopedCompanyId, shouldShowTeamSelector,
  scopedUsersEmptyMessage, teamBadgeLabel, teamSelectLabel, teamSelectionRequiredMessage,
} from "../../../lib/teamScope";
import { AlertError } from "../../../components/ui/Alert";

const C = {
  panel: "rounded-2xl border border-slate-100 bg-white shadow-sm",
  input: "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-50",
  kicker: "text-[10px] font-bold uppercase tracking-widest text-slate-400",
  label: "block space-y-1.5",
};
const Btn = {
  gold: "inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 hover:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed",
  ghost: "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50",
};

function initials(v = "C") { return String(v).split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("") || "C"; }
function field(form, key, val) { return { ...form, [key]: val }; }

function createForm(companyId = "") {
  return { company_id: companyId, name: "", company_name: "", email: "", phone: "", team_id: "", assigned_to: "", total_value: "", website: "", industry: "", business_summary: "", address_street: "", address_city: "", address_state: "", address_zip: "", country: "India", notes: "", onboarding_date: "", onboarding_status: "pending" };
}

function Section({ step, title, sub, children }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm px-5 py-5">
      <div className="mb-5 flex items-center gap-3 border-b border-slate-50 pb-4">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-50 text-xs font-bold text-amber-700 border border-amber-200">{step}</span>
        <div>
          <p className="text-sm font-bold text-slate-900">{title}</p>
          {sub ? <p className="text-xs text-slate-400">{sub}</p> : null}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Label({ label, span, children }) {
  return (
    <label className={`block space-y-1.5 ${span || ""}`}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export default function NewCustomerPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(createForm());
  const [members, setMembers] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [resourceLoading, setResourceLoading] = useState(true);

  const role = session?.user?.role || "";
  const isPlatformConsole = isPlatformConsoleRole(role);
  const companyId = resolveScopedCompanyId(session, form.company_id);
  const canAssign = canManageScopedAssignments(role);
  const teamSelectorVisible = shouldShowTeamSelector(role, teams);
  const teamSelectionPending = teamSelectorVisible && !form.team_id;
  const selectedTeam = useMemo(() => teams.find(t => t.team_id === form.team_id) || null, [form.team_id, teams]);
  const ownerMsg = useMemo(() => {
    if (!canAssign || resourceLoading) return "";
    if (teamSelectionPending) return "Choose a team to load available owners.";
    if (!users.length) return scopedUsersEmptyMessage(selectedTeam);
    return "";
  }, [canAssign, resourceLoading, selectedTeam, teamSelectionPending, users.length]);

  const set = key => e => setForm(f => field(f, key, e.target.value));

  useEffect(() => {
    const s = loadSession();
    if (!s) return router.replace("/login");
    if (s.user?.role === "viewer") return router.replace("/customers");
    setSession(s);
    if (isPlatformConsoleRole(s.user?.role)) {
      apiRequest("/companies?page_size=50", { token: s.token }).then(r => {
        const items = r.items || [];
        setCompanies(items);
        setForm(createForm(items[0]?.company_id || ""));
      }).catch(e => setError(formatScopedError(e, "Failed to load companies.")));
      return;
    }
    const co = s.company ? [{ company_id: s.company.company_id || s.user?.company_id, name: s.company.name }] : [];
    setCompanies(co);
    setForm(createForm(s.user?.company_id || s.company?.company_id || ""));
  }, [router]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!session?.token || !companyId) { setTeams([]); setUsers([]); setResourceLoading(false); return; }
      setResourceLoading(true);
      try {
        const r = await loadTeamScopeResources(session.token, { companyId, teamId: form.team_id, includeUsers: canAssign && !teamSelectionPending });
        if (ignore) return;
        setTeams(r.teams || []); setUsers(r.users || []);
        setForm(f => ({ ...f, team_id: r.teamId || "", assigned_to: (r.users || []).some(u => u.user_id === f.assigned_to) ? f.assigned_to : "" }));
      } catch (e) { if (!ignore) setError(formatScopedError(e, "Failed to load scope.")); }
      finally { if (!ignore) setResourceLoading(false); }
    }
    load();
    return () => { ignore = true; };
  }, [canAssign, companyId, form.team_id, session, teamSelectionPending]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (isPlatformConsole && !form.company_id) { setError("Choose a company first."); return; }
    if (teamSelectorVisible && !form.team_id) { setError(teamSelectionRequiredMessage("customer")); return; }
    setSaving(true); setError("");
    try {
      const r = await apiRequest("/customers", {
        method: "POST", token: session.token,
        body: {
          company_id: isPlatformConsole ? form.company_id : undefined,
          name: form.name.trim(), company_name: form.company_name.trim(),
          email: form.email.trim(), phone: form.phone.trim(),
          team_id: form.team_id || undefined,
          assigned_to: canAssign ? form.assigned_to || undefined : undefined,
          total_value: Number(form.total_value || 0),
          onboarding_date: form.onboarding_date || null,
          onboarding_status: form.onboarding_status || "pending",
          notes: buildCustomerNotes({ website: form.website.trim(), industry: form.industry.trim(), business_summary: form.business_summary.trim(), address_street: form.address_street.trim(), address_city: form.address_city.trim(), address_state: form.address_state.trim(), address_zip: form.address_zip.trim(), country: form.country.trim() }, form.notes),
        },
      });
      if (members.length) {
        await Promise.all(members.map(uid => apiRequest(`/customers/${r.customer_id}/members`, { method: "POST", token: session.token, body: { user_id: uid } })));
      }
      router.push(`/customers/${r.customer_id}`);
    } catch (err) { setError(formatScopedError(err, "Failed to create customer.")); }
    finally { setSaving(false); }
  }

  return (
    <DashboardShell session={session} title="Add Customer" hideTitle heroStats={[]}>
      <div className="mx-auto max-w-[860px] space-y-5 px-1">
        <AlertError message={error} onDismiss={() => setError("")} />

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={C.kicker}>Customer Desk</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">Add New Customer</h1>
          </div>
          <button className={Btn.ghost} type="button" onClick={() => router.push("/customers")}>← Back to Customers</button>
        </div>

        {/* Live preview strip */}
        <div className="rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-white px-5 py-4 flex items-center gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-600 text-sm font-bold text-white">
            {initials(form.company_name || form.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{form.company_name || "Company name will appear here"}</p>
            <p className="truncate text-xs text-slate-400">{form.name || "Contact name"}{form.email ? ` · ${form.email}` : ""}{form.phone ? ` · ${form.phone}` : ""}</p>
          </div>
          {form.industry ? <span className="ml-auto shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-xs font-semibold text-amber-700">{form.industry}</span> : null}
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Section 1 — Identity */}
          <Section step="01" title="Primary Contact" sub="Who is the main person for this account?">
            {isPlatformConsole ? (
              <Label label="Company (Tenant)" span="sm:col-span-2">
                <select className={C.input} value={form.company_id} onChange={e => setForm(f => ({ ...f, company_id: e.target.value, team_id: "", assigned_to: "" }))}>
                  <option value="">Select company</option>
                  {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.name}</option>)}
                </select>
              </Label>
            ) : null}
            <Label label="Contact Name *"><input className={C.input} value={form.name} onChange={set("name")} placeholder="Full name" required /></Label>
            <Label label="Company Name *"><input className={C.input} value={form.company_name} onChange={set("company_name")} placeholder="Business name" required /></Label>
            <Label label="Email *"><input className={C.input} type="email" value={form.email} onChange={set("email")} placeholder="email@company.com" required /></Label>
            <Label label="Phone *"><input className={C.input} value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" required /></Label>
            {teamSelectorVisible ? (
              <Label label="Team">
                <select className={C.input} value={form.team_id} onChange={set("team_id")}>
                  <option value="">Select team</option>
                  {teams.map(t => <option key={t.team_id} value={t.team_id}>{teamSelectLabel(t)}</option>)}
                </select>
              </Label>
            ) : null}
            {canAssign ? (
              <Label label="Assign Owner">
                <select className={C.input} value={form.assigned_to} onChange={set("assigned_to")} disabled={resourceLoading || teamSelectionPending}>
                  <option value="">Keep with current user</option>
                  {users.map(u => <option key={u.user_id} value={u.user_id}>{u.name} · {u.role}</option>)}
                </select>
                {ownerMsg ? <p className="text-xs text-amber-600 mt-1">{ownerMsg}</p> : null}
              </Label>
            ) : null}
            {canAssign && users.length > 0 ? (
              <div className="sm:col-span-2 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Add People to This Customer</span>
                <div className="flex flex-wrap gap-2">
                  {members.map(uid => {
                    const u = users.find(x => x.user_id === uid);
                    return u ? (
                      <span key={uid} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                        {u.name}
                        <button type="button" className="text-emerald-500 hover:text-rose-500" onClick={() => setMembers(m => m.filter(id => id !== uid))}>&times;</button>
                      </span>
                    ) : null;
                  })}
                </div>
                <select className={C.input} value="" onChange={e => { const v = e.target.value; if (v && !members.includes(v) && v !== form.assigned_to) setMembers(m => [...m, v]); }}>
                  <option value="">+ Add team member…</option>
                  {users.filter(u => u.user_id !== form.assigned_to && !members.includes(u.user_id)).map(u => <option key={u.user_id} value={u.user_id}>{u.name} · {u.role}</option>)}
                </select>
                <p className="text-xs text-slate-400">These people will have access to this customer for collaboration.</p>
              </div>
            ) : null}
            {selectedTeam ? (
              <div className="sm:col-span-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5 text-xs text-amber-800">
                Team scope: <strong>{teamBadgeLabel(selectedTeam)}</strong>
              </div>
            ) : null}
          </Section>

          {/* Section 2 — Company Profile */}
          <Section step="02" title="Company Profile" sub="Industry, website, and what the business does">
            <Label label="Industry"><input className={C.input} value={form.industry} onChange={set("industry")} placeholder="Technology, Retail, Finance…" /></Label>
            <Label label="Website"><input className={C.input} value={form.website} onChange={set("website")} placeholder="https://company.com" /></Label>
            <Label label="Business Summary" span="sm:col-span-2">
              <textarea className={`${C.input} min-h-[110px] resize-y`} rows={4} value={form.business_summary} onChange={set("business_summary")} placeholder="What does this company do, who do they serve, and why does this account matter?" />
            </Label>
          </Section>

          {/* Section 3 — Address */}
          <Section step="03" title="Location" sub="Address details for account context">
            <Label label="Street Address" span="sm:col-span-2"><input className={C.input} value={form.address_street} onChange={set("address_street")} placeholder="123 Main Street" /></Label>
            <Label label="City"><input className={C.input} value={form.address_city} onChange={set("address_city")} /></Label>
            <Label label="State"><input className={C.input} value={form.address_state} onChange={set("address_state")} /></Label>
            <Label label="Postal Code"><input className={C.input} value={form.address_zip} onChange={set("address_zip")} /></Label>
            <Label label="Country"><input className={C.input} value={form.country} onChange={set("country")} /></Label>
          </Section>

          {/* Section 4 — Value & Note */}
          <Section step="04" title="Onboarding & Value" sub="Track onboarding status and commercial value">
            <Label label="Onboarding Date"><input className={C.input} type="date" value={form.onboarding_date} onChange={set("onboarding_date")} /></Label>
            <Label label="Onboarding Status">
              <select className={C.input} value={form.onboarding_status} onChange={set("onboarding_status")}>
                <option value="pending">Onboarding Pending</option>
                <option value="training">Training</option>
                <option value="done">Onboarding Done</option>
              </select>
            </Label>
            <Label label="Total Value (₹)"><input className={C.input} type="number" value={form.total_value} onChange={set("total_value")} placeholder="0" /></Label>
            <div />
            <Label label="Opening Note" span="sm:col-span-2">
              <textarea className={`${C.input} min-h-[110px] resize-y`} rows={4} value={form.notes} onChange={set("notes")} placeholder="Capture the first note, relationship context, or next action…" />
            </Label>
          </Section>

          {/* Actions */}
          <div className="flex flex-wrap justify-end gap-3 pt-1">
            <button className={Btn.ghost} type="button" onClick={() => router.push("/customers")}>Cancel</button>
            <button className={Btn.gold} type="submit" disabled={saving || resourceLoading}>
              <DashboardIcon name="customers" className="h-4 w-4" />
              {saving ? "Creating…" : "Create Customer"}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
