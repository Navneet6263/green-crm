"use client";

const STAGE_COLORS = {
  new: "#7C3AED",
  contacted: "#6D28D9",
  qualified: "#3B82F6",
  proposal: "#14B8A6",
  negotiation: "#F59E0B",
  "booked-demo": "#EF4444",
  "demo-done": "#8B5CF6",
  "trial-started": "#8B5CF6",
  "closed-won": "#22C55E",
};

export default function StageFunnelChart({ data = [] }) {
  if (!data.length) {
    return <div className="flex h-[220px] items-center justify-center text-sm text-slate-300">No data yet</div>;
  }

  const W = 600;
  const H = 240;
  const PAD_TOP = 20;
  const PAD_BOTTOM = 44;
  const PAD_LEFT = 44;
  const PAD_RIGHT = 16;
  const innerW = W - PAD_LEFT - PAD_RIGHT;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  const values = data.map((d) => Number(d.value || 0));
  const maxV = Math.max(...values, 1);

  // Y axis ticks: 0, 175, 350, 525, 700 style (4 equal divisions)
  const yTicks = [0, Math.round(maxV * 0.25), Math.round(maxV * 0.5), Math.round(maxV * 0.75), maxV];

  // Each bar slot width
  const slotW = innerW / data.length;
  // Bar width = 55% of slot, centered
  const barW = Math.max(14, Math.min(48, slotW * 0.55));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 240 }}>
      {/* Y grid lines */}
      {yTicks.map((tick, i) => {
        const y = PAD_TOP + innerH - (tick / maxV) * innerH;
        return (
          <g key={i}>
            <line
              x1={PAD_LEFT} y1={y}
              x2={PAD_LEFT + innerW} y2={y}
              stroke="#F1F5F9" strokeWidth="1"
            />
            <text x={PAD_LEFT - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94A3B8">
              {tick}
            </text>
          </g>
        );
      })}

      {/* Bars - centered in each slot */}
      {data.map((d, i) => {
        const val = Number(d.value || 0);
        const barH = Math.max(val > 0 ? 4 : 0, (val / maxV) * innerH);
        const slotX = PAD_LEFT + i * slotW;
        const barX = slotX + (slotW - barW) / 2;
        const barY = PAD_TOP + innerH - barH;
        const key = String(d.label || "").toLowerCase().replace(/\s+/g, "-");
        const color = d.color || STAGE_COLORS[key] || "#7C3AED";

        return (
          <g key={i}>
            <rect
              x={barX} y={barY}
              width={barW} height={barH}
              rx="8" fill={color}
            />
            <text
              x={slotX + slotW / 2}
              y={PAD_TOP + innerH + 18}
              textAnchor="middle"
              fontSize="9"
              fill="#94A3B8"
            >
              {d.label?.slice(0, 8)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
