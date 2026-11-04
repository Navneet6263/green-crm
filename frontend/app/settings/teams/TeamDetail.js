"use client";

import { useEffect, useState } from "react";
import SideDrawer from "../../../components/ui/SideDrawer";
import { formatIndiaDateTime } from "../../../lib/dateTime";
import { colorFor } from "../../../components/dashboard/home/widgetCatalog";
import { T, initials, prettyRole } from "./teams-tokens";

const MANAGER_CAPABLE_ROLES = new Set(["super-admin", "platform-admin", "platform-manager", "admin", "manager"]);
const ROLE_FILTERS = [["all", "All roles"], ["manager", "Managers"], ["sales", "Sales"], ["marketing", "Marketing"], ["support", "Support"], ["legal-team", "Legal"], ["finance-team", "Finance"], ["expert", "Experts"], ["viewer", "Viewer"]];

function Person({ user, children, tag }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: colorFor(user.user_id) }}>{initials(user.name)}</span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5"><b className="truncate text-[13.5px] font-semibold text-slate-900">{user.name}</b><span className="rounded-full bg-slate-100 px-2 py-px text-[10.5px] font-semibold text-slate-600">{prettyRole(user.role)}</span>{tag}</span>
        <span className="block truncate text-[11.5px] text-slate-500">{user.email}</span>
      </span>
      <span className="flex shrink-0 gap-1.5">{children}</span>
    </li>
  );
}

/** Pick several people at once to add as members (or managers). */
function AddPeople({ open, onClose, title, people, onAdd, adding }) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [picked, setPicked] = useState([]);
  useEffect(() => { if (open) { setQ(""); setRole("all"); setPicked([]); } }, [open]);
  const shown = people.filter((u) => (role === "all" || u.role === role) && (!q.trim() || [u.name, u.email, u.role].join(" ").toLowerCase().includes(q.trim().toLowerCase())));
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return (
    <SideDrawer open={open} onClose={onClose} title={title} subtitle={`${people.length} people can be added`}
      footer={<div className="flex items-center justify-between gap-2"><span className="text-[12.5px] text-slate-500">{picked.length} selected</span><button type="button" disabled={!picked.length || adding} onClick={() => onAdd(picked)} className={T.gold}>{adding ? "Adding…" : `Add ${picked.length || ""}`}</button></div>}>
      <div className="mb-3 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" aria-label="Search people" className={T.input} />
        <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role" className={`${T.input} max-w-[150px]`}>{ROLE_FILTERS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select>
      </div>
      {shown.length ? (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-[12px] bg-white ring-1 ring-slate-200">
          {shown.map((u) => (
            <li key={u.user_id}>
              <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                <input type="checkbox" checked={picked.includes(u.user_id)} onChange={() => toggle(u.user_id)} className="h-4 w-4 accent-[#0c605d]" />
                <span className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: colorFor(u.user_id) }}>{initials(u.name)}</span>
                <span className="min-w-0"><b className="block truncate text-[13px] font-semibold text-slate-900">{u.name}</b><span className="block truncate text-[11.5px] text-slate-500">{prettyRole(u.role)} · {u.email}</span></span>
              </label>
            </li>
          ))}
        </ul>
      ) : <p className="py-10 text-center text-[13px] text-slate-400">{people.length ? "No one matches." : "Everyone is already in this team."}</p>}
    </SideDrawer>
  );
}

