"use client";

import DashboardShell from "../../components/dashboard/DashboardShell";
import AttendanceActionPanel from "../../components/attendance/AttendanceActionPanel";
import AttendanceHero from "../../components/attendance/AttendanceHero";
import AttendanceHistoryPanel from "../../components/attendance/AttendanceHistoryPanel";
import { useAttendanceWorkspace } from "../../components/attendance/useAttendanceWorkspace";

export default function AttendancePage() {
  const workspace = useAttendanceWorkspace();
  const isAdmin = ["super_admin", "platform_admin", "platform_manager", "admin", "manager"].includes(
    workspace.session?.user?.role || ""
  );

  return (
    <DashboardShell session={workspace.session} title="Attendance" hideTitle heroStats={[]}>
      {workspace.error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{workspace.error}</div> : null}
      {workspace.message ? <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{workspace.message}</div> : null}
      {workspace.loading ? <div className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-[#6f614c]">Loading attendance workspace...</div> : null}

      {!workspace.loading ? (
        <section className="space-y-5">
          <AttendanceHero attendance={workspace.attendance} historyCount={workspace.history.length} />
          <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr] lg:items-start mt-8">
            <AttendanceActionPanel attendance={workspace.attendance} punchAttendance={workspace.punchAttendance} sending={workspace.sending} />
            <AttendanceHistoryPanel 
              events={workspace.history} 
              search={workspace.search} 
              setSearch={workspace.setSearch} 
              isAdmin={isAdmin} 
            />
          </div>
        </section>
      ) : null}
    </DashboardShell>
  );
}
