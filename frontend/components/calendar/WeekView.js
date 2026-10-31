"use client";

import { useEffect, useRef, useState } from "react";
import { addDays, fmt, formatTime, istParts, styleOf, todayKey } from "./calendarUtils";

const START = 7;   // 7 am
const END = 22;    // 10 pm
const HOUR_PX = 52;
const SLOT_MIN = 45; // tasks have no end time; draw each as a 45-minute block

// Side-by-side lanes for items whose blocks overlap on the same day.
function layout(items) {
  const lanes = [];
  return items.map((item) => {
    const start = item.minutes;
    let lane = lanes.findIndex((end) => end <= start);
    if (lane === -1) { lane = lanes.length; lanes.push(0); }
    lanes[lane] = start + SLOT_MIN;
    return { item, lane };
  }).map((entry, _, all) => ({ ...entry, lanes: Math.max(1, ...all.filter((o) => Math.abs(o.item.minutes - entry.item.minutes) < SLOT_MIN).map((o) => o.lane + 1)) }));
}

export default function WeekView({ from, itemsByDay, onOpen, onCreate }) {
  const today = todayKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const scroller = useRef(null);
  const [now, setNow] = useState(() => istParts(Date.now()));

  useEffect(() => {
    const timer = setInterval(() => setNow(istParts(Date.now())), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = Math.max(0, (Math.min(now.hour, 18) - START - 1) * HOUR_PX);
  }, [from]); // eslint-disable-line react-hooks/exhaustive-deps

  const hours = Array.from({ length: END - START }, (_, i) => START + i);
  const nowTop = ((now.hour * 60 + now.minute) - START * 60) / 60 * HOUR_PX;

  return (
    <div className="overflow-hidden rounded-[14px] border border-slate-200 bg-white">
      <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-slate-200">
        <div />
        {days.map((key) => {
          const isToday = key === today;
          return (
            <div key={key} className="border-l border-slate-100 py-2 text-center">
              <p className={`text-[11px] font-semibold uppercase tracking-wider ${isToday ? "text-brand-700" : "text-slate-400"}`}>{fmt(key, { weekday: "short" })}</p>
              <p className={`mx-auto mt-0.5 grid h-8 w-8 place-items-center rounded-full text-[15px] font-semibold ${isToday ? "bg-brand-700 text-white" : "text-slate-800"}`}>{Number(key.slice(8))}</p>
            </div>
          );
        })}
      </div>

      {/* Items without a time (due "any time" that day) */}
      <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-slate-50/60">
        <div className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase text-slate-400">All day</div>
        {days.map((key) => (
          <div key={key} className="min-h-[34px] space-y-0.5 border-l border-slate-100 p-1">
            {(itemsByDay.get(key) || []).filter((i) => !i.timed).map((item) => {
              const style = styleOf(item);
              return (
                <button key={item.key} type="button" onClick={() => onOpen(item)}
                  className={`block w-full truncate rounded-[6px] border px-1.5 py-0.5 text-left text-[11px] font-medium ${style.chip} ${item.done ? "line-through opacity-50" : ""}`}>
                  {item.title}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div ref={scroller} className="max-h-[560px] overflow-y-auto">
        <div className="relative grid grid-cols-[56px_repeat(7,minmax(0,1fr))]" style={{ height: hours.length * HOUR_PX }}>
          <div className="relative">
            {hours.map((h, i) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-[10px] font-medium text-slate-400" style={{ top: i * HOUR_PX }}>
                {i === 0 ? "" : `${((h + 11) % 12) + 1} ${h < 12 ? "am" : "pm"}`}
              </span>
            ))}
          </div>
          {days.map((key) => {
            const timed = (itemsByDay.get(key) || []).filter((i) => i.timed);
            return (
              <div
                key={key}
                onClick={(event) => {
                  if (!onCreate || event.target !== event.currentTarget) return;
                  const hour = Math.min(END - 1, START + Math.floor(event.nativeEvent.offsetY / HOUR_PX));
                  onCreate(key, `${String(hour).padStart(2, "0")}:00`);
                }}
                title={onCreate ? "Click an empty slot to add a task" : undefined}
                className={`relative cursor-cell border-l border-slate-100 ${key === today ? "bg-brand-50/30" : ""}`}
              >
                {hours.map((h, i) => <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-slate-100" style={{ top: i * HOUR_PX }} />)}
                {layout(timed).map(({ item, lane, lanes }) => {
                  const style = styleOf(item);
                  const minutes = Math.min(Math.max(item.minutes, START * 60), END * 60 - SLOT_MIN);
                  const top = (minutes - START * 60) / 60 * HOUR_PX;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onOpen(item)}
                      className={`absolute overflow-hidden rounded-[8px] border px-1.5 py-1 text-left shadow-sm transition hover:z-10 hover:shadow-md ${style.chip} ${item.done ? "opacity-50" : ""}`}
                      style={{ top: top + 1, height: SLOT_MIN / 60 * HOUR_PX - 3, left: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }}
                      title={item.title}
                    >
                      <span className={`absolute inset-y-0 left-0 w-[3px] ${style.bar}`} />
                      <p className={`truncate pl-1 text-[11.5px] font-semibold leading-tight ${item.done ? "line-through" : ""}`}>{item.title}</p>
                      <p className="truncate pl-1 text-[10.5px] opacity-75">{formatTime(item.at)}</p>
                    </button>
                  );
                })}
                {key === today && nowTop >= 0 && nowTop <= hours.length * HOUR_PX ? (
                  <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: nowTop }}>
                    <div className="relative h-[2px] bg-rose-500"><span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-rose-500" /></div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
