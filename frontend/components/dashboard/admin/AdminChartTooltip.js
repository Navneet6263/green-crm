"use client";

export default function AdminChartTooltip({ active, label, payload, valuePrefix = "" }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">{label}</p>
      {payload.map((item) => (
        <p key={`${item.dataKey}-${item.color}`} className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          {item.name || "Value"}: {valuePrefix}{Number(item.value || 0).toLocaleString("en-IN")}
        </p>
      ))}
    </div>
  );
}
