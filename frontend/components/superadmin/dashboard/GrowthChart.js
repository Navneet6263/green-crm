"use client";

import { useEffect, useRef, useState } from "react";
import { COLORS, compact, num } from "./platform-ui";

const VIEWS = {
  leads: { label: "Leads", lines: [{ key: "leads", label: "New leads", color: COLORS[0], area: true }, { key: "won", label: "Won", color: COLORS[1] }] },
  users: { label: "People", lines: [{ key: "users", label: "New people", color: COLORS[4], area: true }] },
  companies: { label: "Companies", lines: [{ key: "companies", label: "New companies", color: COLORS[3], area: true }] },
};
const day = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const niceMax = (v) => { if (v <= 4) return 4; const p = 10 ** Math.floor(Math.log10(v)); return Math.ceil(v / p) * p; };

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Platform growth per day: leads and wins, new people or new companies, with a crosshair tooltip. */
export default function GrowthChart({ series = [] }) {
  const [view, setView] = useState("leads");
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const lines = VIEWS[view].lines;
  const H = 230, L = 34, R = 10, T = 12, B = 26;
  const n = series.length;
  const max = niceMax(Math.max(1, ...series.flatMap((p) => lines.map((l) => p[l.key]))));
  const x = (i) => L + (n <= 1 ? 0 : (i / (n - 1)) * (width - L - R));
  const y = (v) => T + (1 - v / max) * (H - T - B);
  const path = (key) => series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((width - L) / 64))));
  const totals = Object.fromEntries(lines.map((l) => [l.key, series.reduce((s, p) => s + p[l.key], 0)]));
  const point = hover !== null ? series[hover] : null;
  const pick = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    setHover(Math.min(n - 1, Math.max(0, Math.round(((e.clientX - box.left - L) / Math.max(1, width - L - R)) * (n - 1)))));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-4 text-[12px] text-slate-600">
          {lines.map((l) => (
            <span key={l.key} className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />{l.label}<b className="text-slate-900">{num(totals[l.key])}</b></span>
          ))}
        </div>
        <div className="flex gap-1 rounded-[10px] bg-slate-100 p-0.5">
          {Object.entries(VIEWS).map(([key, v]) => (
            <button key={key} type="button" onClick={() => { setView(key); setHover(null); }} aria-pressed={view === key}
              className={`rounded-[8px] px-2.5 py-1 text-[12px] font-semibold transition ${view === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{v.label}</button>
          ))}
        </div>
      </div>
      <div ref={ref} className="relative mt-3">
        {n ? (
          <svg width={width} height={H} role="img" aria-label={`${VIEWS[view].label} per day`} onMouseMove={pick} onMouseLeave={() => setHover(null)} className="block">
            <defs>
              {lines.filter((l) => l.area).map((l) => (
                <linearGradient key={l.key} id={`pg-${l.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={l.color} stopOpacity="0.22" /><stop offset="100%" stopColor={l.color} stopOpacity="0" /></linearGradient>
              ))}
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={L} x2={width - R} y1={y(t)} y2={y(t)} className="stroke-slate-200" strokeDasharray={t ? "3 4" : undefined} />
                <text x={L - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-400 text-[10.5px]">{compact(t)}</text>
              </g>
            ))}
            {series.map((p, i) => (i % every === 0 || i === n - 1) && (i === n - 1 || n - 1 - i >= every / 2) ? (
              <text key={p.date} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-slate-400 text-[10.5px]">{day(p.date)}</text>
            ) : null)}
            {lines.map((l) => (
              <g key={l.key}>
                {l.area ? <path d={`${path(l.key)} L${x(n - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`} fill={`url(#pg-${l.key})`} /> : null}
                <path d={path(l.key)} fill="none" stroke={l.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              </g>
            ))}
            {point ? (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={T} y2={y(0)} className="stroke-slate-300" />
                {lines.map((l) => <circle key={l.key} cx={x(hover)} cy={y(point[l.key])} r="4.5" fill={l.color} className="stroke-white" strokeWidth="2" />)}
              </g>
            ) : null}
          </svg>
        ) : <p className="py-16 text-center text-[13px] text-slate-400">Nothing in this period.</p>}
        {point ? (
          <div className="pointer-events-none absolute top-2 z-10 w-44 rounded-[10px] bg-white px-3 py-2 text-[12px] shadow-lg ring-1 ring-slate-200" style={{ left: Math.min(Math.max(x(hover) - 88, 0), width - 176) }}>
            <p className="font-semibold text-slate-900">{day(point.date)}</p>
            {lines.map((l) => (
              <p key={l.key} className="mt-1 flex justify-between text-slate-600"><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: l.color }} />{l.label}</span><b className="text-slate-900">{num(point[l.key])}</b></p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
