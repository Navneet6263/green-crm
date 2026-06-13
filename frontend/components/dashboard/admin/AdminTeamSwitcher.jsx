"use client";

import { useEffect, useState } from "react";
import DashboardIcon from "../icons";
import { apiRequest } from "../../../lib/api";

export default function AdminTeamSwitcher({ selectedTeamId, onTeamChange, session }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    apiRequest("/teams", { token: session.token })
      .then((res) => setTeams(res?.items || res?.data || res || []))
      .catch((err) => console.error("Failed to fetch teams:", err))
      .finally(() => setLoading(false));
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        Loading teams...
      </div>
    );
  }

  if (!teams?.length) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
        <DashboardIcon name="users" className="h-4 w-4" /> Team:
      </div>
      <div className="relative">
        <select value={selectedTeamId} onChange={(e) => onTeamChange(e.target.value)}
          className="appearance-none rounded-xl border border-slate-200 bg-white pl-4 pr-10 py-2 text-sm font-bold text-slate-900 outline-none transition-all duration-200 hover:bg-slate-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm">
          <option value="all">All Teams</option>
          {teams.map((t) => <option key={t.team_id} value={t.team_id}>{t.name}</option>)}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
