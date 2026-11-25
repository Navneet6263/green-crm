"use client";

import { useState } from "react";
import { formatMinutes, formatTime } from "./trackingClient";

// Hours since midnight India time, for placing things on the day line.
const istHour = (value) => {
  const d = new Date(new Date(value).getTime() + 330 * 60000);
  return d.getUTCHours() + d.getUTCMinutes() / 60;
};

/** One day on a line: tracking trips as bars, client visits as pins, punch in/out as ticks. Hover for details. */
export default function DayTimeline({ day, isToday }) {
  const [hover, setHover] = useState(null);
  const trips = day?.trips || [];
  const visits = (day?.visits || []).filter((v) => v.at);
  const punches = (day?.attendance || []).filter((a) => a.created_at);
  const nowHour = istHour(Date.now());
  const hours = [
    ...trips.flatMap((t) => [istHour(t.started_at), t.stopped_at ? istHour(t.stopped_at) : t.active && isToday ? nowHour : istHour(t.started_at) + t.minutes / 60]),
    ...visits.map((v) => istHour(v.at)), ...punches.map((a) => istHour(a.created_at)),
  ];
  const start = Math.max(0, Math.min(8, ...hours.map(Math.floor)));
  const end = Math.min(24, Math.max(20, ...hours.map(Math.ceil)));
  const span = end - start;
  const x = (h) => `${((h - start) / span) * 100}%`;
  const ticks = Array.from({ length: Math.floor(span / 2) + 1 }, (_, i) => start + i * 2).filter((h) => h <= end);
  const label = (h) => `${h % 12 || 12}${h < 12 || h === 24 ? "am" : "pm"}`;

  return (
    <section className="rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[14px] font-bold text-slate-900">Day at a glance</p>
          <p className="text-[12px] text-slate-500">Tracking, client visits and punch in / out, by time</p>
        </div>
        <div className="flex flex-wrap gap-3 text-[11.5px] text-slate-600">
          <span className="inline-flex items-center gap-1.5"><i className="h-2 w-4 rounded-full bg-brand-600" />Tracking</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#e8bd00] ring-2 ring-white" />Visit</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-3 w-0.5 bg-emerald-600" />Punch in</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-3 w-0.5 bg-rose-500" />Punch out</span>
        </div>
      </div>

      <div className="relative mt-5 h-[64px]" onMouseLeave={() => setHover(null)}>
        {ticks.map((h) => (
          <div key={h} className="absolute bottom-0 top-0 border-l border-dashed border-slate-200" style={{ left: x(h) }}>
            <span className="absolute -bottom-5 -translate-x-1/2 text-[10.5px] text-slate-400">{label(h)}</span>
          </div>
        ))}
        <div className="absolute inset-x-0 top-[26px] h-3 rounded-full bg-slate-100" />
        {trips.map((t, i) => {
          const from = istHour(t.started_at);
          const to = t.stopped_at ? istHour(t.stopped_at) : t.active && isToday ? nowHour : from + t.minutes / 60;
          return (
            <button key={t.session_id || i} type="button" onMouseEnter={() => setHover({ x: (from + to) / 2, text: `Trip ${i + 1}: ${formatTime(t.started_at)} – ${t.stopped_at ? formatTime(t.stopped_at) : t.active ? "now" : "?"} · ${t.km.toFixed(1)} km · ${formatMinutes(t.minutes)}` })}
              className={`absolute top-[26px] h-3 rounded-full bg-brand-600 ${t.active ? "animate-pulse" : ""}`} style={{ left: x(from), width: `max(6px, ${((to - from) / span) * 100}%)` }} aria-label={`Trip ${i + 1}`} />
          );
        })}
        {punches.map((a, i) => (
          <button key={`p${i}`} type="button" onMouseEnter={() => setHover({ x: istHour(a.created_at), text: `${a.event_type === "punch_in" ? "Punch in" : "Punch out"} · ${formatTime(a.created_at)}` })}
            className={`absolute top-[18px] h-7 w-[3px] -translate-x-1/2 rounded-full ${a.event_type === "punch_in" ? "bg-emerald-600" : "bg-rose-500"}`} style={{ left: x(istHour(a.created_at)) }} aria-label={a.event_type} />
        ))}
        {visits.map((v, i) => (
          <button key={`v${i}`} type="button" onMouseEnter={() => setHover({ x: istHour(v.at), text: `${i + 1}. ${v.label} · ${formatTime(v.at)}${v.mocked ? " · mocked GPS" : ""}` })}
            className={`absolute top-[4px] grid h-5 w-5 -translate-x-1/2 place-items-center rounded-full text-[10px] font-bold ring-2 ring-white ${v.mocked ? "bg-rose-500 text-white" : "bg-[#e8bd00] text-slate-900"}`} style={{ left: x(istHour(v.at)) }}>{i + 1}</button>
        ))}
        {isToday && nowHour >= start && nowHour <= end ? <div className="absolute bottom-0 top-0 w-px bg-rose-400" style={{ left: x(nowHour) }} title="Now" /> : null}
        {hover ? (
          <div className="pointer-events-none absolute -top-9 z-10 -translate-x-1/2 whitespace-nowrap rounded-[8px] bg-slate-900 px-2.5 py-1 text-[11.5px] font-medium text-white shadow-lg"
            style={{ left: `clamp(80px, ${x(hover.x)}, calc(100% - 80px))` }}>{hover.text}</div>
        ) : null}
      </div>
      {!trips.length && !visits.length && !punches.length ? <p className="mt-7 text-center text-[12.5px] text-slate-500">Nothing on this day yet.</p> : <div className="h-5" />}
    </section>
  );
}
