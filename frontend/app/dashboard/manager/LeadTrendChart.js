"use client";

export default function LeadTrendChart({ data = [], color = "#F59E0B" }) {
  if (!data.length) {
    return <div className="flex h-[185px] items-center justify-center text-sm text-slate-300">No trend data yet</div>;
  }

  const W = 620, H = 200, PAD = { top: 16, right: 16, bottom: 36, left: 48 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const values = data.map((d) => Number(d.value || 0));
  const labels = data.map((d) => d.label || "");
  const maxV = Math.max(...values, 1);

  const xStep = innerW / Math.max(data.length - 1, 1);
  const yScale = (v) => innerH - (v / maxV) * innerH;

  const yTicks = [0, Math.round(maxV * 0.25), Math.round(maxV * 0.5), Math.round(maxV * 0.75), maxV];
  const points = values.map((v, i) => [PAD.left + i * xStep, PAD.top + yScale(v)]);
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${PAD.left.toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;

  // Dashed "by stage" line (flat average)
  const avg = values.reduce((s, v) => s + v, 0) / (values.length || 1);
  const avgY = PAD.top + yScale(avg);
  const stageDashPoints = values.map((_, i) => [PAD.left + i * xStep, PAD.top + yScale(avg * 0.18)]);
  const stageDashPath = stageDashPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }}>
      <defs>
        <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Y grid */}
      {yTicks.map((tick, i) => {
        const y = PAD.top + yScale(tick);
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke="#F1F5F9" strokeWidth="1" />
            <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94A3B8">{tick}</text>
          </g>
        );
      })}

      {/* Area */}
      <path d={areaPath} fill="url(#trendAreaGrad)" />

      {/* Dashed "by stage" line */}
      <path d={stageDashPath} fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="5 4" />
      {stageDashPoints.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="white" stroke="#CBD5E1" strokeWidth="1.5" />
      ))}

      {/* Main line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots + X labels */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="4" fill="white" stroke={color} strokeWidth="2" />
          <text x={p[0]} y={PAD.top + innerH + 18} textAnchor="middle" fontSize="9" fill="#94A3B8">
            {labels[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}
