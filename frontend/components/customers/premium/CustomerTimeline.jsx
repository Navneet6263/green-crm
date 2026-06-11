import { formatIndiaDateTime } from "../../../lib/dateTime";
import DashboardIcon from "../../dashboard/icons";

function when(v) { return v ? formatIndiaDateTime(v, true) : "—"; }

function initials(v = "C") {
  return String(v).split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("") || "C";
}

export default function CustomerTimeline({ activities, onAddActivity }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
        <DashboardIcon name="clock" className="mx-auto mb-3 h-8 w-8 text-slate-300" />
        <h3 className="text-sm font-bold text-slate-700">No History</h3>
        <p className="mt-1 text-xs text-slate-500 mb-6">Activity and timeline events will appear here.</p>
        <button onClick={onAddActivity} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500 transition shadow-sm">
          <DashboardIcon name="plus" className="h-4 w-4" /> Add Note / Activity
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 md:p-8 shadow-sm">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <DashboardIcon name="clock" className="h-5 w-5 text-indigo-500" /> Activity Timeline
        </h2>
        <button onClick={onAddActivity} className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition">
          <DashboardIcon name="plus" className="h-3 w-3" /> Add Note
        </button>
      </div>

      <div className="relative space-y-0 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-100 before:via-slate-200 before:to-transparent">
        {activities.map((act, i) => {
          const isNote = act.type === "note";
          const isFollowUp = act.type === "follow_up";
          const isSystem = !isNote && !isFollowUp;

          return (
            <div key={act.id || i} className="relative flex items-start gap-4 mb-6 group">
              <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white shadow-sm ${isNote ? 'bg-indigo-500 text-white' : isFollowUp ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {isNote ? <DashboardIcon name="document" className="h-4 w-4" /> : 
                 isFollowUp ? <DashboardIcon name="calendar" className="h-4 w-4" /> :
                 <div className="text-[10px] font-black">{initials(act.created_by_name || "S")}</div>}
              </div>

              <div className="min-w-0 flex-1 pt-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1.5">
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    {act.created_by_name || "System"}
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${isNote ? 'bg-indigo-50 text-indigo-600' : isFollowUp ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                      {act.type.replace('_', ' ')}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-slate-400">{act.created_at ? when(act.created_at) : ""}</span>
                </div>
                <div className={`rounded-2xl p-4 text-sm leading-relaxed ${isNote ? 'bg-indigo-50/50 border border-indigo-100/50 text-indigo-900' : isFollowUp ? 'bg-amber-50/50 border border-amber-100/50 text-amber-900' : 'bg-slate-50 border border-slate-100 text-slate-600'}`}>
                  {act.description || act.type}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
