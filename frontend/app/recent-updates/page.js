"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../../components/dashboard/DashboardShell";
import { loadSession } from "../../lib/session";
import { loadTeamsForCompany, resolveSessionCompanyId, teamSelectLabel } from "../../lib/teamScope";
import { recentActivityApi } from "../../lib/api/recentActivity.js";
import RecentUpdatesFilter from "./RecentUpdatesFilter";
import RecentUpdatesFeed from "./RecentUpdatesFeed";
import RecentUpdatesDateFilter from "./RecentUpdatesDateFilter";
import RecentUpdatesExport from "./RecentUpdatesExport";
import TodayUserSummary from "./TodayUserSummary";
import MonthlyLeaderboard from "./MonthlyLeaderboard";

export default function RecentUpdatesPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState("");
  const [teamError, setTeamError] = useState("");
  const [teamsLoading, setTeamsLoading] = useState(false);
  
  // Filter States
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  
  // Date & Search & Pagination Filters
  const [datePreset, setDatePreset] = useState("last7days");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
    
    const today = new Date();
    const dateKey = date => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
    const to = dateKey(today);
    const from = dateKey(new Date(today.getTime() - 6 * 86400000));
    setFromDate(from);
    setToDate(to);
  }, [router]);

  useEffect(() => {
    if (!session?.token) return;
    let ignore = false;
    setTeamsLoading(true);
    setTeamError("");
    loadTeamsForCompany(session.token, resolveSessionCompanyId(session))
      .then(items => { if (!ignore) setTeams(items); })
      .catch(err => { if (!ignore) { setTeams([]); setTeamError(err.message || "Could not load team choices."); } })
      .finally(() => { if (!ignore) setTeamsLoading(false); });
    return () => { ignore = true; };
  }, [session]);

  const changeTeam = (value) => {
    setTeamId(value);
    setSelectedUsers([]);
    setSelectedProducts([]);
    setNotes([]);
    setPagination({ total: 0, totalPages: 1 });
    setLoading(true);
    setPage(1);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, selectedUsers, selectedProducts, fromDate, toDate]);

  useEffect(() => {
    let ignore = false;
    const fetchUpdates = async () => {
      if (!session) return;
      try {
        setLoading(true);
        setNotes([]);
        setError("");
        const res = await recentActivityApi.getRecentNotes({ 
          limit, 
          page,
          type: typeFilter === "all" ? "all" : `${typeFilter}s`,
          users: selectedUsers,
          products: selectedProducts,
          teamId,
          fromDate,
          toDate,
          search: debouncedSearch
        });

        if (ignore) return;
        const items = res.items || res.data || (Array.isArray(res) ? res : []);
        setNotes(items);
        if (res.pagination) {
          setPagination(res.pagination);
        } else {
          const total = Number(res.meta?.total ?? items.length);
          setPagination({ total, totalPages: Math.ceil(total / limit) || 1 });
        }
      } catch (err) {
        if (!ignore) setError(err.message || "Could not load updates. Please retry.");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    
    fetchUpdates();
    return () => { ignore = true; };
  }, [session, teamId, typeFilter, selectedUsers, selectedProducts, fromDate, toDate, debouncedSearch, page, limit]);

  const handleNavigate = (note) => {
    if (note.note_type === "lead" && note.entity_id) {
      router.push(`/leads/${note.entity_id}`);
    } else if (note.note_type === "customer" && note.customer_id) {
      router.push(`/customers/${note.customer_id}`);
    }
  };

  return (
    <DashboardShell session={session} title="Recent Updates" hideTitle={true}>
      {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {teamError && <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Team choices could not load: {teamError}. Results remain limited to your permitted teams.</div>}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {/* Header Section */}
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 bg-clip-text text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent mb-1.5">
              Recent Updates & Activity
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Track notes, activity and performance within your permitted teams.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search notes, names or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs sm:text-sm font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 w-full sm:w-auto">
              {["all", "lead", "customer"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`flex-1 sm:flex-none rounded-lg px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    typeFilter === t
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {t}s
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
          <label htmlFor="recent-team" className="mb-1 block text-xs font-bold text-slate-700">Team</label>
          <select id="recent-team" value={teamId} onChange={e => changeTeam(e.target.value)} disabled={teamsLoading}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm sm:max-w-sm">
            <option value="">{teamsLoading ? "Loading teams..." : session?.user?.role === "admin" ? "All company teams" : "All my permitted teams"}</option>
            {teams.map(team => <option key={team.team_id} value={team.team_id}>{teamSelectLabel(team)}</option>)}
          </select>
          <p className="mt-2 text-xs text-slate-500">This team selection applies to the feed, name/product filters, monthly leaderboard and Excel export.</p>
        </div>

        {/* Remount scoped panels so old-team state cannot survive a team switch. */}
        <div key={teamId || "all-teams"} className="flex flex-col gap-6 lg:flex-row items-start">
          <div className="w-full lg:w-72 shrink-0 space-y-6 flex flex-col order-2 lg:order-1">
            <RecentUpdatesExport
              teamId={teamId}
              session={session}
              typeFilter={typeFilter}
              selectedUsers={selectedUsers}
              selectedProducts={selectedProducts}
              fromDate={fromDate}
              toDate={toDate}
              search={debouncedSearch}
            />
            <RecentUpdatesDateFilter
              datePreset={datePreset}
              setDatePreset={setDatePreset}
              fromDate={fromDate}
              setFromDate={setFromDate}
              toDate={toDate}
              setToDate={setToDate}
            />
            <RecentUpdatesFilter 
              teamId={teamId}
              session={session}
              fromDate={fromDate}
              toDate={toDate}
              selectedUsers={selectedUsers}
              setSelectedUsers={setSelectedUsers}
              selectedProducts={selectedProducts}
              setSelectedProducts={setSelectedProducts}
            />
          </div>
          
          <div className="w-full flex-1 order-1 lg:order-2">
            {/* Monthly Leaderboard & Top Performer Highlights */}
            <MonthlyLeaderboard 
              teamId={teamId}
              notes={notes}
              session={session}
            />

            {/* Today's User Work Tracker */}
            <TodayUserSummary 
              notes={notes} 
              selectedUsers={selectedUsers} 
              setSelectedUsers={setSelectedUsers} 
            />

            {/* Timeline Feed & Pagination */}
            <RecentUpdatesFeed 
              notes={notes}
              loading={loading}
              onNavigate={handleNavigate}
              pagination={pagination}
              page={page}
              setPage={setPage}
              limit={limit}
              setLimit={setLimit}
            />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
