"use client";

import DashboardShell from "../../components/dashboard/DashboardShell";
import AttendanceActionPanel from "../../components/attendance/AttendanceActionPanel";
import AttendanceHero from "../../components/attendance/AttendanceHero";
import AttendanceHistoryPanel from "../../components/attendance/AttendanceHistoryPanel";
import { useAttendanceWorkspace } from "../../components/attendance/useAttendanceWorkspace";

export default function AttendancePage() {
  const workspace = useAttendanceWorkspace();

  return (
    <DashboardShell session={workspace.session} title="Attendance" hideTitle heroStats={[]}>
      {workspace.error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{workspace.error}</div> : null}
      {workspace.message ? <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{workspace.message}</div> : null}
      {workspace.loading ? <div className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-[#6f614c]">Loading attendance workspace...</div> : null}

      {!workspace.loading ? (
        <section className="space-y-5">
          <AttendanceHero attendance={workspace.attendance} historyCount={workspace.history.length} />
          <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr] xl:items-start">
            <AttendanceActionPanel attendance={workspace.attendance} punchAttendance={workspace.punchAttendance} sending={workspace.sending} />
            <AttendanceHistoryPanel events={workspace.history} />
          </div>
        </section>
      ) : null}
    </DashboardShell>
  );
}
