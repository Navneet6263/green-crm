"use client";

import DashboardIcon from "../dashboard/icons";

export default function AttendanceActionPanel({ attendance, punchAttendance, sending }) {
  if (!attendance) return null;

  const isPunchedIn = attendance.last_event?.event_type === "punch_in";
  
  return (
    <article className="rounded-[24px] border border-slate-200/60 bg-white p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-1">Interactive</p>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">Attendance Terminal</h3>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${attendance.enabled ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${attendance.enabled ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
          {attendance.enabled ? `Active` : "Disabled"}
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current IP</span>
          <strong className="mt-1.5 block text-base font-semibold text-slate-800">{attendance.ip_address || "--"}</strong>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Last Event</span>
          <strong className="mt-1.5 flex items-center gap-2 text-base font-semibold text-slate-800 capitalize">
            {attendance.last_event?.event_type?.replace("_", " ") || "No records"}
            {isPunchedIn && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
          </strong>
        </div>
        <div className="col-span-2 md:col-span-1 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Device</span>
          <strong className="mt-1.5 block text-base font-semibold text-slate-800">
            Mobile Field App
          </strong>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button 
          onClick={() => punchAttendance("punch_in")} 
          disabled={sending || isPunchedIn}
          className="flex-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600"
        >
          <DashboardIcon name="attendance" className="w-4 h-4" />
          {sending ? "Syncing..." : "Punch In"}
        </button>
        <button 
          onClick={() => punchAttendance("punch_out")} 
          disabled={sending || !isPunchedIn}
          className="flex-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-800 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-slate-900 disabled:opacity-50 disabled:hover:bg-slate-800"
        >
          <DashboardIcon name="attendance" className="w-4 h-4" />
          {sending ? "Syncing..." : "Punch Out"}
        </button>
      </div>

    </article>
  );
}
