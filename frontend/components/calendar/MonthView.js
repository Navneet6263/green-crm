"use client";

import { addDays, formatTime, styleOf, todayKey } from "./calendarUtils";

const HEAD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LIMIT = 3;

export default function MonthView({ from, monthKey, itemsByDay, onOpen, onShowDay, onCreate }) {
  const today = todayKey();
  const days = Array.from({ length: 42 }, (_, i) => addDays(from, i));

  return (
    <div className="overflow-hidden rounded-[14px] border border-slate-200 bg-white">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70">
        {HEAD.map((d, i) => (
          <div key={d} className={`px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider ${i >= 5 ? "text-slate-400" : "text-slate-500"}`}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((key, index) => {
          const items = itemsByDay.get(key) || [];
          const outside = key.slice(0, 7) !== monthKey.slice(0, 7);
          const isToday = key === today;
          const overdue = items.filter((i) => i.overdue).length;
          return (
            <div
              key={key}
              onClick={(event) => { if (onCreate && event.target === event.currentTarget) onCreate(key); }}
              className={[
                "group relative min-h-[118px] cursor-pointer border-slate-100 p-1.5 transition",
                index % 7 !== 6 ? "border-r" : "",
                index < 35 ? "border-b" : "",
                outside ? "bg-slate-50/50" : "bg-white hover:bg-brand-50/20",
              ].join(" ")}
            >
              <div className="mb-1 flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => onShowDay(key)}
                  className={[
                    "grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-[12px] font-semibold transition",
                    isToday ? "bg-brand-700 text-white" : outside ? "text-slate-300 hover:bg-slate-100" : "text-slate-700 hover:bg-slate-100",
                  ].join(" ")}
                  aria-label={`Show ${key}`}
                >
                  {Number(key.slice(8))}
                </button>
                <span className="flex items-center gap-1">
                  {items.length ? (
                    <span className={`text-[10px] font-semibold ${overdue ? "text-rose-500" : "text-slate-400"}`}>{overdue ? `${overdue} late` : items.length}</span>
                  ) : null}
                  {onCreate ? (
                    <button type="button" onClick={() => onCreate(key)} aria-label={`Add task on ${key}`}
                      className="grid h-5 w-5 place-items-center rounded-full text-[13px] font-bold leading-none text-brand-700 opacity-0 transition hover:bg-brand-100 group-hover:opacity-100">+</button>
                  ) : null}
                </span>
              </div>
              <div className="min-h-[72px] space-y-0.5" onClick={(event) => { if (onCreate && event.target === event.currentTarget) onCreate(key); }}>
                {items.slice(0, LIMIT).map((item) => {
                  const style = styleOf(item);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onOpen(item)}
                      title={`${item.title}${item.timed ? ` · ${formatTime(item.at)}` : ""}`}
                      className={`flex w-full items-center gap-1.5 rounded-[6px] px-1.5 py-[3px] text-left text-[11.5px] leading-tight transition hover:bg-slate-100 ${item.done ? "opacity-50" : ""}`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
                      {item.timed ? <span className="shrink-0 font-medium tabular-nums text-slate-400">{formatTime(item.at)}</span> : null}
                      <span className={`truncate ${item.overdue ? "font-semibold text-rose-700" : "text-slate-700"} ${item.done ? "line-through" : ""}`}>{item.title}</span>
                    </button>
                  );
                })}
                {items.length > LIMIT ? (
                  <button type="button" onClick={() => onShowDay(key)} className="w-full rounded-[6px] px-1.5 py-[3px] text-left text-[11px] font-semibold text-brand-700 hover:bg-brand-50">
                    +{items.length - LIMIT} more
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
