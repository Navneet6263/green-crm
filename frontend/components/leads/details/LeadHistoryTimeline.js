"use client";

import DashboardIcon from "../../dashboard/icons";

const HISTORY_META = {
  assigned: { icon: "users", tone: "bg-[#fff4d8] text-[#8d6e27]" },
  call: { icon: "phone", tone: "bg-[#eef7ff] text-[#2f6fdd]" },
  email: { icon: "mail", tone: "bg-[#f3f7ff] text-[#4f6ad7]" },
  meeting: { icon: "calendar", tone: "bg-[#fff4d8] text-[#8d6e27]" },
  note: { icon: "documents", tone: "bg-[#f8f4eb] text-[#7c6d55]" },
  task: { icon: "tasks", tone: "bg-[#f3f7ff] text-[#2f6fdd]" },
  comment: { icon: "message", tone: "bg-[#eef9ef] text-[#2f8a4b]" },
  updated: { icon: "message", tone: "bg-[#eef9ef] text-[#2f8a4b]" },
};

function getHistoryMeta(type) {
  return HISTORY_META[String(type || "").toLowerCase()] || { icon: "message", tone: "bg-[#f8f4eb] text-[#7c6d55]" };
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
      <p className="rounded-[22px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-4 py-10 text-center text-sm text-[#7a6b57]">
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
              {!isLast ? <span className="mt-2 h-full w-px bg-[#efe6d8]" /> : null}
            </div>
            <div className="min-w-0 flex-1 border-b border-[#f0e7d8] pb-4 last:border-b-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <strong className="block text-sm text-[#060710]">{item.created_by_name || "User"}</strong>
                  <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.18em] text-[#9a886d]">
                    {formatTypeLabel(item.type)}
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#8f816a]">{renderWhen(item.created_at, true)}</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-[#5f533f]">{item.description || "No description provided."}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
