"use client";

import SourceBrandIcon from "./SourceBrandIcon";
import { compact, titleize } from "./manager-utils";
import { ChartCard } from "./ManagerDashboardPrimitives";

const SOURCE_COLORS = {
  instagram: "#EC4899",
  facebook: "#3B82F6",
  google: "#22C55E",
  linkedin: "#0A66C2",
  website: "#F97316",
};

const SOURCE_LABELS = {
  instagram: "Instagram",
  facebook: "Facebook",
  google: "Google",
  linkedin: "LinkedIn",
  website: "Website",
};

export default function ManagerLeadSources({ sourceMix }) {
  const total = sourceMix.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const sources = [...sourceMix].sort((a, b) => Number(b.total) - Number(a.total)).slice(0, 5);

  return (
    <ChartCard>
      <h2 className="mb-4 text-lg font-bold text-slate-900">Lead Sources</h2>
      <div className="space-y-3">
        {sources.length ? sources.map((item, index) => {
          const key = String(item.lead_source || "").toLowerCase();
          const pct = total ? Math.round((Number(item.total) / total) * 100) : 0;
          return (
            <div key={item.lead_source || index} className="flex items-center gap-3 text-sm">
              <span className="shrink-0"><SourceBrandIcon source={key} /></span>
              <span className="w-[82px] shrink-0 font-medium text-slate-700">
                {SOURCE_LABELS[key] || titleize(item.lead_source || "Unknown")}
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${Math.max(pct > 0 ? 3 : 0, pct)}%`, background: SOURCE_COLORS[key] || "#6366F1" }} />
              </div>
              <span className="w-10 text-right font-bold text-slate-900">{compact(item.total)}</span>
              <span className="w-8 text-right font-medium text-slate-400">{pct}%</span>
            </div>
          );
        }) : <p className="text-sm text-slate-400">No source data yet.</p>}
      </div>
    </ChartCard>
  );
}
