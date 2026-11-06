"use client";

import Link from "next/link";
import UsageChart from "./UsageChart";
import { D, KIND_COLORS, StatusBadge, ago, apiRoot, CopyField, fmt } from "./dev-ui";

function Kpi({ label, value, hint, accent }) {
  return (
    <div className={`${D.panel} p-4`}>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
        <p className="text-[12px] font-semibold text-slate-500">{label}</p>
      </div>
      <p className="mt-2 text-[20px] font-bold leading-none tracking-tight text-slate-900 sm:text-[24px]">{value}</p>
      <p className="mt-1.5 text-[12px] text-slate-500">{hint}</p>
    </div>
  );
}

function Step({ n, done, title, text, action }) {
  return (
    <li className="flex gap-3">
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold ${done ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"}`}>{done ? "✓" : n}</span>
      <div className="min-w-0 flex-1 pb-1">
        <p className="text-[13.5px] font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-[12.5px] text-slate-500">{text}</p>
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </li>
  );
}

export default function OverviewTab({ overview, links, keys, onGo, onNewLink }) {
  const usage = overview?.usage || { days: [], totals: {} };
  const t = usage.totals || {};
  const all = (t.api || 0) + (t.capture || 0);
  const failRate = all ? Math.round(((t.failed || 0) / all) * 100) : 0;
  const hasLead = links.some((l) => l.lead_count > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Leads received" value={fmt(t.leads)} hint={`Last 14 days · ${overview?.links?.active || 0} active lead links`} accent={KIND_COLORS.capture} />
        <Kpi label="API calls" value={fmt(t.api)} hint={`Last 14 days · ${overview?.keys?.active || 0} active keys`} accent={KIND_COLORS.api} />
        <Kpi label="Failed requests" value={fmt(t.failed)} hint={all ? `${failRate}% of ${fmt(all)} requests` : "Nothing received yet"} accent="#d9467c" />
        <Kpi label="Webhook calls" value={fmt(overview?.webhooks?.sent_7d)} hint={`Last 7 days · ${fmt(overview?.webhooks?.failed_7d)} failed · avg answer ${t.avg_ms ? `${fmt(t.avg_ms)} ms` : "–"}`} accent="#b98300" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className={`${D.panel} p-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[14px] font-bold text-slate-900">Requests per day</p>
              <p className="text-[12px] text-slate-500">Everything your links and keys received in the last 14 days</p>
            </div>
            <button type="button" className={D.small} onClick={() => onGo("activity")}>Open activity</button>
          </div>
          <div className="mt-3"><UsageChart days={usage.days} /></div>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
            {[["Lead link posts", t.capture, KIND_COLORS.capture], ["API calls", t.api, KIND_COLORS.api], ["Leads received", t.leads, "#b98300"]].map(([label, value, color]) => (
              <div key={label} className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-[11.5px] text-slate-500"><span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: color }} />{label}</p>
                <p className="mt-0.5 text-[16px] font-bold text-slate-900">{fmt(value)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`${D.panel} p-4`}>
          <p className="text-[14px] font-bold text-slate-900">Get started</p>
          <ol className="mt-3 space-y-3">
            <Step n={1} done={links.length > 0} title="Make a lead link" text="Pick the product and who gets the leads. Each link gives you a secret address."
              action={links.length ? null : <button type="button" className={D.primary} onClick={onNewLink}>New lead link</button>} />
            <Step n={2} done={hasLead} title="Connect your form or ads" text="Paste the ready code on your website, or put the link in Zapier, Pabbly, Make, Google Ads or IndiaMART."
              action={links.length && !hasLead ? <button type="button" className={D.small} onClick={() => onGo("links")}>See set-up steps</button> : null} />
            <Step n={3} done={keys.some((k) => k.request_count > 0)} title="Build with the API (optional)" text="Your developer can read and create leads with an API key."
              action={<button type="button" className={D.small} onClick={() => onGo("guide")}>Open the API guide</button>} />
            <Step n={4} done={(overview?.webhooks?.total || 0) > 0} title="Get updates in your app (optional)" text="A webhook tells your other software the moment a lead changes."
              action={overview?.webhooks?.total ? null : <button type="button" className={D.small} onClick={() => onGo("webhooks")}>Set up a webhook</button>} />
          </ol>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className={D.kicker}>Your limits</p>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {[["Per key / minute", overview?.limits?.per_minute], ["Company / day", overview?.limits?.per_day], ["Leads per call", overview?.limits?.page_size]].map(([label, value]) => (
                <div key={label} className="rounded-[10px] bg-slate-50 px-2.5 py-2 ring-1 ring-slate-100"><p className="truncate text-[10.5px] text-slate-500">{label}</p><p className="text-[14px] font-bold text-slate-900">{value ? fmt(value) : "–"}</p></div>
              ))}
            </div>
            <p className={`${D.kicker} mt-3`}>API address</p>
            <div className="mt-1.5"><CopyField value={apiRoot()} /></div>
          </div>
        </section>
      </div>

      <section className={`${D.panel} overflow-hidden`}>
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <p className="text-[14px] font-bold text-slate-900">Latest requests</p>
          <button type="button" className={D.small} onClick={() => onGo("activity")}>See all</button>
        </div>
        {overview?.recent?.length ? (
          <ul className="divide-y divide-slate-100 border-t border-slate-100">
            {overview.recent.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-[12.5px]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: KIND_COLORS[row.kind] }} />
                <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{row.source_name || (row.kind === "api" ? "API" : "Lead link")}<span className="ml-2 font-normal text-slate-500">{row.message || `${row.method} ${row.path}`}</span></span>
                {row.lead_id ? <Link href={`/leads/${row.lead_id}`} className="font-semibold text-brand-700 hover:underline">Open lead</Link> : null}
                <StatusBadge status={row.status} />
                <span className="w-[76px] text-right text-slate-400">{ago(row.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-t border-slate-100 px-4 py-8 text-center text-[13px] text-slate-500">No requests yet. They show up here the moment a form or app sends something.</p>
        )}
      </section>
    </div>
  );
}
