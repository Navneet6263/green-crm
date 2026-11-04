"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_CARDS } from "./leadWorkspaceConfig";

/** Lets each person choose which cards show on the Leads page, and their order. */
export default function LeadCardMenu({ cards, onChange, available }) {
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

  const toggle = (key) => onChange(cards.includes(key) ? cards.filter((k) => k !== key) : [...cards, key]);
  const move = (key, step) => {
    const i = cards.indexOf(key);
    const j = i + step;
    if (j < 0 || j >= cards.length) return;
    const next = [...cards];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const groups = [...new Set(available.map((card) => card.group))];

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-white px-3 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M17.5 14v7M14 17.5h7" /></svg>
        Customize
      </button>
      {open ? (
        <div className="absolute left-0 z-30 mt-1.5 w-[300px] rounded-[12px] bg-white p-2 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-200 sm:left-auto sm:right-0">
          <div className="flex items-center justify-between px-2 pb-1 pt-1">
            <p className="text-[13px] font-bold text-slate-900">Choose your cards</p>
            <button type="button" onClick={() => onChange(DEFAULT_CARDS)} className="text-[12px] font-semibold text-brand-700 hover:underline">Reset</button>
          </div>
          <p className="px-2 pb-1.5 text-[11.5px] text-slate-500">Tick what you want to see. Your choice is saved for you on this device.</p>
          <div className="max-h-[380px] space-y-2 overflow-y-auto">
            {groups.map((group) => (
              <div key={group}>
                <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{group}</p>
                <ul>
                  {available.filter((card) => card.group === group).map((card) => {
                    const on = cards.includes(card.key);
                    return (
                      <li key={card.key} className="flex items-center gap-1 rounded-[8px] px-2 py-1 hover:bg-slate-50">
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-[13px] text-slate-700">
                          <input type="checkbox" checked={on} onChange={() => toggle(card.key)} className="h-4 w-4 accent-[#0c605d]" />
                          <span className="truncate">{card.label}</span>
                        </label>
                        {on ? (
                          <span className="flex">
                            <button type="button" onClick={() => move(card.key, -1)} aria-label={`Move ${card.label} earlier`} className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700">←</button>
                            <button type="button" onClick={() => move(card.key, 1)} aria-label={`Move ${card.label} later`} className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700">→</button>
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
