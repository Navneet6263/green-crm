"use client";

import Link from "next/link";
import DashboardIcon from "../../../components/dashboard/icons";

const K = "text-[10px] font-bold uppercase tracking-widest text-slate-400";

const STATUS_PILL = {
  new:"border-sky-200 bg-sky-100 text-sky-700", contacted:"border-emerald-200 bg-emerald-100 text-emerald-700",
  qualified:"border-teal-200 bg-teal-100 text-teal-700", proposal:"border-slate-200 bg-slate-100 text-slate-600",
  negotiation:"border-amber-200 bg-amber-100 text-amber-700", "booked-demo":"border-violet-200 bg-violet-100 text-violet-700",
  "demo-done":"border-emerald-200 bg-emerald-100 text-emerald-700", "trial-started":"border-blue-200 bg-blue-100 text-blue-700",
  "closed-won":"border-emerald-200 bg-emerald-100 text-emerald-700", "closed-lost":"border-rose-200 bg-rose-100 text-rose-700",
};
const PRIORITY_PILL = {
  low:"border-sky-200 bg-sky-100 text-sky-700", medium:"border-amber-200 bg-amber-100 text-amber-700",
  high:"border-rose-200 bg-rose-100 text-rose-700", urgent:"border-rose-300 bg-rose-200 text-rose-900",
};
const AVATAR_PALETTE = ["bg-emerald-600","bg-amber-600","bg-sky-600","bg-violet-600","bg-orange-600","bg-cyan-600","bg-rose-600","bg-blue-600"];

function nice(v) { return String(v||"--").replace(/[-_]+/g," ").replace(/\b\w/g,l=>l.toUpperCase()); }
function initials(c,co,e) { return String(c||co||e||"L").split(" ").filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()||"").join("")||"L"; }
function avBg(name) { return AVATAR_PALETTE[(name?.charCodeAt(0)||0)%AVATAR_PALETTE.length]; }

export function LeadHistoryCard({ lead, formatDate, formatMoney, teamBadgeLabel }) {
  const sPill = STATUS_PILL[String(lead.status||"new").toLowerCase()] || "border-slate-200 bg-slate-100 text-slate-600";
  const pPill = PRIORITY_PILL[String(lead.priority||"medium").toLowerCase()] || "border-amber-200 bg-amber-100 text-amber-700";
  const preview = lead.latest_note || lead.requirements || "No note captured yet.";
  const name = lead.company_name || lead.contact_person || "Unnamed lead";

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {/* shimmer */}
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-500 group-hover:translate-x-full" />

      <div className="relative px-5 py-4">
        {/* Top row */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${avBg(name)} text-sm font-bold text-white`}>
              {initials(lead.contact_person, lead.company_name, lead.email)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="truncate text-sm font-bold text-slate-900">{name}</h3>
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sPill}`}>{nice(lead.status)}</span>
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${pPill}`}>{nice(lead.priority||"medium")}</span>
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{nice(lead.workflow_stage||"sales")}</span>
                {teamBadgeLabel(lead) ? <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">{teamBadgeLabel(lead)}</span> : null}
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-400">
                {lead.contact_person || "—"}{lead.email ? ` · ${lead.email}` : ""}{lead.phone ? ` · ${lead.phone}` : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href={`/leads/${lead.lead_id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-800">
              <DashboardIcon name="message" className="h-3.5 w-3.5" />View
            </Link>
            <Link href={`/leads/${lead.lead_id}/edit`} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100">
              <DashboardIcon name="settings" className="h-3.5 w-3.5" />Edit
            </Link>
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
          <span>Source: <strong className="text-slate-600">{nice(lead.lead_source||"website")}</strong></span>
          <span>Owner: <strong className="text-slate-600">{lead.assigned_to_name||"Unassigned"}</strong></span>
          <span>Value: <strong className="text-slate-600">{formatMoney(lead.estimated_value)}</strong></span>
          <span>Created: <strong className="text-slate-600">{formatDate(lead.created_at)}</strong></span>
          {lead.follow_up_date ? <span className="text-amber-700">Follow-up: <strong>{formatDate(lead.follow_up_date, true)}</strong></span> : null}
        </div>

        {/* Note preview */}
        {preview !== "No note captured yet." ? (
          <p className="mt-2.5 line-clamp-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">{preview}</p>
        ) : null}
      </div>
    </article>
  );
}
