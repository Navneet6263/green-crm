"use client";

import { useEffect, useState } from "react";
import { addDays, addMonths, fmt, startOfMonth, startOfWeek, todayKey } from "./calendarUtils";

const HEAD = ["M", "T", "W", "T", "F", "S", "S"];

export default function MiniMonth({ selected, onSelect, counts = {}, range }) {
  const [month, setMonth] = useState(startOfMonth(selected));
  useEffect(() => { setMonth(startOfMonth(selected)); }, [selected]);
  const first = startOfWeek(month);
  const today = todayKey();
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i));

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{fmt(month, { month: "long", year: "numeric" })}</p>
        <div className="flex">
          <button type="button" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))} className="grid h-7 w-7 place-items-center rounded-[8px] text-slate-400 hover:bg-slate-100 hover:text-slate-700">‹</button>
          <button type="button" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))} className="grid h-7 w-7 place-items-center rounded-[8px] text-slate-400 hover:bg-slate-100 hover:text-slate-700">›</button>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-7 text-center text-[11px] font-semibold text-slate-400">
        {HEAD.map((d, i) => <span key={i} className="py-1">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {days.map((key) => {
          const outside = key.slice(0, 7) !== month.slice(0, 7);
          const isToday = key === today;
          const isSelected = key === selected;
          const inRange = range && key >= range.from && key < range.to;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-label={fmt(key, { weekday: "long", day: "numeric", month: "long" })}
              aria-pressed={isSelected}
              className={[
                "relative mx-auto grid h-8 w-8 place-items-center rounded-full text-[12px] transition",
                isToday ? "bg-brand-700 font-bold text-white" : isSelected ? "bg-brand-100 font-semibold text-brand-900" : inRange ? "bg-slate-50 text-slate-700" : "text-slate-600 hover:bg-slate-100",
                outside && !isToday ? "text-slate-300" : "",
              ].join(" ")}
            >
              {Number(key.slice(8))}
              {counts[key] && !isToday ? <span className="absolute bottom-1 h-1 w-1 rounded-full bg-gold-500" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
