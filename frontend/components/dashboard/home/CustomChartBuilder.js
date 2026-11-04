"use client";

import { useState } from "react";
import { CHART_DIMENSIONS, CHART_IDEAS, CHART_MEASURES, CHART_TYPES, PALETTE, PALETTE_NAMES } from "./widgetCatalog";

const NO_MONEY = ["support", "viewer", "legal-team"];
const FIELD = "h-9 w-full rounded-[8px] border border-slate-200 bg-white px-2 text-[13px] text-slate-800 outline-none focus:border-brand-400";

/** Which groupings and measures this role may chart (the server checks the same). */
export function chartOptionsFor(role) {
  return {
    dimensions: CHART_DIMENSIONS.filter(([, , roles]) => !roles || roles.includes(role)),
    measures: CHART_MEASURES.filter(([, , kind]) => kind !== "money" || !NO_MONEY.includes(role)),
  };
}

export const ideasFor = (role) => {
  const { dimensions, measures } = chartOptionsFor(role);
  return CHART_IDEAS.filter((idea) => dimensions.some(([k]) => k === idea.dimension) && measures.some(([k]) => k === idea.measure));
};

/** Form for a person's own chart: what to group by, what to count, how to draw it. */
export default function CustomChartBuilder({ role, initial, onSave, onCancel }) {
  const { dimensions, measures } = chartOptionsFor(role);
  const [form, setForm] = useState({ title: "", dimension: "city", measure: "count", chart: "bars", color: 1, ...initial });
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const autoTitle = `${measures.find(([k]) => k === form.measure)?.[1] || ""} by ${(dimensions.find(([k]) => k === form.dimension)?.[1] || "").toLowerCase()}`;

  return (
    <form className="space-y-2.5 rounded-[12px] bg-white p-3 ring-1 ring-slate-200" onSubmit={(e) => { e.preventDefault(); onSave({ ...form, title: form.title.trim() || autoTitle, color: Number(form.color) }); }}>
      <label className="block text-[12px] font-semibold text-slate-600">Name
        <input value={form.title} onChange={set("title")} placeholder={autoTitle} maxLength={60} className={`${FIELD} mt-1`} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-[12px] font-semibold text-slate-600">Show
          <select value={form.measure} onChange={set("measure")} className={`${FIELD} mt-1`}>
            {measures.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </select>
        </label>
        <label className="block text-[12px] font-semibold text-slate-600">Grouped by
          <select value={form.dimension} onChange={set("dimension")} className={`${FIELD} mt-1`}>
            {dimensions.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </select>
        </label>
      </div>
      <div>
        <p className="text-[12px] font-semibold text-slate-600">Draw as</p>
        <div className="mt-1 flex gap-1" role="group" aria-label="Chart type">
          {CHART_TYPES.map(([key, name]) => (
            <button key={key} type="button" aria-pressed={form.chart === key} onClick={() => setForm((f) => ({ ...f, chart: key }))}
              className={`flex-1 rounded-[8px] py-1.5 text-[12.5px] font-semibold ${form.chart === key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{name}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[12px] font-semibold text-slate-600">Colour</p>
        <div className="mt-1 flex gap-1.5" role="radiogroup" aria-label="Colour">
          {PALETTE.map((hex, i) => (
            <button key={hex} type="button" role="radio" aria-checked={Number(form.color) === i} aria-label={PALETTE_NAMES[i]} title={PALETTE_NAMES[i]} onClick={() => setForm((f) => ({ ...f, color: i }))}
              className={`h-7 w-7 rounded-full ring-offset-2 ${Number(form.color) === i ? "ring-2 ring-slate-900" : ""}`} style={{ background: hex }} />
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel ? <button type="button" onClick={onCancel} className="rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-100">Cancel</button> : null}
        <button type="submit" className="rounded-[8px] bg-brand-700 px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-brand-800">{initial?.dimension ? "Save chart" : "Add to dashboard"}</button>
      </div>
    </form>
  );
}
