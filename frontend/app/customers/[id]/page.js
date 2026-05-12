"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../components/dashboard/icons";
import { CustomerStatusBadge, OnboardingStatusBadge, isCustomerFollowUpOverdue } from "../../../components/customers/CustomerStatusBits";
import { apiRequest } from "../../../lib/api";
import { buildCustomerNotes, parseCustomerProfile, stripCustomerProfile } from "../../../lib/customerProfile";
import { formatIndiaDateTime } from "../../../lib/dateTime";
import { loadSession } from "../../../lib/session";
import { formatScopedError, teamBadgeLabel } from "../../../lib/teamScope";
import { AlertError, AlertSuccess } from "../../../components/ui/Alert";

const C = {
  panel: "rounded-2xl border border-slate-100 bg-white shadow-sm",
  input: "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50",
  kicker: "text-[10px] font-bold uppercase tracking-widest text-slate-400",
};
const Btn = {
  gold: "inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 hover:border-amber-400 disabled:opacity-50",
  ghost: "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50",
};

function money(v) { return `₹${Number(v||0).toLocaleString("en-IN")}`; }
function when(v) { return v ? formatIndiaDateTime(v, true) : "—"; }
function initials(v="C") { return String(v).split(" ").filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()||"").join("")||"C"; }

function parseNotes(notes) {
  const clean = stripCustomerProfile(notes);
  if (!clean) return [];
  return clean.split("\n").map(l=>l.trim()).filter(Boolean).map((l,i)=>{
    const m = l.match(/^\[(.+?)\]\s+([^:]+):\s*(.+)$/);
    return m ? {id:`${m[1]}-${i}`,author:m[2].trim(),content:m[3].trim(),at:m[1]} : {id:`n-${i}`,author:"Team",content:l,at:""};
  }).reverse();
}

function Field({ label, value, span="" }) {
  return (
    <div className={`space-y-1 ${span}`}>
      <p className={C.kicker}>{label}</p>
      <p className="text-sm font-semibold text-slate-800 break-words">{value||"—"}</p>
    </div>
  );
}

