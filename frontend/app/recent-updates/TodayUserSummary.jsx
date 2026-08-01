"use client";

import { useMemo } from "react";

export default function TodayUserSummary({ notes = [], selectedUsers = [], setSelectedUsers }) {
  // Calculate today's user activity breakdown
  const userStats = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const userMap = {};

    notes.forEach((note) => {
      const noteDate = note.created_at ? new Date(note.created_at).toISOString().split("T")[0] : "";
      if (noteDate === todayStr && note.created_by_name) {
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

    return Object.values(userMap).sort((a, b) => b.count - a.count);
  }, [notes]);

  const totalTodayCount = useMemo(() => {
    return userStats.reduce((sum, u) => sum + u.count, 0);
  }, [userStats]);

  const toggleUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([userId]);
    }
  };

  if (userStats.length === 0) {
    return (
      <div className="mb-6 rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Today's Activity Tracker
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              No notes or interactions logged yet today.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-indigo-900/50">
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Today's Team Performance
          </h3>
          <p className="text-xs text-indigo-200 mt-0.5">
            Click any team member below to filter their work logged today.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="rounded-xl bg-white/10 px-3 py-1 text-xs font-bold text-emerald-300 backdrop-blur-md border border-white/10">
            {totalTodayCount} {totalTodayCount === 1 ? "Update Today" : "Updates Today"}
          </span>
          {selectedUsers.length > 0 && (
            <button
              onClick={() => setSelectedUsers([])}
              className="rounded-xl bg-indigo-600/60 hover:bg-indigo-600 px-3 py-1 text-xs font-semibold text-white transition-all border border-indigo-400/30"
            >
              Clear User Filter ✕
            </button>
          )}
        </div>
      </div>

      {/* User Chips Grid */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={() => setSelectedUsers([])}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
            selectedUsers.length === 0
              ? "bg-white text-indigo-950 shadow-md scale-105"
              : "bg-white/10 text-slate-300 hover:bg-white/20"
          }`}
        >
          All Members ({totalTodayCount})
        </button>

        {userStats.map((user) => {
          const isSelected = selectedUsers.includes(user.id);
          const initials = user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();

          return (
            <button
              key={user.id}
              onClick={() => toggleUser(user.id)}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
                isSelected
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20 scale-105"
                  : "bg-white/10 text-slate-200 hover:bg-white/20 border border-white/5"
              }`}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-black">
                {initials}
              </div>
              <span>{user.name}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${isSelected ? "bg-white text-emerald-950" : "bg-white/20 text-white"}`}>
                {user.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