/** One team: who is in it, who manages it, and changes to both. */
export function TeamDetail({
  canManageManagers = false, selectedTeam, teamMembers, teamManagers, availableMembers, availableManagers,
  detailLoading, assignableLoading, workingKey, onEditTeam, onAddMember, onRemoveMember, onAddManager, onRemoveManager,
}) {
  const [tab, setTab] = useState("members");
  const [adding, setAdding] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setTab("members"); }, [selectedTeam?.team_id]);

  if (!selectedTeam) {
    return (
      <div className={`${T.panel} grid min-h-[320px] place-items-center px-5 py-8 text-center`}>
        <div><p className="text-[14px] font-semibold text-slate-700">Pick a team</p><p className="mt-1 text-[12.5px] text-slate-400">Its members and managers show here.</p></div>
      </div>
    );
  }

  const managerIds = new Set(teamManagers.map((m) => m.user_id));
  const addMany = async (ids) => {
    setBusy(true);
    try { for (const id of ids) await (adding === "managers" ? onAddManager(id) : onAddMember(id)); setAdding(null); } finally { setBusy(false); }
  };
  const tabs = [["members", "Members", teamMembers.length], ["managers", "Managers", teamManagers.length]];

  return (
    <div className="min-w-0 space-y-3">
      <section className={`${T.panel} p-4 sm:p-5`}>
        <div className="flex flex-wrap items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] text-[16px] font-bold text-white" style={{ background: colorFor(selectedTeam.team_id) }}>{initials(selectedTeam.name)}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[18px] font-bold text-slate-900">{selectedTeam.name}</h2>
              {selectedTeam.code ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">{selectedTeam.code}</span> : null}
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${selectedTeam.is_active === false ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{selectedTeam.is_active === false ? "Inactive" : "Active"}</span>
            </div>
            <p className="mt-0.5 text-[13px] text-slate-500">{selectedTeam.description || "No description"}</p>
            <p className="mt-1 text-[12px] text-slate-400">{teamMembers.length} members · {teamManagers.length} managers{selectedTeam.created_at ? ` · created ${formatIndiaDateTime(selectedTeam.created_at, false)}` : ""}</p>
          </div>
          <button className={T.ghost} type="button" onClick={onEditTeam}>Edit team</button>
        </div>
      </section>

      <section className={`${T.panel} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
          <div className="flex gap-1" role="tablist" aria-label="Team">
            {tabs.map(([key, name, n]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                className={`rounded-[9px] px-3.5 py-1.5 text-[13px] font-semibold ${tab === key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{name} <span className="opacity-60">{n}</span></button>
            ))}
          </div>
          {tab === "members"
            ? <button type="button" className={T.gold} onClick={() => setAdding("members")} disabled={assignableLoading}>+ Add people</button>
            : canManageManagers ? <button type="button" className={T.gold} onClick={() => setAdding("managers")} disabled={assignableLoading || !availableManagers.length}>+ Add manager</button> : null}
        </div>
        {detailLoading ? <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-11 animate-pulse rounded-[10px] bg-slate-100" />)}</div> : (
          tab === "members" ? (
            teamMembers.length ? (
              <ul className="divide-y divide-slate-100">
                {teamMembers.map((m) => {
                  const canChange = canManageManagers || !MANAGER_CAPABLE_ROLES.has(m.role);
                  return (
                    <Person key={m.user_id} user={m} tag={managerIds.has(m.user_id) ? <span className="rounded-full bg-violet-50 px-2 py-px text-[10.5px] font-semibold text-violet-700">Manager</span> : null}>
                      <button className={T.danger} type="button" onClick={() => onRemoveMember(m.user_id)} disabled={!canChange || workingKey === `member:${m.user_id}`}>{workingKey === `member:${m.user_id}` ? "Removing…" : "Remove"}</button>
                    </Person>
                  );
                })}
              </ul>
            ) : <p className="px-6 py-12 text-center text-[13px] text-slate-400">No members yet. Add people so their leads belong to this team.</p>
          ) : (
            <>
              <p className="border-b border-slate-100 bg-slate-50/60 px-4 py-2 text-[12px] text-slate-500">Managers see and manage every lead in this team. People with the Manager role already have access as members.</p>
              {teamManagers.length ? (
                <ul className="divide-y divide-slate-100">
                  {teamManagers.map((m) => (
                    <Person key={m.user_id} user={m}>
                      {canManageManagers ? <button className={T.danger} type="button" onClick={() => onRemoveManager(m.user_id)} disabled={workingKey === `manager:${m.user_id}`}>{workingKey === `manager:${m.user_id}` ? "Removing…" : "Remove"}</button> : null}
                    </Person>
                  ))}
                </ul>
              ) : <p className="px-6 py-12 text-center text-[13px] text-slate-400">No managers for this team yet.</p>}
            </>
          )
        )}
      </section>

      <AddPeople open={Boolean(adding)} onClose={() => setAdding(null)} title={adding === "managers" ? `Add a manager to ${selectedTeam.name}` : `Add people to ${selectedTeam.name}`}
        people={adding === "managers" ? availableManagers : availableMembers} onAdd={addMany} adding={busy} />
    </div>
  );
}
