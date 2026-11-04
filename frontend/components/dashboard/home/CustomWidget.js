"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "../../../lib/api";
import { getLeadStatusLabel } from "../../../lib/leadStatus";
import { BarList, ColumnChart, WidgetFrame } from "./charts";
import { SourceMark, brandFor } from "./sourceBrands";
import { CHART_DIMENSIONS, CHART_MEASURES, PALETTE, count, fmtMonth, money, periodLink, titleize } from "./widgetCatalog";

const nameFor = (dimension, name) => {
  if (dimension === "source") return brandFor(name).label;
  if (dimension === "status") return getLeadStatusLabel(name);
  if (dimension === "month") return fmtMonth(name);
  if (["priority", "industry"].includes(dimension)) return titleize(name);
  return name;
};

// Clicking a row opens the matching leads, where the lead list has that filter.
const LINK_PARAM = { source: "lead_source", status: "status", priority: "priority" };

/** One chart the person built: a grouping and a measure, drawn as bars, columns or a table. */
export default function CustomWidget({ token, item, range, query, seed }) {
  const { title, dimension, measure, chart = "bars", color = 1 } = item.custom || {};
  const [state, setState] = useState(null);
  const isMoney = CHART_MEASURES.find(([key]) => key === measure)?.[2] === "money";
  const fmt = isMoney ? money : count;
  const hue = PALETTE[color] || PALETTE[1];
  const measureName = CHART_MEASURES.find(([key]) => key === measure)?.[1] || "Value";
  const dimensionName = CHART_DIMENSIONS.find(([key]) => key === dimension)?.[1] || "Group";

  useEffect(() => {
    if (!token || !dimension || !measure) return undefined;
    let cancelled = false;
    setState(null);
    apiRequest(`/dashboard/custom?${new URLSearchParams({ ...query, dimension, measure })}`, { token, fresh: true })
      .then((res) => { if (!cancelled) setState({ data: res?.rows || [] }); })
      .catch((err) => { if (!cancelled) setState({ error: err.message || "This chart could not load." }); });
    return () => { cancelled = true; };
  }, [token, query, dimension, measure, seed]);

  const rows = (state?.data || []).filter((r) => r.value || dimension === "month");
  const total = rows.reduce((s, r) => s + r.value, 0);
  const param = LINK_PARAM[dimension];
  let body = null;
  if (chart === "columns") {
    body = <ColumnChart points={rows.map((r) => ({ key: r.name, label: nameFor(dimension, r.name), value: r.value }))} valueLabel={measureName} color={hue} format={fmt} />;
  } else if (chart === "table") {
    body = rows.length ? (
      <div className="-mx-4 -mb-4 max-h-[320px] overflow-y-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="sticky top-0 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <tr><th className="px-4 py-2">{dimensionName}</th><th className="px-2 py-2 text-right">{measureName}</th><th className="px-4 py-2 text-right">Share</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-slate-100">
                <td className="px-4 py-1.5 font-medium text-slate-800">{param ? <Link href={`/leads?${new URLSearchParams({ [param]: r.name, ...periodLink(range) })}`} prefetch={false} className="hover:text-brand-700">{nameFor(dimension, r.name)}</Link> : nameFor(dimension, r.name)}</td>
                <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-slate-900">{fmt(r.value)}</td>
                <td className="px-4 py-1.5 text-right tabular-nums text-slate-500">{total ? `${Math.round((r.value / total) * 100)}%` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : null;
  } else {
    const top = rows.slice(0, 12);
    body = (
      <>
        <BarList color={hue} valueLabel={(i) => fmt(i.value)} extra={(i) => (total ? `${Math.round((i.value / total) * 100)}%` : "")}
          items={top.map((r) => ({ key: r.name, label: nameFor(dimension, r.name), value: r.value, solid: true, ...(dimension === "source" ? { icon: <SourceMark name={r.name} />, color: brandFor(r.name).color } : {}) }))}
          hrefFor={param ? (i) => `/leads?${new URLSearchParams({ [param]: i.key, ...periodLink(range) })}` : undefined} />
        {rows.length > top.length ? <p className="mt-2 text-[12px] text-slate-500">+{rows.length - top.length} more · switch to Table to see all</p> : null}
      </>
    );
  }

  return (
    <WidgetFrame title={title || `${measureName} by ${dimensionName.toLowerCase()}`} accent={hue} loading={!state} error={state?.error}
      subtitle={`${measureName} by ${dimensionName.toLowerCase()} · total ${fmt(total)} · your own chart`}>
      {rows.length ? body : <p className="py-6 text-center text-[13px] text-slate-400">Nothing to show for this period.</p>}
    </WidgetFrame>
  );
}
