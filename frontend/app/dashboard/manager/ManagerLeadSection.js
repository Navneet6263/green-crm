"use client";

import Link from "next/link";
import LeadQuickStatusControl from "../../../components/leads/LeadQuickStatusControl";
import { money, when, titleize, initials, STATUS_TONE } from "./manager-utils";

const SOURCE_COLORS = ["bg-violet-400","bg-sky-400","bg-emerald-400","bg-amber-400","bg-rose-400"];

function GlassPanel({ title, sub, linkHref, linkLabel, children }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between border-b border-slate-100/80 px-5 py-4">
        <div>
          <p className="text-sm font-bold text-slate-800">{title}</p>
          {sub ? <p className="mt-0.5 text-xs text-slate-400">{sub}</p> : null}
        </div>
        {linkHref ? (
          <Link href={linkHref} prefetch={false} className="text-xs font-semibold text-violet-500 hover:underline">
            {linkLabel} →
          </Link>
        ) : null}
      </div>
      <div className="px-5">{children}</div>
    </div>
  );
}

function LeadRow({ lead, session, refresh }) {
  const tone = STATUS_TONE[lead.status] || "bg-slate-100 text-slate-500";
  return (
    <div className="flex items-center gap-3 border-b border-slate-100/80 py-3 last:border-0">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-800 text-xs font-black text-white">
        {initials(lead.company_name)}
      </span>
      <div className="min-w-0 flex-1">
        <Link href={`/leads/${lead.lead_id}`} prefetch={false}
          className="block truncate text-sm font-medium text-slate-700 hover:text-violet-600">
          {lead.company_name || "Unnamed lead"}
        </Link>
        <p className="truncate text-xs text-slate-400">{lead.contact_person || "—"} · {when(lead.created_at)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className={`rounded-lg px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}>
          {titleize(lead.status || "new")}
        </span>
        <p className="text-xs font-bold text-emerald-500">{money(lead.estimated_value)}</p>
      </div>
      <LeadQuickStatusControl lead={lead} token={session?.token} onUpdated={() => refresh?.()} />
    </div>
  );
}

export default function ManagerLeadSection({ leads, focusSources, session, refresh }) {
  const sourceTotal = focusSources.reduce((s, x) => s + Number(x.total || 0), 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
      <GlassPanel title="Recent Leads" sub="Latest team activity" linkHref="/leads" linkLabel="View all">
        {leads.length
          ? leads.map((lead) => <LeadRow key={lead.lead_id} lead={lead} session={session} refresh={refresh} />)
          : <p className="py-6 text-center text-sm text-slate-400">No leads loaded yet.</p>}
      </GlassPanel>

      <GlassPanel title="Lead Sources" sub="Acquisition mix">
        <div className="space-y-4 py-4">
          {focusSources.length ? focusSources.map((item, i) => {
            const pct = sourceTotal ? Math.round((Number(item.total || 0) / sourceTotal) * 100) : 0;
            return (
              <div key={item.lead_source || i}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">{titleize(item.lead_source || "Unknown")}</span>
                  <span className="font-bold text-slate-800">{item.total} <span className="font-normal text-slate-400">({pct}%)</span></span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${SOURCE_COLORS[i % SOURCE_COLORS.length]} transition-all duration-500`}
                    style={{ width: `${Math.max(4, pct)}%` }} />
                </div>
              </div>
            );
          }) : <p className="py-6 text-center text-sm text-slate-400">No source data yet.</p>}
        </div>
      </GlassPanel>
    </div>
  );
}