function FollowUpCard({ value, onSchedule }) {
  const overdue = isCustomerFollowUpOverdue(value);
  const none = !value;
  const cfg = none
    ? { ring:"border-slate-200 bg-slate-50", dot:"bg-slate-300", label:"No follow-up", text:"text-slate-500" }
    : overdue
    ? { ring:"border-rose-200 bg-rose-50",   dot:"bg-rose-500",  label:"Overdue",      text:"text-rose-700"  }
    : { ring:"border-emerald-200 bg-emerald-50", dot:"bg-emerald-500", label:"Scheduled", text:"text-emerald-700" };
  return (
    <div className={`rounded-2xl border p-4 ${cfg.ring}`}>
      <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${cfg.text}`}>
        <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </div>
      <p className={`mt-2 text-base font-bold ${none?"text-slate-400":"text-slate-900"}`}>{value ? when(value) : "Not scheduled"}</p>
      {none && onSchedule ? (
        <button className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-700" type="button" onClick={onSchedule}>Schedule follow-up →</button>
      ) : null}
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [completingFollowUp, setCompletingFollowUp] = useState(false);
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [addingMember, setAddingMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [pendingMember, setPendingMember] = useState("");

  async function load(s) {
    const r = await apiRequest(`/customers/${params.id}`, { token: s.token });
    setCustomer(r);
    setFollowUp(r.next_follow_up ? String(r.next_follow_up).slice(0, 16) : "");
    // Fix: response wrapper returns array directly for list endpoints
    apiRequest(`/customers/${params.id}/members`, { token: s.token })
      .then(res => setMembers(Array.isArray(res) ? res : (res?.data || res?.items || [])))
      .catch(() => {});
    apiRequest(`/customers/${params.id}/activities?page_size=20`, { token: s.token })
      .then(res => setActivities(res?.items || res?.data || []))
      .catch(() => {});
  }

  useEffect(()=>{
    const s = loadSession();
    if(!s) return router.replace("/login");
    setSession(s);
    load(s).catch(e=>setError(formatScopedError(e,"Could not load this customer.")));
  },[params.id,router]);

  const profile = useMemo(()=>parseCustomerProfile(customer?.notes),[customer?.notes]);
  const notes = useMemo(()=>parseNotes(customer?.notes),[customer?.notes]);
  const scrollTo = id => document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});

  async function addNote(e) {
    e.preventDefault(); if(!note.trim()) return;
    setSavingNote(true); setError(""); setNotice("");
    try {
      await apiRequest(`/customers/${params.id}/notes`,{method:"POST",token:session.token,body:{content:note.trim()}});
      setNote(""); setNotice("Note saved."); await load(session);
    } catch(err){ setError(formatScopedError(err,"Could not save note.")); }
    finally { setSavingNote(false); }
  }

  async function addFollowUp(e) {
    e.preventDefault(); if(!followUp) return;
    setSavingFollowUp(true); setError(""); setNotice("");
    try {
      await apiRequest(`/customers/${params.id}/followups`,{method:"POST",token:session.token,body:{next_follow_up:followUp}});
      setNotice("Follow-up scheduled."); await load(session);
    } catch(err){ setError(formatScopedError(err,"Could not schedule follow-up.")); }
    finally { setSavingFollowUp(false); }
  }

  async function completeFollowUp() {
    if(!customer?.next_follow_up) return;
    setCompletingFollowUp(true); setError(""); setNotice("");
    try {
      const existing = stripCustomerProfile(customer.notes);
      const entry = `[${new Date().toISOString()}] ${session?.user?.name||"Team"}: Follow-up marked complete`;
      await apiRequest(`/customers/${params.id}`,{method:"PATCH",token:session.token,body:{next_follow_up:null,notes:buildCustomerNotes(parseCustomerProfile(customer.notes),existing?`${existing}\n${entry}`:entry)}});
      setNotice("Follow-up completed."); await load(session);
    } catch(err){ setError(formatScopedError(err,"Could not complete follow-up.")); }
    finally { setCompletingFollowUp(false); }
  }

  async function loadAvailableUsers() {
    if (!session?.token || !customer) return;
    try {
      const res = await apiRequest(`/users?page_size=100&company_id=${customer.company_id}`, { token: session.token });
      const all = res?.items || res?.data || [];
      // Exclude owner and already-added members
      const memberIds = new Set(members.map(m => m.user_id));
      setAvailableUsers(all.filter(u => u.user_id !== customer.assigned_to && !memberIds.has(u.user_id)));
    } catch (_) {}
  }

  async function addMemberInline(e) {
    e.preventDefault();
    if (!pendingMember) return;
    setAddingMember(true); setError(""); setNotice("");
    try {
      await apiRequest(`/customers/${params.id}/members`, { method: "POST", token: session.token, body: { user_id: pendingMember } });
      setPendingMember(""); setNotice("Person added.");
      await load(session);
    } catch (err) { setError(formatScopedError(err, "Could not add person.")); }
    finally { setAddingMember(false); }
  }

  async function removeMemberInline(userId) {
    setError(""); setNotice("");
    try {
      await apiRequest(`/customers/${params.id}/members/${userId}`, { method: "DELETE", token: session.token });
      setNotice("Person removed.");
      await load(session);
    } catch (err) { setError(formatScopedError(err, "Could not remove person.")); }
  }

  return (
    <DashboardShell session={session} title={customer?.company_name||"Customer"} hideTitle heroStats={[]}>
      <div className="mx-auto max-w-[1280px] space-y-5 px-1">
        <AlertError message={error} onDismiss={()=>setError("")} />
        {!error ? <AlertSuccess message={notice} onDismiss={()=>setNotice("")} /> : null}

        {!customer ? <div className={`${C.panel} px-5 py-4 text-sm text-slate-500`}>Loading customer…</div> : null}

        {customer ? (
          <>
            {/* ── Hero ── */}
            <div className={`${C.panel} px-5 py-5`}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <button className={Btn.ghost} type="button" onClick={()=>router.back()}>← Back</button>
                <div className="flex flex-wrap gap-2">
                  <Link className={Btn.ghost} href={`/communications?entity=customer&id=${customer.customer_id}`}><DashboardIcon name="message" className="h-4 w-4" />Email</Link>
                  <Link className={Btn.gold} href={`/customers/${customer.customer_id}/edit`}><DashboardIcon name="settings" className="h-4 w-4" />Edit</Link>
                </div>
              </div>

              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-xl font-bold text-white">
                  {initials(customer.company_name||customer.name)}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">{customer.company_name||customer.name}</h1>
                    <CustomerStatusBadge status={customer.status} />
                  </div>
                  <p className="text-sm text-slate-500">
                    {customer.name||"Primary contact"}
                    {customer.email ? <> · <a href={`mailto:${customer.email}`} className="text-emerald-600 hover:underline">{customer.email}</a></> : null}
                    {customer.phone ? <> · <a href={`tel:${String(customer.phone).replace(/[^\d+]/g,"")}`} className="text-emerald-600 hover:underline">{customer.phone}</a></> : null}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {teamBadgeLabel(customer) ? <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-600">{teamBadgeLabel(customer)}</span> : null}
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-600">{customer.assigned_to_name||"Unassigned"}</span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-xs font-semibold text-amber-700">{money(customer.total_value)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {customer.phone ? <a className={Btn.ghost} href={`tel:${String(customer.phone).replace(/[^\d+]/g,"")}`}><DashboardIcon name="phone" className="h-4 w-4" />Call</a> : null}
                {customer.email ? <a className={Btn.ghost} href={`mailto:${customer.email}`}><DashboardIcon name="mail" className="h-4 w-4" />Email</a> : null}
                <button className={Btn.ghost} type="button" onClick={()=>scrollTo("follow-up-desk")}><DashboardIcon name="calendar" className="h-4 w-4" />Schedule Follow-up</button>
                <button className={Btn.ghost} type="button" onClick={()=>scrollTo("notes-desk")}><DashboardIcon name="documents" className="h-4 w-4" />Add Note</button>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="grid gap-5 xl:grid-cols-[1fr_380px] xl:items-start">
              {/* Left column */}
              <div className="space-y-5">
                {/* Account details */}
                <div className={`${C.panel} px-5 py-5`}>
                  <p className={C.kicker}>Account Snapshot</p>
                  <h2 className="mt-1 mb-4 text-lg font-bold text-slate-900">Company Details</h2>
                  <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                    <Field label="Primary Contact" value={customer.name} />
                    <Field label="Email" value={customer.email} />
                    <Field label="Phone" value={customer.phone} />
                    <Field label="Industry" value={profile.industry} />
                    <Field label="Website" value={profile.website} />
                    <Field label="Product" value={customer.product_name||"—"} />
                    <Field label="Owner" value={customer.assigned_to_name||"Unassigned"} />
                    <Field label="Team" value={teamBadgeLabel(customer)||"Auto team"} />
                    <Field label="Status" value={customer.status||"active"} />
                    <Field label="Onboarding" value={customer.onboarding_status||"pending"} />
                    <Field label="Onboarding Date" value={customer.onboarding_date ? when(customer.onboarding_date) : "Not set"} />
                    <Field label="Portfolio Value" value={money(customer.total_value)} />
                    <Field label="Address" value={[profile.address_street,profile.address_city,profile.address_state,profile.address_zip,profile.country].filter(Boolean).join(", ")} span="sm:col-span-2 xl:col-span-3" />
                  </div>
                  {profile.business_summary ? <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-600">{profile.business_summary}</p> : null}
                </div>

                {/* Notes */}
                <div className={`${C.panel} px-5 py-5`} id="notes-desk">
                  <p className={C.kicker}>Notes</p>
                  <h2 className="mt-1 mb-4 text-lg font-bold text-slate-900">Account Notes</h2>
                  <form className="space-y-3" onSubmit={addNote}>
                    <textarea className={`${C.input} min-h-[120px] resize-y`} rows={4} value={note} onChange={e=>setNote(e.target.value)} placeholder="Add context, update the relationship, or capture a commercial note…" />
                    <button className={Btn.gold} type="submit" disabled={savingNote}>{savingNote?"Saving…":"Save Note"}</button>
                  </form>
                  <div className="mt-5 space-y-3">
                    {notes.length ? notes.map(item=>(
                      <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <strong className="text-sm text-slate-800">{item.author}</strong>
                          <span className="text-xs text-slate-400">{item.at ? when(item.at) : "Manual note"}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.content}</p>
                      </div>
                    )) : <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">No notes yet.</p>}
                  </div>
                </div>

                {/* History */}
                <div className={`${C.panel} px-5 py-5`}>
                  <p className={C.kicker}>History</p>
                  <h2 className="mt-1 mb-4 text-lg font-bold text-slate-900">Relationship Trail</h2>
                  <div className="space-y-2 text-sm">
                    {[["Customer ID",customer.customer_id],["Created",when(customer.created_at)],["Updated",when(customer.updated_at)],["Last Interaction",when(customer.last_interaction)]].map(([l,v])=>(
                      <div key={l} className="flex flex-wrap gap-2 border-b border-slate-50 pb-2 last:border-0">
                        <span className="w-36 shrink-0 text-slate-400">{l}</span>
                        <span className="font-semibold text-slate-800 break-all">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-5">
                {/* Follow-up desk */}
                <div className={`${C.panel} px-5 py-5`} id="follow-up-desk">
                  <p className={C.kicker}>Follow-up Desk</p>
                  <h2 className="mt-1 mb-4 text-lg font-bold text-slate-900">Schedule & Close</h2>
                  <FollowUpCard value={customer.next_follow_up} onSchedule={()=>document.getElementById("fu-input")?.focus()} />
                  <form className="mt-4 space-y-3" onSubmit={addFollowUp}>
                    <label className="block space-y-1.5">
                      <span className={C.kicker}>Next Follow-up Date</span>
                      <input id="fu-input" className={C.input} type="datetime-local" value={followUp} onChange={e=>setFollowUp(e.target.value)} />
                    </label>
                    <button className={Btn.gold} type="submit" disabled={!followUp||savingFollowUp}>{savingFollowUp?"Saving…":"Save Follow-up"}</button>
                    <button className={Btn.ghost} type="button" disabled={!customer.next_follow_up||completingFollowUp} onClick={completeFollowUp}>{completingFollowUp?"Completing…":"✓ Mark Complete"}</button>
                  </form>
                </div>

                {/* Quick stats */}
                <div className={`${C.panel} px-5 py-5`}>
                  <p className={`${C.kicker} mb-3`}>Quick Stats</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[["Status",customer.status||"active"],["Onboarding",customer.onboarding_status||"pending"],["Value",money(customer.total_value)],["Follow-up",isCustomerFollowUpOverdue(customer.next_follow_up)?"Overdue":customer.next_follow_up?"Scheduled":"None"]].map(([l,v])=>(
                      <div key={l} className="rounded-xl bg-slate-50 px-3 py-3">
                        <p className={C.kicker}>{l}</p>
                        <p className="mt-1 text-sm font-bold text-slate-800">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* People on this customer */}
                <div className={`${C.panel} px-5 py-5`}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <p className={C.kicker}>People</p>
                      <h2 className="mt-0.5 text-lg font-bold text-slate-900">Team Members</h2>
                    </div>
                    <button
                      className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                      type="button"
                      onClick={() => { setAddingMember(v => !v); if (!availableUsers.length) loadAvailableUsers(); }}
                    >
                      <DashboardIcon name="customers" className="h-3.5 w-3.5" />
                      {addingMember ? "Cancel" : "+ Add Person"}
                    </button>
                  </div>

                  {addingMember ? (
                    <form className="mb-3 flex gap-2" onSubmit={addMemberInline}>
                      <select
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50"
                        value={pendingMember}
                        onChange={e => setPendingMember(e.target.value)}
                      >
                        <option value="">Select team member…</option>
                        {availableUsers.map(u => (
                          <option key={u.user_id} value={u.user_id}>{u.name} · {u.role}</option>
                        ))}
                      </select>
                      <button
                        className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 transition"
                        type="submit"
                        disabled={!pendingMember || addingMember}
                      >
                        {addingMember ? "Adding…" : "Add"}
                      </button>
                    </form>
                  ) : null}

                  <div className="space-y-2">
                    {/* Owner — always shown first */}
                    <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-200 text-xs font-bold text-amber-800">{initials(customer.assigned_to_name || "O")}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{customer.assigned_to_name || "Unassigned"}</p>
                        <p className="text-xs text-amber-700">Owner</p>
                      </div>
                    </div>

                    {/* Collaborators */}
                    {members.map(m => (
                      <div key={m.user_id} className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-700">{initials(m.user_name || "M")}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">{m.user_name || "Unknown"}</p>
                          <p className="text-xs text-slate-400">{m.user_role} · {m.role || "Collaborator"}</p>
                        </div>
                        <button
                          className="shrink-0 rounded-lg border border-rose-100 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-100 transition"
                          type="button"
                          onClick={() => removeMemberInline(m.user_id)}
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    ))}

                    {!members.length ? (
                      <p className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center text-xs text-slate-400">
                        No collaborators yet. Use "+ Add Person" to assign team members.
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Activity Feed */}
                <div className={`${C.panel} px-5 py-5`}>
                  <p className={C.kicker}>Activity</p>
                  <h2 className="mt-1 mb-4 text-lg font-bold text-slate-900">Timeline</h2>
                  <div className="space-y-2">
                    {activities.length ? activities.map((act, i) => (
                      <div key={act.id || i} className="flex gap-3">
                        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400 mt-2" />
                        <div className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-slate-700">{act.created_by_name || "System"}</span>
                            <span className="text-[10px] text-slate-400">{act.created_at ? when(act.created_at) : ""}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600 leading-5">{act.description || act.type}</p>
                        </div>
                      </div>
                    )) : (
                      <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400">No activity recorded yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}
