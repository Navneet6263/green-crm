"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardShell from "../../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../../components/dashboard/icons";
import { apiRequest } from "../../../../lib/api";
import { buildCustomerNotes, parseCustomerProfile, stripCustomerProfile } from "../../../../lib/customerProfile";
import { loadSession } from "../../../../lib/session";
import {
  canManageScopedAssignments, formatScopedError, loadTeamScopeResources,
  shouldShowTeamSelector, scopedUsersEmptyMessage, teamBadgeLabel,
  teamSelectLabel, teamSelectionRequiredMessage,
} from "../../../../lib/teamScope";
import { AlertError } from "../../../../components/ui/Alert";

const C = {
  panel: "rounded-2xl border border-slate-100 bg-white shadow-sm",
  input: "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-50",
  kicker: "text-[10px] font-bold uppercase tracking-widest text-slate-400",
};
const Btn = {
  gold: "inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 hover:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed",
  ghost: "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50",
};

function initials(v = "C") { return String(v).split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("") || "C"; }

function createForm(c = null) {
  const p = parseCustomerProfile(c?.notes);
  return {
    name: c?.name || "", company_name: c?.company_name || "", email: c?.email || "", phone: c?.phone || "",
    status: c?.status || "active", total_value: String(c?.total_value || ""), team_id: c?.team_id || "",
    assigned_to: c?.assigned_to || "", next_follow_up: c?.next_follow_up ? new Date(c.next_follow_up).toISOString().slice(0, 16) : "",
    website: p.website || "", industry: p.industry || "", business_summary: p.business_summary || "",
    address_street: p.address_street || "", address_city: p.address_city || "", address_state: p.address_state || "",
    address_zip: p.address_zip || "", country: p.country || "India",
  };
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

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState(createForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resourceLoading, setResourceLoading] = useState(false);

  const role = session?.user?.role || "";
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

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    const s = loadSession();
    if (!s) return router.replace("/login");
    if (s.user?.role === "viewer") return router.replace(`/customers/${params.id}`);
    setSession(s);
    const allowAssign = canManageScopedAssignments(s.user?.role);
    apiRequest(`/customers/${params.id}`, { token: s.token })
      .then(async c => {
        const cid = c.company_id || s.user?.company_id || s.company?.company_id || "";
        const scope = await loadTeamScopeResources(s.token, { companyId: cid, teamId: c.team_id || "", includeUsers: allowAssign });
        const tms = scope.teams || [], urs = scope.users || [];
        setCustomer(c); setTeams(tms); setUsers(urs);
        setForm({ ...createForm(c), team_id: scope.teamId || "", assigned_to: urs.some(u => u.user_id === c.assigned_to) ? c.assigned_to : "" });
      })
      .catch(e => setError(formatScopedError(e, "Failed to load customer.")))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  useEffect(() => {
    let ignore = false;
    async function reload() {
      if (!session?.token || !customer?.company_id || !canAssign) return;
      setResourceLoading(true);
      try {
        if (teamSelectionPending) { if (!ignore) { setUsers([]); setForm(f => ({ ...f, assigned_to: "" })); } return; }
        const r = await loadTeamScopeResources(session.token, { companyId: customer.company_id, teamId: form.team_id, includeUsers: true });
        const urs = r.users || [];
        if (!ignore) { setUsers(urs); setForm(f => ({ ...f, assigned_to: urs.some(u => u.user_id === f.assigned_to) ? f.assigned_to : "" })); }
      } catch (_) { if (!ignore) setUsers([]); }
      finally { if (!ignore) setResourceLoading(false); }
    }
    reload();
    return () => { ignore = true; };
  }, [canAssign, customer?.company_id, form.team_id, session, teamSelectionPending]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.company_name.trim() || !form.email.trim() || !form.phone.trim()) { setError("Name, company, email, and phone are required."); return; }
    if (teamSelectorVisible && !form.team_id) { setError(teamSelectionRequiredMessage("customer")); return; }
    setSaving(true); setError("");
    try {
      await apiRequest(`/customers/${params.id}`, {
        method: "PATCH", token: session.token,
        body: {
          name: form.name.trim(), company_name: form.company_name.trim(), email: form.email.trim(), phone: form.phone.trim(),
          status: form.status, total_value: Number(form.total_value || 0),
          team_id: form.team_id || undefined, assigned_to: canAssign ? form.assigned_to || null : undefined,
          next_follow_up: form.next_follow_up || null,
          notes: buildCustomerNotes({ website: form.website.trim(), industry: form.industry.trim(), business_summary: form.business_summary.trim(), address_street: form.address_street.trim(), address_city: form.address_city.trim(), address_state: form.address_state.trim(), address_zip: form.address_zip.trim(), country: form.country.trim() }, stripCustomerProfile(customer?.notes), customer?.notes),
        },
      });
      router.push(`/customers/${params.id}`);
    } catch (err) { setError(formatScopedError(err, "Failed to save customer.")); }
    finally { setSaving(false); }
  }

  return (
    <DashboardShell session={session} title="Edit Customer" hideTitle heroStats={[]}>
      <div className="mx-auto max-w-[860px] space-y-5 px-1">
        <AlertError message={error} onDismiss={() => setError("")} />

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={C.kicker}>Customer Desk</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
              {customer ? `Edit: ${customer.company_name || customer.name}` : "Edit Customer"}
            </h1>
          </div>
          <button className={Btn.ghost} type="button" onClick={() => router.push(`/customers/${params.id}`)}>← Back</button>
        </div>

        {loading ? <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 text-sm text-slate-500">Loading customer…</div> : null}

        {!loading && customer ? (
          <>
            {/* Preview strip */}
            <div className="rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-white px-5 py-4 flex flex-wrap items-center gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-600 text-sm font-bold text-white">
                {initials(form.company_name || form.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">{form.company_name || "—"}</p>
                <p className="truncate text-xs text-slate-400">{form.name}{form.email ? ` · ${form.email}` : ""}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-0.5 font-semibold text-slate-600">{customer.customer_id}</span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 font-semibold text-amber-700">₹{Number(form.total_value||0).toLocaleString("en-IN")}</span>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Section 1 — Identity */}
              <Section step="01" title="Primary Contact" sub="Name, email, and phone">
                <Label label="Contact Name *"><input className={C.input} value={form.name} onChange={set("name")} required /></Label>
                <Label label="Company Name *"><input className={C.input} value={form.company_name} onChange={set("company_name")} required /></Label>
                <Label label="Email *"><input className={C.input} type="email" value={form.email} onChange={set("email")} required /></Label>
                <Label label="Phone *"><input className={C.input} value={form.phone} onChange={set("phone")} required /></Label>
              </Section>

              {/* Section 2 — Company Profile */}
              <Section step="02" title="Company Profile" sub="Industry, website, and business summary">
                <Label label="Industry"><input className={C.input} value={form.industry} onChange={set("industry")} /></Label>
                <Label label="Website"><input className={C.input} value={form.website} onChange={set("website")} /></Label>
                <Label label="Business Summary" span="sm:col-span-2">
                  <textarea className={`${C.input} min-h-[110px] resize-y`} rows={4} value={form.business_summary} onChange={set("business_summary")} />
                </Label>
              </Section>

              {/* Section 3 — Address */}
              <Section step="03" title="Location" sub="Address details">
                <Label label="Street Address" span="sm:col-span-2"><input className={C.input} value={form.address_street} onChange={set("address_street")} /></Label>
                <Label label="City"><input className={C.input} value={form.address_city} onChange={set("address_city")} /></Label>
                <Label label="State"><input className={C.input} value={form.address_state} onChange={set("address_state")} /></Label>
                <Label label="Postal Code"><input className={C.input} value={form.address_zip} onChange={set("address_zip")} /></Label>
                <Label label="Country"><input className={C.input} value={form.country} onChange={set("country")} /></Label>
              </Section>

              {/* Section 4 — Account Control */}
              <Section step="04" title="Account Control" sub="Status, value, ownership, and follow-up">
                <Label label="Status">
                  <select className={C.input} value={form.status} onChange={set("status")}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </Label>
                <Label label="Total Value (₹)"><input className={C.input} type="number" value={form.total_value} onChange={set("total_value")} /></Label>
                <Label label="Next Follow-up"><input className={C.input} type="datetime-local" value={form.next_follow_up} onChange={set("next_follow_up")} /></Label>
                {canAssign ? (
                  <Label label="Assign Owner">
                    <select className={C.input} value={form.assigned_to} onChange={set("assigned_to")} disabled={!canAssign || resourceLoading || teamSelectionPending}>
                      <option value="">Unassigned</option>
                      {users.map(u => <option key={u.user_id} value={u.user_id}>{u.name} · {u.role}</option>)}
                    </select>
                    {ownerMsg ? <p className="text-xs text-amber-600 mt-1">{ownerMsg}</p> : null}
                  </Label>
                ) : null}
                {teamSelectorVisible ? (
                  <Label label="Team">
                    <select className={C.input} value={form.team_id} onChange={set("team_id")}>
                      <option value="">Select team</option>
                      {teams.map(t => <option key={t.team_id} value={t.team_id}>{teamSelectLabel(t)}</option>)}
                    </select>
                  </Label>
                ) : null}
                {selectedTeam ? (
                  <div className="sm:col-span-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5 text-xs text-amber-800">
                    Team scope: <strong>{teamBadgeLabel(selectedTeam)}</strong>
                  </div>
                ) : null}
              </Section>

              {/* Actions */}
              <div className="flex flex-wrap justify-end gap-3 pt-1">
                <button className={Btn.ghost} type="button" onClick={() => router.push(`/customers/${params.id}`)}>Cancel</button>
                <button className={Btn.gold} type="submit" disabled={saving}>
                  <DashboardIcon name="settings" className="h-4 w-4" />
                  {saving ? "Saving…" : "Save Customer"}
                </button>
              </div>
            </form>
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}
