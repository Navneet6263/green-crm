"use client";

import { colorFor } from "../../../components/dashboard/home/widgetCatalog";
import { T, initials } from "./teams-tokens";

/** The teams, searchable; the picked one is highlighted. */
export function TeamList({ teams, filteredTeams, selectedTeamId, teamQuery, loading, scopedCompanyId, canCreateTeams, onSelect, onSearch, onCreateFirst }) {
  return (
    <section className={`${T.panel} flex min-w-0 flex-col overflow-hidden xl:sticky xl:top-[76px]`}>
      <div className="border-b border-slate-100 p-3">
        <label className="flex h-9 items-center gap-2 rounded-[10px] border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-brand-300 focus-within:bg-white">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={teamQuery} onChange={(e) => onSearch(e.target.value)} placeholder="Search teams" aria-label="Search teams" className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-800 outline-none" />
        </label>
      </div>
      <div className="max-h-[calc(100vh-300px)] overflow-y-auto p-1.5">
        {loading ? (
          <div className="space-y-2 p-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-[10px] bg-slate-100" />)}</div>
        ) : !scopedCompanyId ? (
          <p className="px-4 py-10 text-center text-[13px] text-slate-400">Choose a company to see its teams.</p>
        ) : filteredTeams.length ? (
          filteredTeams.map((team) => {
            const on = selectedTeamId === team.team_id;
            return (
              <button key={team.team_id} type="button" onClick={() => onSelect(team.team_id)} aria-current={on ? "true" : undefined}
                className={`flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2.5 text-left transition ${on ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-slate-50"}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-[13px] font-bold text-white" style={{ background: colorFor(team.team_id) }}>{initials(team.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <b className="truncate text-[13.5px] font-semibold text-slate-900">{team.name}</b>
                    {team.code ? <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-bold text-slate-500">{team.code}</span> : null}
                    {team.is_active === false ? <span className="shrink-0 rounded-full bg-rose-50 px-1.5 py-px text-[10px] font-semibold text-rose-600">Inactive</span> : null}
                  </span>
                  <span className="block truncate text-[11.5px] text-slate-500">{team.member_count || 0} members · {team.manager_count || 0} managers</span>
                </span>
              </button>
            );
          })
        ) : teams.length ? (
          <p className="px-4 py-10 text-center text-[13px] text-slate-400">No team matches.</p>
        ) : (
          <div className="px-4 py-10 text-center">
            <p className="text-[14px] font-semibold text-slate-700">No teams yet</p>
            <p className="mt-1 text-[12.5px] text-slate-400">Teams decide who sees which leads.</p>
            {canCreateTeams ? <button className={`${T.gold} mt-3`} type="button" onClick={onCreateFirst}>+ Create the first team</button> : null}
          </div>
        )}
      </div>
    </section>
  );
}
