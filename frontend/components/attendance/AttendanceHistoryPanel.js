import { KICKER_CLASS, PANEL_CLASS } from "../communications/constants";
import { formatIndiaDateWithTime } from "../../lib/dateTime";

function formatDateTime(value) {
  return formatIndiaDateWithTime(value);
}

function titleCase(value) {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export default function AttendanceHistoryPanel({ events = [] }) {
  return (
    <article className={PANEL_CLASS}>
      <div className="mb-5">
        <p className={KICKER_CLASS}>Recent Events</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Attendance history</h3>
      </div>

      <div className="space-y-3">
        {events.length ? events.map((event) => (
          <div key={event.attendance_event_id} className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <strong className="block text-sm text-[#060710]">{titleCase(event.event_type)}</strong>
                <p className="mt-2 text-sm text-[#6f614c]">IP: {event.ip_address || "--"}</p>
              </div>
              <span className="text-xs font-medium text-[#8f816a]">{formatDateTime(event.created_at)}</span>
            </div>
          </div>
        )) : (
          <div className="rounded-[22px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-12 text-center text-sm text-[#7a6b57]">
            No attendance events have been recorded for this user yet.
          </div>
        )}
      </div>
    </article>
  );
}
