"use client";

export default function AdminChartTooltip({ active, label, payload, valuePrefix = "" }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-[20px] border border-white/80 bg-white/95 px-3 py-2 shadow-[0_18px_40px_rgba(33,48,74,0.16)] backdrop-blur-xl">
      <p className="text-xs font-semibold text-[#0f172a]">{label}</p>
      {payload.map((item) => (
        <p key={`${item.dataKey}-${item.color}`} className="mt-1 text-xs text-[#64748b]">
          <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: item.color }} />
          {item.name || "Value"}: {valuePrefix}{Number(item.value || 0).toLocaleString("en-IN")}
        </p>
      ))}
    </div>
  );
}
