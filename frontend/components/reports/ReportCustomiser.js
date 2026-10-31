"use client";

import { useState } from "react";

const ICON_BTN = "grid h-6 w-6 place-items-center rounded-[6px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent";

function Arrows({ onUp, onDown, first, last, name }) {
  return (
    <span className="flex">
      <button type="button" disabled={first} onClick={onUp} aria-label={`Move ${name} up`} className={ICON_BTN}>
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 19V5m-6 6 6-6 6 6" /></svg>
      </button>
      <button type="button" disabled={last} onClick={onDown} aria-label={`Move ${name} down`} className={ICON_BTN}>
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14m-6-6 6 6 6-6" /></svg>
      </button>
    </span>
  );
}

/**
 * Pick sheets, the columns on each and their order, plus per-sheet options like grouping.
 * Only the ticked columns are written to the Excel file. The choice is saved on this device.
 */
export default function ReportCustomiser({ report, compact = false }) {
  const { catalog, layout, ops, presets, presetKey, columnCount, error } = report;
  const [open, setOpen] = useState(null);
  if (error) return <p className="rounded-[10px] bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</p>;
  if (!catalog || !layout) return <div className="h-40 animate-pulse rounded-[12px] bg-slate-100" />;
  const ordered = [...layout.sheets, ...catalog.map((s) => s.key).filter((k) => !layout.sheets.includes(k))];

  return (
    <div className="tw-buttons">
      {presets.length ? (
        <div className="mb-3">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Ready-made</p>
          <div className={`grid gap-2 ${compact ? "grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
            {presets.map((preset) => (
              <button key={preset.key} type="button" onClick={() => ops.applyPreset(preset)}
                className={`rounded-[10px] px-3 py-2 text-left ring-1 transition ${presetKey === preset.key ? "bg-brand-50 ring-brand-300" : "bg-white ring-slate-200 hover:ring-brand-200"}`}>
                <span className="block text-[13px] font-semibold text-slate-900">{preset.label}</span>
                <span className="block text-[11.5px] leading-snug text-slate-500">{preset.description}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sheets & columns</p>
        <p className="text-[12px] text-slate-500"><b className="text-slate-900">{layout.sheets.length}</b> sheets · <b className="text-slate-900">{columnCount}</b> columns</p>
      </div>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-[12px] ring-1 ring-slate-200">
        {ordered.map((key) => {
          const sheet = catalog.find((s) => s.key === key);
          const included = layout.sheets.includes(key);
          const position = layout.sheets.indexOf(key);
          const chosen = layout.columns[key] || [];
          const rest = sheet.columns.filter((c) => !chosen.includes(c.key));
          const configurable = sheet.columns.length > 0 || (sheet.options || []).length > 0;
          const expanded = open === key && included && configurable;
          return (
            <li key={key} className={included ? "bg-white" : "bg-slate-50/70"}>
              <div className="flex items-center gap-3 px-3 py-2.5">
                <input type="checkbox" checked={included} disabled={included && layout.sheets.length === 1} onChange={() => ops.toggleSheet(key)}
                  aria-label={`Include ${sheet.label}`} className="h-4 w-4 shrink-0 cursor-pointer accent-[#0c605d]" />
                <button type="button" disabled={!included || !configurable} onClick={() => setOpen(expanded ? null : key)} className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-default">
                  <span className="min-w-0">
                    <span className={`block text-[13.5px] font-semibold ${included ? "text-slate-900" : "text-slate-400"}`}>{sheet.label}</span>
                    <span className="block truncate text-[11.5px] text-slate-500">
                      {!included ? "Not included" : sheet.columns.length ? `${chosen.length} of ${sheet.columns.length} columns · ${sheet.description}` : sheet.description}
                    </span>
                  </span>
                  {included && configurable ? (
                    <span className="ml-auto flex shrink-0 items-center gap-1 rounded-[8px] px-2 py-1 text-[12px] font-semibold text-brand-700 hover:bg-brand-50">
                      {expanded ? "Done" : "Choose columns"}
                      <svg className={`h-3.5 w-3.5 transition ${expanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m6 9 6 6 6-6" /></svg>
                    </span>
                  ) : null}
                </button>
                {included && layout.sheets.length > 1 ? (
                  <Arrows name={sheet.label} first={position === 0} last={position === layout.sheets.length - 1} onUp={() => ops.moveSheet(key, -1)} onDown={() => ops.moveSheet(key, 1)} />
                ) : null}
              </div>

              {expanded ? (
                <div className="space-y-3 border-t border-slate-100 bg-slate-50/70 px-3 pb-3 pt-2.5 sm:pl-10">
                  {(sheet.options || []).map((option) => (
                    <label key={option.key} className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-slate-600">
                      {option.label}
                      <select value={layout.options[key]?.[option.key]} onChange={(e) => ops.setOption(key, option.key, e.target.value)}
                        className="h-8 rounded-[8px] border border-slate-200 bg-white px-2 text-[12.5px] font-medium text-slate-800 outline-none focus:border-brand-400">
                        {option.choices.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                      </select>
                    </label>
                  ))}
                  {sheet.columns.length ? (
                    <>
                      <div className="flex gap-3 text-[12px] font-semibold">
                        <button type="button" onClick={() => ops.setAll(key, true)} className="text-brand-700 hover:underline">Select all</button>
                        <button type="button" onClick={() => ops.setAll(key, false)} className="text-slate-500 hover:underline">Keep only first</button>
                      </div>
                      <ol className="grid gap-1 sm:grid-cols-2">
                        {chosen.map((columnKey, index) => {
                          const column = sheet.columns.find((c) => c.key === columnKey);
                          return (
                            <li key={columnKey} className="flex items-center gap-2 rounded-[8px] bg-white px-2.5 py-1.5 ring-1 ring-slate-200">
                              <span className="w-5 text-[11px] tabular-nums text-slate-400">{index + 1}</span>
                              <input type="checkbox" checked disabled={chosen.length === 1} onChange={() => ops.toggleColumn(key, columnKey)}
                                aria-label={`Remove ${column.label}`} className="h-4 w-4 shrink-0 cursor-pointer accent-[#0c605d]" />
                              <span className="min-w-0 flex-1 truncate text-[13px] text-slate-800">{column.label}</span>
                              <Arrows name={column.label} first={index === 0} last={index === chosen.length - 1} onUp={() => ops.moveColumn(key, columnKey, -1)} onDown={() => ops.moveColumn(key, columnKey, 1)} />
                            </li>
                          );
                        })}
                      </ol>
                      {rest.length ? (
                        <div>
                          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Add more columns</p>
                          <div className="flex flex-wrap gap-1.5">
                            {rest.map((column) => (
                              <button key={column.key} type="button" onClick={() => ops.toggleColumn(key, column.key)}
                                className="rounded-[8px] bg-white px-2.5 py-1 text-[12px] font-medium text-slate-600 outline-1 outline-dashed outline-slate-300 transition hover:text-brand-700 hover:outline-brand-600">
                                + {column.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
