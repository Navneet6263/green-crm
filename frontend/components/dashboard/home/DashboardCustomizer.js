"use client";

import { useEffect, useState } from "react";
import CustomChartBuilder, { ideasFor } from "./CustomChartBuilder";
import { PALETTE } from "./widgetCatalog";

const ICON_BTN = "grid h-7 w-7 place-items-center rounded-[6px] text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30";

/** Side panel to choose dashboard widgets, their order and width, and to build charts. Saved for this person on this device. */
export default function DashboardCustomizer({ open, onClose, role, available, layout, onChange, onReset, onAddChart, onUpdateChart, editing, setEditing }) {
  const [building, setBuilding] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  useEffect(() => { if (!open) setBuilding(false); }, [open]);
  if (!open) return null;

  const describe = (item) => {
    const widget = available.find((w) => w.key === item.key);
    if (widget) return widget;
    return item.custom ? { title: item.custom.title, description: "Your own chart", color: PALETTE[item.custom.color] } : null;
  };
  const shown = layout.map((item) => ({ ...item, widget: describe(item) })).filter((item) => item.widget);
  const hidden = available.filter((w) => !layout.some((item) => item.key === w.key));
  const ideas = ideasFor(role).filter((idea) => !layout.some((item) => item.custom?.title === idea.title));
  const move = (index, step) => {
    const j = index + step;
    if (j < 0 || j >= layout.length) return;
    const next = [...layout];
    [next[index], next[j]] = [next[j], next[index]];
    onChange(next);
  };
  const section = "mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <aside role="dialog" aria-label="Customize dashboard" className="tw-buttons fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col bg-[#f7f8f6] shadow-[-24px_0_60px_-30px_rgba(15,23,42,0.45)]">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-slate-900">Customize dashboard</h2>
            <p className="text-[12.5px] text-slate-500">Remove what you don&apos;t need, add what you do, or build your own chart. Saved for you on this device.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-[8px] text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <section>
            <div className="flex items-center justify-between">
              <p className={section}>Build your own chart</p>
              {!building && !editing ? <button type="button" onClick={() => setBuilding(true)} className="mb-1.5 text-[12.5px] font-semibold text-brand-700 hover:underline">+ New chart</button> : null}
            </div>
            {building ? <CustomChartBuilder role={role} onCancel={() => setBuilding(false)} onSave={(chart) => { onAddChart(chart); setBuilding(false); }} /> : null}
            {editing ? (
              <CustomChartBuilder key={editing} role={role} initial={layout.find((item) => item.key === editing)?.custom}
                onCancel={() => setEditing(null)} onSave={(chart) => { onUpdateChart(editing, chart); setEditing(null); }} />
            ) : null}
            {!building && !editing && ideas.length ? (
              <div className="flex flex-wrap gap-1.5">
                {ideas.map((idea) => (
                  <button key={idea.title} type="button" onClick={() => onAddChart(idea)} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 ring-1 ring-slate-200 hover:ring-slate-400">
                    <span className="h-2 w-2 rounded-full" style={{ background: PALETTE[idea.color] }} />{idea.title}
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section>
            <p className={section}>On your dashboard</p>
            <ol className="space-y-1.5">
              {shown.map((item, index) => (
                <li key={item.key} className="flex items-center gap-2 rounded-[10px] bg-white px-3 py-2 ring-1 ring-slate-200">
                  {item.widget.color ? <span className="h-6 w-1 shrink-0 rounded-full" style={{ background: item.widget.color }} /> : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-slate-900">{item.widget.title}</span>
                    <span className="block truncate text-[11.5px] text-slate-500">{item.widget.description}</span>
                  </span>
                  {item.custom ? <button type="button" onClick={() => { setBuilding(false); setEditing(item.key); }} className="rounded-[6px] px-1.5 py-1 text-[12px] font-semibold text-brand-700 hover:bg-slate-100">Edit</button> : null}
                  {item.key !== "kpis" ? (
                    <select aria-label={`${item.widget.title} width`} value={item.size} onChange={(e) => onChange(layout.map((l) => (l.key === item.key ? { ...l, size: e.target.value } : l)))}
                      className="h-8 rounded-[8px] border border-slate-200 bg-white px-1 text-[12px] text-slate-700">
                      <option value="half">Half</option>
                      <option value="full">Full</option>
                    </select>
                  ) : null}
                  <span className="flex">
                    <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${item.widget.title} up`} className={ICON_BTN}>↑</button>
                    <button type="button" disabled={index === shown.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${item.widget.title} down`} className={ICON_BTN}>↓</button>
                  </span>
                  <button type="button" onClick={() => onChange(layout.filter((l) => l.key !== item.key))} aria-label={`Remove ${item.widget.title}`} className="grid h-7 w-7 place-items-center rounded-[6px] text-slate-400 hover:bg-rose-50 hover:text-rose-600">×</button>
                </li>
              ))}
            </ol>
          </section>

          {hidden.length ? (
            <section>
              <p className={section}>Add back</p>
              <ul className="space-y-1.5">
                {hidden.map((w) => (
                  <li key={w.key}>
                    <button type="button" onClick={() => onChange([...layout, { key: w.key, size: w.size }])} className="flex w-full items-center gap-2 rounded-[10px] bg-white px-3 py-2 text-left ring-1 ring-slate-200 hover:ring-brand-300">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-[15px] font-bold text-brand-700">+</span>
                      <span className="min-w-0"><span className="block text-[13.5px] font-semibold text-slate-900">{w.title}</span><span className="block truncate text-[11.5px] text-slate-500">{w.description}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
        <footer className="flex justify-between gap-2 border-t border-slate-200 bg-white px-5 py-3">
          <button type="button" onClick={onReset} className="rounded-[10px] px-3 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-100">Reset to default</button>
          <button type="button" onClick={onClose} className="rounded-[10px] bg-brand-700 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-800">Done</button>
        </footer>
      </aside>
    </>
  );
}
