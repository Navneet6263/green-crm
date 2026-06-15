"use client";

import { formatIndiaDateWithTime } from "../../lib/dateTime";
import DashboardIcon from "../dashboard/icons";
import AttendanceAdminSearch from "./AttendanceAdminSearch";

function formatDateTime(value) {
  return formatIndiaDateWithTime(value);
}

export default function AttendanceHistoryPanel({ events = [], search, setSearch, isAdmin }) {
  return (
    <article className="rounded-[24px] border border-slate-200/60 bg-white p-5 md:p-8 shadow-sm">
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-1">Activity Log</p>
        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Recent Attendance</h3>
      </div>

      {isAdmin && (
        <AttendanceAdminSearch search={search} setSearch={setSearch} />
      )}

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-4 bottom-4 w-px bg-indigo-100 hidden sm:block" />

        <div className="space-y-4">
          {events.length ? events.map((event) => {
            const isPunchIn = event.event_type === "punch_in";
            return (
              <div key={event.attendance_event_id} className="relative sm:pl-16 group">
                {/* Timeline node */}
                <div className={`absolute left-0 top-1.5 hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-white ${isPunchIn ? "bg-emerald-100 text-emerald-600 shadow-[0_0_0_2px_rgba(16,185,129,0.2)]" : "bg-rose-100 text-rose-600 shadow-[0_0_0_2px_rgba(244,63,94,0.2)]"} transition-transform group-hover:scale-110 z-10`}>
                  <DashboardIcon name="attendance" className="w-5 h-5" />
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition hover:bg-slate-50 hover:shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isPunchIn ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                          {isPunchIn ? "Punch In" : "Punch Out"}
                        </span>
                        {event.user_name && (
                          <span className="text-sm font-bold text-slate-700">{event.user_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                        <DashboardIcon name="globe" className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[200px] sm:max-w-[300px]">
                          {event.location || `IP: ${event.ip_address || "--"}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:text-right">
                      <div className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm border border-slate-100">
                        {formatDateTime(event.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="rounded-3xl border-2 border-dashed border-indigo-100 bg-indigo-50/30 px-6 py-16 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-500 mb-4">
                <DashboardIcon name="search" className="w-8 h-8" />
              </div>
              <p className="text-base font-semibold text-slate-700">No events found</p>
              <p className="mt-1 text-sm text-slate-500">There are no attendance logs matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
