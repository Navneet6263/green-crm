"use client";

import { KPIS, money } from "./customerConfig";

const ICONS = {
  customers: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.8-3 2.8-4.5 5.5-4.5s4.7 1.5 5.5 4.5M16 6.5a2.6 2.6 0 0 1 0 5M17.5 14.8c1.6.5 2.6 1.9 3 4.2" /></>,
  money: <path d="M7 5h10M7 9h10M11 5c3 0 4.5 1.6 4.5 4S14 13 11 13H8l7 6" />,
  alarm: <><circle cx="12" cy="13" r="7" /><path d="M12 9.5V13l2.5 1.5M5 4 3 6M19 4l2 2" /></>,
  check: <><circle cx="12" cy="12" r="8" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  rocket: <><path d="M12 15c-2-2-2.5-5 0-9.5C14.5 10 14 13 12 15Z" /><path d="M9.5 13.5 7 16l1 2M14.5 13.5 17 16l-1 2M12 15v4" /></>,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 9.5h16M8 3v4M16 3v4" /></>,
  flag: <><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></>,
};

/** Tiles on top; each one is also a filter for the table below. */
export default function CustomerKpis({ summary, loading, active, onPick }) {
  const s = summary || {};
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
      {KPIS.map((k) => {
        const value = Number(k.value(s) || 0);
        const on = active === k.key;
        return (
          <button key={k.key} type="button" onClick={() => onPick(on ? null : k)} aria-pressed={on}
            className={`relative overflow-hidden rounded-[12px] bg-white p-3.5 text-left ring-1 transition hover:-translate-y-px hover:shadow-sm ${on ? "ring-2 ring-slate-900" : "ring-slate-200"}`}>
            <span className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-slate-500">{k.label}</span>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px]" style={{ background: `${k.color}1f`, color: k.color }} aria-hidden="true">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{ICONS[k.icon]}</svg>
              </span>
            </span>
            <span className={`mt-1 block text-[22px] font-bold leading-none tracking-tight tabular-nums ${k.alert && value ? "text-rose-700" : "text-slate-900"}`}>
              {loading && !summary ? "…" : k.money ? money(value) : value.toLocaleString("en-IN")}
            </span>
            <span className="mt-1.5 block truncate text-[11.5px] text-slate-500">{summary ? k.hint(s) : " "}</span>
            <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full" style={{ background: k.color }} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
