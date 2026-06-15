"use client";

import { useEffect, useState } from "react";
import { formatIndiaCustom } from "../../lib/dateTime";

function stat(label, value, accent) {
  return { label, value: value ?? "--", accent };
}

export default function AttendanceHero({ attendance, historyCount }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const stats = [
    stat("Provider", attendance?.provider || "Native", "text-indigo-600"),
    stat("Source", attendance?.source || "Tenant", "text-emerald-600"),
    stat("Recent Events", historyCount || 0, "text-rose-600"),
    stat(
      "Last Sync",
      attendance?.last_event?.created_at
        ? formatIndiaCustom(attendance.last_event.created_at, {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Never",
      "text-amber-600"
    ),
  ];

  return (
    <article className="relative overflow-hidden rounded-[24px] border border-slate-200/60 bg-white px-5 py-6 md:px-8 md:py-8 shadow-sm">
      {/* Subtle modern light gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-white to-emerald-50/40 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-start justify-between gap-8">
        
        {/* Left Side: Clock & Title */}
        <div className="flex-1 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/50 px-3 py-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Live Tracker</span>
          </div>

          <div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-800 tabular-nums">
              {time.toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {time.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <p className="max-w-xl text-sm leading-relaxed text-slate-600">
            Secure, precise, and geo-validated tracking system. Your logs remain heavily encrypted and restricted by tenant-level protocols.
          </p>
        </div>

        {/* Right Side: Stats Grid */}
        <div className="grid grid-cols-2 gap-3 w-full md:w-auto md:min-w-[320px]">
          {stats.map((item) => (
            <div 
              key={item.label} 
              className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
              <p className={`mt-1.5 text-lg font-bold tracking-tight ${item.accent}`}>{item.value}</p>
            </div>
          ))}
        </div>
        
      </div>
    </article>
  );
}
