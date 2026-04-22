import DashboardIcon from "../dashboard/icons";
import { KICKER_CLASS, PANEL_CLASS, PRIMARY_BUTTON_CLASS } from "../communications/constants";

export default function AttendanceActionPanel({ attendance, punchAttendance, sending }) {
  if (!attendance) {
    return null;
  }

  const stats = [
    ["Current IP", attendance.ip_address || "--"],
    ["Last Event", attendance.last_event?.event_type || "--"],
    ["Validation", attendance.ip_allowed ? "Approved" : "Blocked"],
  ];

  return (
    <article className={PANEL_CLASS}>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className={KICKER_CLASS}>Attendance</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Punch desk</h3>
        </div>
        <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${attendance.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[#eadfcd] bg-white text-[#7c6d55]"}`}>
          {attendance.enabled ? `${attendance.allowed_ip_count} IP rules` : "Disabled"}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
            <span className={KICKER_CLASS}>{label}</span>
            <strong className="mt-3 block text-sm leading-6 text-[#060710]">{value}</strong>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button className={PRIMARY_BUTTON_CLASS} type="button" onClick={() => punchAttendance("punch_in")} disabled={sending}>
          <DashboardIcon name="attendance" className="h-4 w-4" />
          {sending ? "Saving..." : "Punch In"}
        </button>
        <button className={PRIMARY_BUTTON_CLASS} type="button" onClick={() => punchAttendance("punch_out")} disabled={sending}>
          <DashboardIcon name="attendance" className="h-4 w-4" />
          {sending ? "Saving..." : "Punch Out"}
        </button>
      </div>

      {!attendance.enabled && attendance.reason ? (
        <p className="mt-4 text-sm leading-6 text-[#7a6b57]">
          Backend capability reason: {attendance.reason.replaceAll("_", " ")}.
        </p>
      ) : null}
      {attendance.enabled && !attendance.ip_allowed ? (
        <p className="mt-4 text-sm leading-6 text-[#7a6b57]">
          Current IP is not in the approved office list. Superadmin or company admin must add this IP in Attendance settings before punch actions will succeed.
        </p>
      ) : null}
    </article>
  );
}
