"use client";

import DashboardIcon from "../../dashboard/icons";

const HISTORY_META = {
  assigned: { icon: "users", tone: "bg-[#e9f6f5] text-[#0c605d]" },
  call: { icon: "phone", tone: "bg-[#eef7ff] text-[#2f6fdd]" },
  email: { icon: "mail", tone: "bg-[#f3f7ff] text-[#4f6ad7]" },
  meeting: { icon: "calendar", tone: "bg-[#e9f6f5] text-[#0c605d]" },
  note: { icon: "documents", tone: "bg-[#f8fafc] text-[#64748b]" },
  task: { icon: "tasks", tone: "bg-[#f3f7ff] text-[#2f6fdd]" },
  comment: { icon: "message", tone: "bg-[#eef9ef] text-[#2f8a4b]" },
  updated: { icon: "message", tone: "bg-[#eef9ef] text-[#2f8a4b]" },
};

function getHistoryMeta(type) {
  return HISTORY_META[String(type || "").toLowerCase()] || { icon: "message", tone: "bg-[#f8fafc] text-[#64748b]" };
}

function formatTypeLabel(type) {
  return String(type || "activity")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function LeadHistoryTimeline({ items, renderWhen }) {
  if (!items.length) {
    return (
      <p className="rounded-[22px] border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-4 py-10 text-center text-sm text-[#64748b]">
        No follow-up history recorded yet.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item, index) => {
        const meta = getHistoryMeta(item.type);
        const isLast = index === items.length - 1;

        return (
          <div key={item.activity_id || `${item.created_at}-${index}`} className="flex gap-4 py-4">
            <div className="flex flex-col items-center">
              <span className={`grid h-10 w-10 place-items-center rounded-2xl ${meta.tone}`}>
                <DashboardIcon name={meta.icon} className="h-4 w-4" />
              </span>
              {!isLast ? <span className="mt-2 h-full w-px bg-[#e2e8f0]" /> : null}
            </div>
            <div className="min-w-0 flex-1 border-b border-[#e2e8f0] pb-4 last:border-b-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <strong className="block text-sm text-[#0f172a]">{item.created_by_name || "User"}</strong>
                  <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.18em] text-[#94a3b8]">
                    {formatTypeLabel(item.type)}
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#94a3b8]">{renderWhen(item.created_at, true)}</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-[#475569]">{item.description || "No description provided."}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
