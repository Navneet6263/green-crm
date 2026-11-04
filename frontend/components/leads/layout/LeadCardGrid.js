"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_CARDS } from "../workspace/leadWorkspaceConfig";

const TONES = { slate: "text-slate-900", brand: "text-brand-800", danger: "text-rose-700", gold: "text-gold-800", green: "text-emerald-700" };
const ICON_BTN = "grid h-6 w-6 place-items-center rounded-[6px] bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-slate-900 disabled:opacity-30";

function StatCard({ label, value, hint, tone = "slate", active, onClick, editing, onEdit, onRemove, onMove, first, last }) {
  const Tag = onClick && !editing ? "button" : "div";
  return (
    <div className="group relative min-w-0">
      <Tag type={Tag === "button" ? "button" : undefined} onClick={editing ? undefined : onClick} aria-pressed={Tag === "button" ? Boolean(active) : undefined}
        className={`block h-full w-full rounded-[14px] bg-white p-3.5 text-left ring-1 transition ${editing ? "outline-2 outline-dashed outline-offset-2 outline-slate-300 ring-slate-200" : active ? "ring-2 ring-brand-500" : "ring-slate-200"} ${Tag === "button" ? "cursor-pointer hover:ring-brand-300" : ""}`}>
        <span className="block truncate pr-5 text-[12px] font-semibold text-slate-500">{label}</span>
        <span className={`mt-1 block text-[22px] font-bold leading-none tracking-tight tabular-nums ${TONES[tone]}`}>{value}</span>
        {hint ? <span className="mt-1.5 block truncate text-[11.5px] text-slate-400">{hint}</span> : null}
      </Tag>
      {editing ? (
        <span className="absolute -right-1.5 -top-1.5 flex gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={first} aria-label={`Move ${label} earlier`} className={ICON_BTN}>←</button>
          <button type="button" onClick={() => onMove(1)} disabled={last} aria-label={`Move ${label} later`} className={ICON_BTN}>→</button>
          <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className={`${ICON_BTN} hover:bg-rose-50 hover:text-rose-600`}>×</button>
        </span>
      ) : (
        <button type="button" onClick={onEdit} aria-label="Edit cards" title="Edit cards"
          className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-[6px] text-slate-300 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 focus:opacity-100 group-hover:opacity-100">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" /></svg>
        </button>
      )}
    </div>
  );
}

function AddCard({ hidden, onAdd }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const groups = [...new Set(hidden.map((c) => c.group))];
  return (
    <div className="relative min-w-0" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} disabled={!hidden.length} aria-expanded={open}
        className="flex h-full min-h-[92px] w-full flex-col items-center justify-center rounded-[14px] border-2 border-dashed border-slate-300 bg-white/60 text-[12.5px] font-semibold text-slate-500 hover:border-brand-400 hover:text-brand-700 disabled:opacity-40">
        <span className="text-[20px] leading-none">+</span>{hidden.length ? "Add card" : "All cards shown"}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1.5 max-h-[340px] w-[min(260px,85vw)] overflow-y-auto rounded-[12px] bg-white p-2 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-200">
          {groups.map((g) => (
            <div key={g}>
              <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{g}</p>
              {hidden.filter((c) => c.group === g).map((c) => (
                <button key={c.key} type="button" onClick={() => { onAdd(c.key); setOpen(false); }} className="block w-full rounded-[8px] px-2 py-1.5 text-left text-[13px] text-slate-700 hover:bg-slate-50">+ {c.label}</button>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** The KPI cards on the Leads page, with an edit mode to add, remove and reorder them. */
export default function LeadCardGrid({ cards, available, onChange, counts, listMeta, activeView, onCardClick }) {
  const [editing, setEditing] = useState(false);
  const shown = cards.map((key) => available.find((card) => card.key === key)).filter(Boolean);
  const hidden = available.filter((card) => !cards.includes(card.key));
  const move = (key, step) => {
    const i = cards.indexOf(key);
    const j = i + step;
    if (j < 0 || j >= cards.length) return;
    const next = [...cards];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-3 text-[12px]">
        {editing ? (
          <>
            <span className="mr-auto text-slate-500">Use ← → to reorder, × to remove, + to add. Saved for you on this device.</span>
            <button type="button" onClick={() => onChange(DEFAULT_CARDS)} className="font-semibold text-slate-500 hover:text-slate-800">Reset</button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-full bg-brand-700 px-3 py-1 font-semibold text-white hover:bg-brand-800">Done</button>
          </>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 font-semibold text-slate-400 hover:text-brand-700">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" /></svg>Edit cards
          </button>
        )}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(138px,1fr))] gap-3">
        {shown.map((card, i) => (
          <StatCard key={card.key} label={card.label} value={counts ? card.value(counts, listMeta) : "–"} hint={counts ? card.hint(counts, listMeta) : ""} tone={card.tone || "slate"}
            active={card.view ? activeView === card.view : false} onClick={card.view || card.href ? () => onCardClick(card) : undefined}
            editing={editing} onEdit={() => setEditing(true)} onRemove={() => onChange(cards.filter((k) => k !== card.key))} onMove={(step) => move(card.key, step)}
            first={i === 0} last={i === shown.length - 1} />
        ))}
        {editing ? <AddCard hidden={hidden} onAdd={(key) => onChange([...cards, key])} /> : null}
        {!shown.length && !editing ? <button type="button" onClick={() => setEditing(true)} className="rounded-[14px] border-2 border-dashed border-slate-300 py-6 text-[13px] font-semibold text-slate-500">+ Add cards</button> : null}
      </div>
    </div>
  );
}
