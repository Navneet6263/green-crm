"use client";

import Link from "next/link";
import { addDays, categoryOf, fmt, formatTime, styleOf, todayKey } from "./calendarUtils";

function Row({ item, onOpen, withDate = false }) {
  const style = styleOf(item);
  return (
    <li>
      <button type="button" onClick={() => onOpen(item)} className="group flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition hover:bg-slate-50">
        <span className={`${withDate ? "w-[92px]" : "w-[64px]"} shrink-0 text-[12px] font-semibold leading-tight tabular-nums ${item.overdue ? "text-rose-600" : "text-slate-500"}`}>
          {withDate ? <span className="block">{fmt(item.dayKey, { day: "numeric", month: "short" })}</span> : null}
          {item.timed ? formatTime(item.at) : "Any time"}
        </span>
        <span className={`h-9 w-[3px] shrink-0 rounded-full ${style.bar}`} />
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[14px] font-semibold ${item.done ? "text-slate-400 line-through" : "text-slate-900"}`}>{item.title}</span>
          <span className="block truncate text-[12px] text-slate-500">{item.subtitle}</span>
        </span>
        <span className={`hidden shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold sm:inline ${style.chip}`}>
          {item.overdue ? "Overdue" : item.done ? "Done" : categoryOf(item.category).label.replace(/s$/, "")}
        </span>
        <span className="shrink-0 text-slate-300 transition group-hover:text-brand-600">›</span>
      </button>
    </li>
  );
}

export default function AgendaView({ from, itemsByDay, overdueItems, onOpen, onCreate }) {
  const today = todayKey();
  const days = Array.from({ length: 14 }, (_, i) => addDays(from, i)).filter((key) => (itemsByDay.get(key) || []).length);
  const showOverdue = from <= today && overdueItems.length;

  if (!days.length && !showOverdue) {
    return (
      <div className="grid place-items-center rounded-[14px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <p className="text-base font-semibold text-slate-800">Nothing scheduled for these two weeks</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">Set a follow-up date on a lead or create a task with a due date and it will appear here.</p>
        {onCreate ? (
          <button type="button" onClick={() => onCreate(from)} className="mt-4 rounded-[10px] bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">Create a task</button>
        ) : (
          <Link href="/tasks" className="mt-4 rounded-[10px] bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">Create a task</Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showOverdue ? (
        <section className="overflow-hidden rounded-[14px] border border-rose-200 bg-white">
          <header className="flex items-center justify-between border-b border-rose-100 bg-rose-50/70 px-4 py-2.5">
            <p className="text-sm font-bold text-rose-700">Overdue · {overdueItems.length}</p>
            <p className="text-xs text-rose-600">Oldest first — clear these before today’s work</p>
          </header>
          <ul className="p-1.5">{overdueItems.slice(0, 20).map((item) => <Row key={item.key} item={item} onOpen={onOpen} withDate />)}</ul>
        </section>
      ) : null}
      {days.map((key) => {
        const items = itemsByDay.get(key);
        const isToday = key === today;
        const label = isToday ? "Today" : key === addDays(today, 1) ? "Tomorrow" : fmt(key, { weekday: "long" });
        return (
          <section key={key} className={`overflow-hidden rounded-[14px] border bg-white ${isToday ? "border-brand-200" : "border-slate-200"}`}>
            <header className={`flex items-center gap-3 border-b px-4 py-2.5 ${isToday ? "border-brand-100 bg-brand-50/60" : "border-slate-100 bg-slate-50/60"}`}>
              <span className={`grid h-9 w-9 place-items-center rounded-[10px] text-sm font-bold ${isToday ? "bg-brand-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>{Number(key.slice(8))}</span>
              <div className="leading-tight">
                <p className="text-sm font-bold text-slate-900">{label}</p>
                <p className="text-xs text-slate-500">{fmt(key, { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
              <span className="ml-auto text-xs font-semibold text-slate-500">{items.length} {items.length === 1 ? "item" : "items"}</span>
              {onCreate ? (
                <button type="button" onClick={() => onCreate(key)} className="rounded-[8px] px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50">+ Add</button>
              ) : null}
            </header>
            <ul className="p-1.5">{items.map((item) => <Row key={item.key} item={item} onOpen={onOpen} />)}</ul>
          </section>
        );
      })}
    </div>
  );
}
