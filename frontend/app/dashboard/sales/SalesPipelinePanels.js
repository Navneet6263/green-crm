"use client";

import Link from "next/link";
import { T, fmtCompact, fmtCurrency, fmtDate, titleize, initials } from "./sales-tokens";

const STATUS_ORDER = ["new","contacted","qualified","proposal","negotiation","booked-demo","demo-done","trial-started","closed-won"];
const BAR_COLORS = ["bg-sky-400","bg-cyan-400","bg-violet-400","bg-amber-400","bg-orange-400","bg-violet-400","bg-emerald-400","bg-blue-400","bg-emerald-500"];

export function PipelineChart({ leadCounts }) {
  const series = STATUS_ORDER.map((s, i) => {
    const count = Number(leadCounts.find(lc => lc.status === s || (s === "closed-won" && lc.status === "won"))?.total || 0);
    return { label: titleize(s), value: count, color: BAR_COLORS[i] };
  });
  const max = Math.max(...series.map(s => s.value), 1);

  return (
    <div className={`${T.panel} px-5 py-5`}>
      <div className="mb-4">
        <p className={T.K}>Pipeline Stages</p>
        <h3 className="mt-0.5 text-base font-bold text-slate-900">Stage distribution</h3>
      </div>
      <div className="space-y-2.5">
        {series.map(item => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-20 shrink-0 truncate text-xs font-semibold text-slate-500">{item.label}</span>
            <div className="flex-1">
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${item.color} transition-all duration-500`}
                  style={{ width: `${Math.max(4, Math.round((item.value / max) * 100))}%` }} />
              </div>
            </div>
            <span className="w-6 shrink-0 text-right text-xs font-bold text-slate-700">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecentLeadsList({ leads }) {
  return (
    <div className={`${T.panel} px-5 py-5`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className={T.K}>Recent Leads</p>
          <h3 className="mt-0.5 text-base font-bold text-slate-900">Your pipeline</h3>
        </div>
        <Link href="/leads" prefetch={false} className="text-xs font-semibold text-amber-700 hover:text-amber-900">All leads →</Link>
      </div>

      {leads.length ? (
        <div className="space-y-2">
          {leads.slice(0, 6).map(lead => (
            <Link key={lead.lead_id} href={`/leads/${lead.lead_id}`} prefetch={false}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3.5 py-3 transition hover:border-amber-200 hover:bg-amber-50/30">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                {initials(lead.company_name || lead.contact_person)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{lead.company_name || "Unnamed"}</p>
                <p className="truncate text-xs text-slate-400">{lead.contact_person || "—"} · {titleize(lead.status || "new")}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-bold text-slate-700">{fmtCurrency(lead.estimated_value)}</p>
                <p className="text-[10px] text-slate-400">{fmtDate(lead.updated_at || lead.created_at)}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">No leads in your scope yet.</p>
      )}
    </div>
  );
}
