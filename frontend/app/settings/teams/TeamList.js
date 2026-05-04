"use client";

import DashboardIcon from "../../../components/dashboard/icons";
import { T, Avatar, initials } from "./teams-tokens";
import { formatIndiaDateTime } from "../../../lib/dateTime";

function when(v) { return formatIndiaDateTime(v, false); }

export function TeamList({ teams, filteredTeams, selectedTeamId, teamQuery, loading, scopedCompanyId, canCreateTeams, onSelect, onSearch, onCreateFirst }) {
  return (
    <div className={`${T.panel} flex flex-col gap-4 px-5 py-5 xl:sticky xl:top-6`}>
      <div>
        <p className={T.kicker}>Teams</p>
        <h2 className="mt-0.5 text-base font-bold text-slate-900">Active Teams</h2>
        <p className="mt-0.5 text-xs text-slate-400">Only active teams appear in CRM ownership pickers.</p>
      </div>

      <input
        className={T.input}
        value={teamQuery}
        onChange={e => onSearch(e.target.value)}
        placeholder="Search team name or code…"
      />

      <div className="max-h-[calc(100vh-280px)] space-y-2 overflow-y-auto pr-0.5">
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-400">Loading teams…</div>
        ) : !scopedCompanyId ? (
          <div className="flex min-h-[200px] items-center justify-center text-center text-sm text-slate-400">Choose a company to load its teams.</div>
        ) : filteredTeams.length ? (
          filteredTeams.map(team => {
            const active = selectedTeamId === team.team_id;
            return (
              <button
                key={team.team_id}
                type="button"
                onClick={() => onSelect(team.team_id)}
                className={`w-full rounded-2xl border px-4 py-3.5 text-left transition ${
                  active
                    ? "border-amber-300 bg-amber-50 shadow-sm"
                    : "border-slate-100 bg-white hover:border-amber-200 hover:bg-amber-50/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={team.name} bg="bg-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-bold text-slate-900 truncate">{team.name}</p>
                      {team.code ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">{team.code}</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-400">{team.description || "No description"}</p>
                    <div className="mt-2 flex gap-3 text-xs text-slate-500">
                      <span><strong className="text-slate-700">{team.member_count || 0}</strong> members</span>
                      <span><strong className="text-slate-700">{team.manager_count || 0}</strong> managers</span>
                      <span className="text-slate-400">{when(team.created_at)}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        ) : teams.length ? (
          <div className="flex min-h-[160px] items-center justify-center text-center text-sm text-slate-400">No teams matched the search.</div>
        ) : (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-50 text-amber-400">
              <DashboardIcon name="users" className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No teams yet</p>
            <p className="max-w-[200px] text-xs text-slate-400">Create the first team to enable ownership scoping across CRM records.</p>
            {canCreateTeams ? (
              <button className={T.gold} type="button" onClick={onCreateFirst}>
                <DashboardIcon name="settings" className="h-3.5 w-3.5" />Create First Team
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
