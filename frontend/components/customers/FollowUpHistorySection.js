"use client";

import DashboardIcon from "../dashboard/icons";
import { formatIndiaDateTime } from "../../lib/dateTime";

const C = {
  panel: "rounded-2xl border border-slate-100 bg-white shadow-sm",
  kicker: "text-[10px] font-bold uppercase tracking-widest text-slate-400",
};

const ACTIVITY_ICONS = {
  call: { icon: "phone", color: "emerald", bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
  email: { icon: "mail", color: "blue", bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
  meeting: { icon: "calendar", color: "purple", bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100" },
  whatsapp: { icon: "message", color: "green", bg: "bg-green-50", text: "text-green-600", border: "border-green-100" },
  other: { icon: "documents", color: "slate", bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-100" },
  note: { icon: "documents", color: "slate", bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-100" },
};

function when(v) {
  return v ? formatIndiaDateTime(v, true) : "—";
}

function parseFollowUpHistory(notes) {
  if (!notes) return [];
  
  const lines = notes.split("\n").map(l => l.trim()).filter(Boolean);
  return lines.map((line, i) => {
    // Match format: [timestamp] Author: content
    const match = line.match(/^\[(.+?)\]\s+([^:]+):\s*(.+)$/);
    if (!match) {
      return {
        id: `legacy-${i}`,
        timestamp: null,
        author: "Team",
        content: line,
        activityType: "note",
      };
    }

    const [, timestamp, author, content] = match;
    
    // Detect activity type from content
    let activityType = "note";
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes("call") || lowerContent.includes("phone")) activityType = "call";
    else if (lowerContent.includes("email") || lowerContent.includes("mail")) activityType = "email";
    else if (lowerContent.includes("meeting") || lowerContent.includes("met")) activityType = "meeting";
    else if (lowerContent.includes("whatsapp") || lowerContent.includes("wa")) activityType = "whatsapp";
    
    // Check for activity type prefix like "[CALL]" or "[EMAIL]"
    const typeMatch = content.match(/^\[([A-Z]+)\]\s*(.+)$/);
    if (typeMatch) {
      const [, type, cleanContent] = typeMatch;
      activityType = type.toLowerCase();
      return {
        id: `${timestamp}-${i}`,
        timestamp,
        author: author.trim(),
        content: cleanContent.trim(),
        activityType,
      };
    }

    return {
      id: `${timestamp}-${i}`,
      timestamp,
      author: author.trim(),
      content: content.trim(),
      activityType,
    };
  }).reverse(); // Most recent first
}

export default function FollowUpHistorySection({ notes, onAddActivity }) {
  const history = parseFollowUpHistory(notes);

  return (
    <div className={`${C.panel} px-5 py-5`} id="follow-up-history">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className={C.kicker}>Customer Engagement</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">Follow-up History</h2>
        </div>
        <button
          type="button"
          onClick={onAddActivity}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          <DashboardIcon name="plus" className="h-4 w-4" />
          Add Activity
        </button>
      </div>

      <div className="space-y-3">
        {history.length ? (
          history.map((item) => {
            const config = ACTIVITY_ICONS[item.activityType] || ACTIVITY_ICONS.note;
            return (
              <div
                key={item.id}
                className={`flex gap-3 rounded-xl border ${config.border} ${config.bg} px-4 py-3.5`}
              >
                <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${config.bg} border ${config.border}`}>
                  <DashboardIcon name={config.icon} className={`h-4 w-4 ${config.text}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-semibold text-slate-800">{item.author}</strong>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${config.text} ${config.bg} border ${config.border}`}>
                        {item.activityType}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {item.timestamp ? when(item.timestamp) : "Manual entry"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{item.content}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-100">
              <DashboardIcon name="documents" className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600">No follow-up history yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Start tracking customer interactions by adding your first activity
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
