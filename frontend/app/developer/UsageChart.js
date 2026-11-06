"use client";

import { useState } from "react";
import { KIND_COLORS, fmt } from "./dev-ui";

const SERIES = [
  { key: "capture", label: "Lead link posts", color: KIND_COLORS.capture },
  { key: "api", label: "API calls", color: KIND_COLORS.api },
];
const dayLabel = (day) => new Date(`${day}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function niceMax(value) {
  if (value <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / step) * step;
}

/** Requests per day for the last 14 days, lead links and API calls stacked, with a hover tooltip. */
export default function UsageChart({ days = [] }) {
  const [hover, setHover] = useState(null);
  const totals = days.map((d) => ({ ...d, capture: d.capture_ok + d.capture_failed, api: d.api_ok + d.api_failed }));
  const max = niceMax(Math.max(0, ...totals.map((d) => d.capture + d.api)));
  const ticks = [max, Math.round(max / 2), 0];
  const active = hover === null ? null : totals[hover];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 text-[12px] text-slate-600">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} />{s.label}</span>
        ))}
      </div>
      <div className="relative mt-3 flex h-[190px] gap-2">
        <div className="flex w-7 shrink-0 flex-col justify-between pb-5 text-right text-[10.5px] text-slate-400">
          {ticks.map((t) => <span key={t}>{fmt(t)}</span>)}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 bottom-5 flex flex-col justify-between">
            {ticks.map((t) => <div key={t} className="border-t border-dashed border-slate-200" />)}
          </div>
          <div className="absolute inset-x-0 top-0 bottom-5 flex items-end gap-[3px]">
            {totals.map((d, i) => {
              const sum = d.capture + d.api;
              return (
                <button key={d.day} type="button" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                  aria-label={`${dayLabel(d.day)}: ${d.capture} lead link posts, ${d.api} API calls`}
                  className={`flex h-full min-w-0 flex-1 flex-col justify-end rounded-t-[4px] ${hover === i ? "bg-slate-100/70" : ""}`}>
                  {sum ? (
                    <span className="flex w-full flex-col-reverse gap-[2px] px-[18%]" style={{ height: `${(sum / max) * 100}%` }}>
                      {SERIES.map((s) => d[s.key] ? (
                        <span key={s.key} className="w-full first:rounded-b-none last:rounded-t-[4px]" style={{ flexGrow: d[s.key], background: s.color, minHeight: 2 }} />
                      ) : null)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex gap-[3px] text-[10px] text-slate-400">
            {totals.map((d, i) => <span key={d.day} className="min-w-0 flex-1 truncate text-center">{i % 2 === totals.length % 2 ? dayLabel(d.day).split(" ")[0] : ""}</span>)}
          </div>
          {active ? (
            <div className="pointer-events-none absolute top-1 z-10 w-[190px] rounded-[10px] bg-white p-2.5 text-[12px] shadow-lg ring-1 ring-slate-200"
              style={{ left: `clamp(0px, calc(${((hover + 0.5) / totals.length) * 100}% - 95px), calc(100% - 190px))` }}>
              <p className="font-bold text-slate-900">{dayLabel(active.day)}</p>
              {SERIES.map((s) => (
                <div key={s.key} className="mt-1 flex items-center justify-between gap-2 text-slate-600">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />{s.label}</span>
                  <span className="font-semibold text-slate-900">{fmt(active[s.key])}</span>
                </div>
              ))}
              <div className="mt-1.5 flex justify-between border-t border-slate-100 pt-1.5 text-slate-500"><span>Leads received</span><span className="font-semibold text-slate-900">{fmt(active.leads)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Failed</span><span className="font-semibold text-slate-900">{fmt(active.capture_failed + active.api_failed)}</span></div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
