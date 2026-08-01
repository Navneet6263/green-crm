"use client";

import { useEffect, useState, useMemo } from "react";
import { recentActivityApi } from "../../lib/api/recentActivity.js";

export default function MonthlyLeaderboard({ notes = [], session }) {
  const [period, setPeriod] = useState("thisMonth");
  const [periodNotes, setPeriodNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch full dataset for accurate monthly leaderboard calculations
  useEffect(() => {
    if (!session) return;
    const fetchPeriodData = async () => {
      setLoading(true);
      try {
        const now = new Date();
        let start, end;
        if (period === "lastMonth") {
          start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        } else {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        }

        const res = await recentActivityApi.getRecentNotes({
          limit: 10000,
          page: 1,
          fromDate: start.toISOString().split("T")[0],
          toDate: end.toISOString().split("T")[0]
        });

        const items = res.items || res.data || (Array.isArray(res) ? res : []);
        setPeriodNotes(items);
      } catch (err) {
        console.error("Leaderboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPeriodData();
  }, [session, period]);

  // Calculate monthly stats by user
  const { topPerformer, lowestPerformer, userRankings, myStats } = useMemo(() => {
    const dataSource = periodNotes.length > 0 ? periodNotes : notes;
    const userMap = {};

    dataSource.forEach((note) => {
      if (note.created_by_name) {
        const userId = note.created_by;
        if (!userMap[userId]) {
          userMap[userId] = {
            id: userId,
            name: note.created_by_name,
            role: note.created_by_role || "Team Member",
            count: 0,
          };
        }
        userMap[userId].count += 1;
      }
    });

    const rankings = Object.values(userMap).sort((a, b) => b.count - a.count);
    const top = rankings[0] || null;
    const lowest = rankings.length > 1 ? rankings[rankings.length - 1] : null;

    const currentUserId = session?.user?.user_id || session?.user?.id || session?.userId;
    const myStat = userMap[currentUserId] || { name: session?.user?.name || "You", count: 0 };

    return {
      topPerformer: top,
      lowestPerformer: lowest,
      userRankings: rankings,
      myStats: myStat
    };
  }, [periodNotes, notes, session]);

  const currentMonthName = useMemo(() => {
    const d = new Date();
    if (period === "lastMonth") d.setMonth(d.getMonth() - 1);
    return d.toLocaleString("en-US", { month: "long", year: "numeric" });
  }, [period]);

  return (
    <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            🏆 Employee Performance Leaderboard
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Team activity & achievement numbers for <strong className="text-indigo-600">{currentMonthName}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 self-start sm:self-auto">
          <button
            onClick={() => setPeriod("thisMonth")}
            className={`rounded-lg px-3 py-1 text-xs font-extrabold transition-all ${
              period === "thisMonth" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setPeriod("lastMonth")}
            className={`rounded-lg px-3 py-1 text-xs font-extrabold transition-all ${
              period === "lastMonth" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Last Month
          </button>
        </div>
      </div>

      {/* Highlights 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Performer Card */}
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-500/10 via-amber-50 to-orange-50/50 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase text-white tracking-wider">
              👑 #1 Top Producer
            </span>
            <span className="text-xl">🏆</span>
          </div>
          {topPerformer ? (
            <div>
              <div className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-0.5">
                🎉 Congrats!
              </div>
              <h4 className="text-lg font-black text-slate-900 leading-tight">
                {topPerformer.name}
              </h4>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-amber-600">{topPerformer.count}</span>
                <span className="text-xs font-semibold text-slate-600">Lead Updates Logged</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 py-2">No activity logged in period.</div>
          )}
        </div>

        {/* My Personal Score Card */}
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-500/10 via-indigo-50 to-blue-50/50 p-4 shadow-sm relative">
          <div className="flex items-center justify-between mb-2">
            <span className="rounded-md bg-indigo-600 px-2 py-0.5 text-[10px] font-black uppercase text-white tracking-wider">
              🎯 Your Monthly Score
            </span>
            <span className="text-xl">⭐</span>
          </div>
          <div>
            <div className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-0.5">
              Personal Progress
            </div>
            <h4 className="text-lg font-black text-slate-900 leading-tight">
              {myStats.name}
            </h4>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-black text-indigo-600">{myStats.count}</span>
              <span className="text-xs font-semibold text-slate-600">Updates Achieved</span>
            </div>
          </div>
        </div>

        {/* Lowest Activity Watch Card */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm relative">
          <div className="flex items-center justify-between mb-2">
            <span className="rounded-md bg-slate-600 px-2 py-0.5 text-[10px] font-black uppercase text-white tracking-wider">
              🔻 Lowest Activity
            </span>
            <span className="text-xl">📉</span>
          </div>
          {lowestPerformer ? (
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                Needs Improvement
              </div>
              <h4 className="text-lg font-bold text-slate-800 leading-tight">
                {lowestPerformer.name}
              </h4>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-700">{lowestPerformer.count}</span>
                <span className="text-xs font-semibold text-slate-500">Updates Completed</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 py-2">Single active user.</div>
          )}
        </div>
      </div>

      {/* Leaderboard Rankings Standings Table */}
      {userRankings.length > 0 && (
        <div className="border-t border-slate-100 pt-4">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">
            Full Team Rankings ({currentMonthName})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {userRankings.map((user, idx) => {
              const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
              return (
                <div key={user.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="text-sm font-black w-6 text-center">{medal}</span>
                    <span className="text-xs font-bold text-slate-800 truncate">{user.name}</span>
                  </div>
                  <span className="text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full shrink-0">
                    {user.count} updates
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
