"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState } from "react";

const BRAND = "#0c605d";
// The not-yet-won part of a bar: the same hue, lighter, so the two read as one entity.
const soft = (hex) => `${hex}40`;

/** Horizontal bars. The numbers are written beside each bar, so colour is never the only cue. */
export function BarList({ items, max, valueLabel = (i) => i.value, extra, hrefFor, color = BRAND, empty = "Nothing in this period." }) {
  if (!items.length) return <p className="py-6 text-center text-[13px] text-slate-400">{empty}</p>;
  const top = max || Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const hue = item.color || color;
        const part = item.part || 0;
        const body = (
          <>
            <span className="flex items-center justify-between gap-3 text-[13px]">
              <span className="flex min-w-0 items-center gap-2">
                {item.icon || null}
                <span className="min-w-0 truncate font-medium text-slate-800">{item.label}</span>
              </span>
              <span className="flex shrink-0 items-baseline gap-3 tabular-nums">
                {extra ? <span className="text-[12px] text-slate-500">{extra(item)}</span> : null}
                <span className="min-w-12 text-right font-semibold text-slate-900">{valueLabel(item)}</span>
              </span>
            </span>
            <span className={`mt-1 flex h-2 overflow-hidden rounded-full bg-slate-100 ${item.icon ? "ml-7" : ""}`} aria-hidden="true">
              {part ? <span className="h-full rounded-l-full" style={{ width: `${(part / top) * 100}%`, background: hue }} /> : null}
              <span className={`h-full rounded-r-full ${part ? "ml-[2px]" : "rounded-l-full"}`} style={{ width: `${((item.value - part) / top) * 100}%`, background: item.solid ? hue : soft(hue) }} />
            </span>
          </>
        );
        return (
          <li key={item.key || item.label}>
            {hrefFor ? <Link href={hrefFor(item)} prefetch={false} className="block rounded-[8px] px-1 py-0.5 hover:bg-slate-50">{body}</Link> : <div className="px-1 py-0.5">{body}</div>}
          </li>
        );
      })}
    </ul>
  );
}

/** Columns with a hover tooltip. `part` (solid) is the share of `value` that is won; leave it out for a plain chart. */
export function ColumnChart({ points, partLabel = "Won", valueLabel = "Added", color = BRAND, format = (v) => v }) {
  const [hover, setHover] = useState(null);
  if (!points.length) return <p className="py-6 text-center text-[13px] text-slate-400">Nothing in this period.</p>;
  const split = points.some((p) => p.part !== undefined);
  const max = Math.max(1, ...points.map((p) => p.value));
  const ticks = [max, max / 2, 0];
  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="flex h-[150px] flex-col justify-between py-0.5 text-right text-[10.5px] tabular-nums text-slate-400" aria-hidden="true">
          {ticks.map((t, i) => <span key={i}>{format(Math.round(t))}</span>)}
        </div>
        <div className="relative flex h-[150px] flex-1 items-end gap-[2px] border-b border-slate-200" onMouseLeave={() => setHover(null)} role="img" aria-label={`${valueLabel} chart`}>
          <span className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-slate-100" />
          {points.map((p, i) => (
            <div key={p.key} className="relative flex h-full flex-1 cursor-default flex-col justify-end" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={-1}>
              <div className={`flex w-full flex-col justify-end overflow-hidden rounded-t-[4px] transition-opacity ${hover !== null && hover !== i ? "opacity-50" : ""}`} style={{ height: `${(p.value / max) * 100}%`, minHeight: p.value ? 3 : 0 }}>
                {split ? (
                  <>
                    <div className="w-full" style={{ flex: p.value - p.part, background: soft(color) }} />
                    {p.part ? <div className="w-full border-t-2 border-white" style={{ flex: p.part, background: color }} /> : null}
                  </>
                ) : <div className="w-full flex-1" style={{ background: color }} />}
              </div>
            </div>
          ))}
          {hover !== null ? (
            <div className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[8px] bg-slate-900 px-2.5 py-1.5 text-[12px] text-white shadow-lg"
              style={{ left: `${Math.min(85, Math.max(15, ((hover + 0.5) / points.length) * 100))}%` }}>
              <b className="block font-semibold">{points[hover].label}</b>
              {valueLabel} {format(points[hover].value)}{split ? ` · ${partLabel} ${format(points[hover].part)}` : ""}
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-1 flex justify-between pl-7 text-[10.5px] text-slate-400" aria-hidden="true">
        <span>{points[0].label}</span>
        {points.length > 2 ? <span>{points[Math.floor(points.length / 2)].label}</span> : null}
        <span>{points[points.length - 1].label}</span>
      </div>
      {split ? (
        <div className="mt-2 flex gap-4 text-[12px] text-slate-600">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />{partLabel}</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: soft(color) }} />{valueLabel}, not {partLabel.toLowerCase()} yet</span>
        </div>
      ) : null}
    </div>
  );
}

/** Lets every card offer "make wider" and "remove" without each widget knowing about the layout. */
export const WidgetSlot = createContext(null);

function WidgetMenu({ title }) {
  const slot = useContext(WidgetSlot);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", onKey); };
  }, [open]);
  if (!slot) return null;
  const item = "block w-full rounded-[6px] px-2.5 py-1.5 text-left text-[12.5px] font-medium";
  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={`${title} options`} aria-expanded={open}
        className="grid h-7 w-7 place-items-center rounded-[8px] text-slate-400 hover:bg-slate-100 hover:text-slate-700">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-8 z-20 w-44 rounded-[10px] bg-white p-1 shadow-lg ring-1 ring-slate-200">
          {slot.onEdit ? <button type="button" role="menuitem" onClick={() => { setOpen(false); slot.onEdit(); }} className={`${item} text-slate-700 hover:bg-slate-50`}>Edit chart</button> : null}
          <button type="button" role="menuitem" onClick={() => { setOpen(false); slot.onResize(); }} className={`${item} text-slate-700 hover:bg-slate-50`}>{slot.size === "full" ? "Make narrow" : "Make full width"}</button>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); slot.onRemove(); }} className={`${item} text-rose-700 hover:bg-rose-50`}>Remove from dashboard</button>
        </div>
      ) : null}
    </div>
  );
}

/** Card frame shared by every widget. */
export function WidgetFrame({ title, subtitle, action, children, loading, error, accent }) {
  return (
    <section className="flex h-full min-w-0 flex-col rounded-[14px] bg-white ring-1 ring-slate-200">
      <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {accent ? <span className="mt-1 h-3.5 w-1 shrink-0 rounded-full" style={{ background: accent }} aria-hidden="true" /> : null}
          <div className="min-w-0">
            <h2 className="text-[14.5px] font-bold text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {action}
          <WidgetMenu title={title} />
        </div>
      </header>
      <div className="min-h-0 flex-1 p-4">
        {error ? <p role="alert" className="rounded-[10px] bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</p>
          : loading ? <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-6 animate-pulse rounded-[6px] bg-slate-100" />)}</div>
            : children}
      </div>
    </section>
  );
}

export const MoreLink = ({ href, children = "Open" }) => (
  <Link href={href} prefetch={false} className="shrink-0 text-[12.5px] font-semibold text-brand-700 hover:underline">{children}</Link>
);
