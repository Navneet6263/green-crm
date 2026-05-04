"use client";

import DashboardIcon from "../../../components/dashboard/icons";
import { T, Avatar, StatCard, prettyRole } from "./teams-tokens";
import { formatIndiaDateTime } from "../../../lib/dateTime";

const MANAGER_CAPABLE_ROLES = new Set(["super-admin", "platform-admin", "platform-manager", "admin", "manager"]);
const ROLE_FILTERS = [["all","All roles"],["manager","Managers"],["sales","Sales"],["marketing","Marketing"],["support","Support"],["legal-team","Legal"],["finance-team","Finance"],["viewer","Viewer"]];

function when(v) { return formatIndiaDateTime(v, false); }

function UserRow({ user, isMember, isManager, workingKey, onAddMember, onRemoveMember, onAddManager }) {
  const canPromote = MANAGER_CAPABLE_ROLES.has(user.role) && !isManager;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 transition hover:border-amber-200">
      <Avatar name={user.name} bg={isMember ? "bg-emerald-600" : "bg-slate-300"} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-semibold text-slate-900">{user.name}</p>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{prettyRole(user.role)}</span>
          {isMember ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Member</span> : null}
          {isManager ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Manager</span> : null}
        </div>
        <p className="truncate text-xs text-slate-400">{user.email}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {isMember ? (
          <button className={T.danger} type="button" onClick={() => onRemoveMember(user.user_id)} disabled={workingKey === `member:${user.user_id}`}>
            {workingKey === `member:${user.user_id}` ? "Removing…" : "Remove"}
          </button>
        ) : (
          <button className={T.ghost} type="button" onClick={() => onAddMember(user.user_id)} disabled={workingKey === "member:add"}>
            {workingKey === "member:add" ? "Adding…" : "+ Member"}
          </button>
        )}
        {canPromote ? (
          <button className={T.gold} type="button" onClick={() => onAddManager(user.user_id)} disabled={workingKey === "manager:add"}>
            {workingKey === "manager:add" ? "Assigning…" : "Make Manager"}
          </button>
        ) : null}
        {isManager && !canPromote ? (
          <button className={T.danger} type="button" onClick={() => onRemoveMember(user.user_id)} disabled={workingKey === `manager:${user.user_id}`}>
            {workingKey === `manager:${user.user_id}` ? "Removing…" : "Remove Mgr"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function TeamDetail({
  selectedTeam, teamMembers, teamManagers, filteredAssignmentUsers,
  availableMembers, availableManagers,
  memberCandidateId, managerCandidateId,
  assignmentQuery, assignmentRoleFilter,
  detailLoading, assignableLoading, workingKey,
  onEditTeam, onSetMemberCandidate, onSetManagerCandidate,
  onAddMember, onRemoveMember, onAddManager, onRemoveManager,
  onAssignmentSearch, onAssignmentRoleFilter,
}) {
  if (!selectedTeam) {
    return (
      <div className={`${T.panel} flex min-h-[320px] flex-col items-center justify-center gap-3 px-5 py-8 text-center`}>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-400">
          <DashboardIcon name="users" className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700">Select a team to manage</p>
        <p className="max-w-xs text-xs text-slate-400">Click any team on the left to view members, managers, and ownership details.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Team identity card */}
      <div className={`${T.panel} px-5 py-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-base font-bold text-white">
              {selectedTeam.name?.slice(0,2).toUpperCase() || "TM"}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{selectedTeam.name}</h2>
                {selectedTeam.code ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">{selectedTeam.code}</span> : null}
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${selectedTeam.is_active === false ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                  {selectedTeam.is_active === false ? "Inactive" : "Active"}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-slate-400">{selectedTeam.description || "No description added."}</p>
            </div>
          </div>
          <button className={T.ghost} type="button" onClick={onEditTeam}>
            <DashboardIcon name="settings" className="h-4 w-4" />Edit Team
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-50 pt-4">
          <StatCard label="Members" value={selectedTeam.member_count || teamMembers.length || 0} accent="border-emerald-100 bg-emerald-50" />
          <StatCard label="Managers" value={selectedTeam.manager_count || teamManagers.length || 0} accent="border-amber-100 bg-amber-50" />
          <StatCard label="Team Code" value={selectedTeam.code || "Auto"} />
          <StatCard label="Created" value={when(selectedTeam.created_at)} />
        </div>
      </div>

      {/* Managers section */}
      <div className={`${T.panel} px-5 py-5`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={T.kicker}>Managers</p>
            <h3 className="mt-0.5 text-base font-bold text-slate-900">Who leads this team</h3>
          </div>
          <div className="flex gap-2">
            <select className={`${T.input} max-w-[200px]`} value={managerCandidateId} onChange={e => onSetManagerCandidate(e.target.value)} disabled={!availableManagers.length || detailLoading}>
              <option value="">{availableManagers.length ? "Choose manager…" : "No eligible users"}</option>
              {availableManagers.map(u => <option key={u.user_id} value={u.user_id}>{u.name} · {prettyRole(u.role)}</option>)}
            </select>
            <button className={T.gold} type="button" onClick={() => onAddManager()} disabled={!managerCandidateId || workingKey === "manager:add"}>
              {workingKey === "manager:add" ? "Assigning…" : "Assign"}
            </button>
          </div>
        </div>

        {detailLoading && !teamManagers.length ? (
          <p className="py-6 text-center text-sm text-slate-400">Loading managers…</p>
        ) : teamManagers.length ? (
          <div className="space-y-2">
            {teamManagers.map(m => (
              <div key={m.user_id} className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500 text-xs font-bold text-white">
                  {m.name?.slice(0,2).toUpperCase() || "MG"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{m.name}</p>
                  <p className="truncate text-xs text-slate-400">{m.email} · {prettyRole(m.role)}</p>
                </div>
                <button className={T.danger} type="button" onClick={() => onRemoveManager(m.user_id)} disabled={workingKey === `manager:${m.user_id}`}>
                  {workingKey === `manager:${m.user_id}` ? "Removing…" : "Remove"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">No managers assigned yet.</p>
        )}
      </div>

      {/* Members roster */}
      <div className={`${T.panel} px-5 py-5`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={T.kicker}>Members</p>
            <h3 className="mt-0.5 text-base font-bold text-slate-900">Team roster · {teamMembers.length} members</h3>
          </div>
          <div className="flex gap-2">
            <select className={`${T.input} max-w-[200px]`} value={memberCandidateId} onChange={e => onSetMemberCandidate(e.target.value)} disabled={!availableMembers.length || detailLoading}>
              <option value="">{availableMembers.length ? "Quick add…" : "All users added"}</option>
              {availableMembers.map(u => <option key={u.user_id} value={u.user_id}>{u.name} · {prettyRole(u.role)}</option>)}
            </select>
            <button className={T.gold} type="button" onClick={() => onAddMember()} disabled={!memberCandidateId || workingKey === "member:add"}>
              {workingKey === "member:add" ? "Adding…" : "Add"}
            </button>
          </div>
        </div>

        {/* Search + filter */}
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <input className={T.input} value={assignmentQuery} onChange={e => onAssignmentSearch(e.target.value)} placeholder="Search name, email, role…" />
          <select className={T.input} value={assignmentRoleFilter} onChange={e => onAssignmentRoleFilter(e.target.value)}>
            {ROLE_FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* User rows */}
        {assignableLoading ? (
          <p className="py-6 text-center text-sm text-slate-400">Loading roster…</p>
        ) : filteredAssignmentUsers.length ? (
          <div className="space-y-2">
            {filteredAssignmentUsers.map(user => (
              <UserRow
                key={user.user_id}
                user={user}
                isMember={teamMembers.some(m => m.user_id === user.user_id)}
                isManager={teamManagers.some(m => m.user_id === user.user_id)}
                workingKey={workingKey}
                onAddMember={onAddMember}
                onRemoveMember={onRemoveMember}
                onAddManager={onAddManager}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
            No users matched. Create the user first, then add them here.
          </p>
        )}
      </div>
    </div>
  );
}
