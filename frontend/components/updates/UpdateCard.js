"use client";

import Link from "next/link";
import { KINDS, ago, fmtTime, initials, label } from "./updateUtils";

const AVATAR_TONES = ["bg-brand-100 text-brand-800", "bg-gold-100 text-gold-800", "bg-sky-100 text-sky-800", "bg-violet-100 text-violet-800", "bg-rose-100 text-rose-800", "bg-emerald-100 text-emerald-800"];
export const avatarTone = (id) => AVATAR_TONES[[...String(id || "")].reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATAR_TONES.length];

export function Avatar({ id, name, size = "h-9 w-9 text-xs" }) {
  return <span className={`grid shrink-0 place-items-center rounded-full font-bold ${size} ${avatarTone(id)}`}>{initials(name)}</span>;
}

function Fact({ name, children }) {
  return (
    <span className="inline-flex items-center gap-1 text-[12.5px] text-slate-600">
      <span className="font-semibold text-slate-400">{name}</span>
      <span className="font-medium text-slate-800">{children}</span>
    </span>
  );
}

export default function UpdateCard({ note, showAuthor = true }) {
  const p = note.parsed;
  const kind = KINDS[p.kind];
  const isLead = note.note_type === "lead";
  const href = isLead ? `/leads/${encodeURIComponent(note.entity_id)}` : `/customers/${encodeURIComponent(note.customer_id)}`;
  const company = note.entity_company_name || note.entity_name || (isLead ? "Lead" : "Customer");
  const contact = note.entity_company_name && note.entity_name && note.entity_name !== note.entity_company_name ? note.entity_name : "";

  return (
    <article className="group relative flex gap-3 rounded-[14px] border border-slate-200 bg-white p-3.5 transition hover:border-brand-200 hover:shadow-[0_6px_20px_-12px_rgba(12,96,93,0.35)] sm:p-4">
      {showAuthor ? <Avatar id={note.created_by} name={note.created_by_name} /> : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {showAuthor ? <span className="text-[13.5px] font-semibold text-slate-900">{note.created_by_name || "Unknown user"}</span> : null}
          {showAuthor && note.created_by_role ? <span className="text-[11.5px] text-slate-400">{label(note.created_by_role)}</span> : null}
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${kind.chip}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${kind.dot}`} />{kind.label}
          </span>
          <span className="ml-auto whitespace-nowrap text-[11.5px] font-medium text-slate-400" title={new Date(note.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}>
            {fmtTime(note.created_at)} · {ago(note.created_at)}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-slate-500">
          <Link href={href} prefetch={false} className="font-semibold text-brand-800 hover:text-brand-600 hover:underline">{company}</Link>
          {contact ? <span>· {contact}</span> : null}
          {note.phone ? <a href={`tel:${note.phone}`} className="tabular-nums hover:text-brand-700">· {note.phone}</a> : null}
          <span className={`rounded-[6px] px-1.5 py-px text-[10.5px] font-semibold uppercase tracking-wide ${isLead ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>{isLead ? "Lead" : "Customer"}</span>
          {note.product_name ? <span className="rounded-[6px] bg-gold-50 px-1.5 py-px text-[10.5px] font-semibold text-gold-800">{note.product_name}</span> : null}
          {note.team_name ? <span className="text-[11.5px] text-slate-400">· {note.team_name}</span> : null}
        </div>

        <div className="relative mt-2.5 space-y-1.5 overflow-hidden rounded-[10px] bg-slate-50/80 py-2.5 pl-4 pr-3">
          <span className={`absolute inset-y-0 left-0 w-[3px] ${kind.bar}`} />
          {p.statusTo ? (
            <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
              {p.statusFrom ? <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-slate-500 ring-1 ring-slate-200">{p.statusFrom}</span> : null}
              {p.statusFrom ? <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14m-5-5 5 5-5 5" /></svg> : null}
              <span className="rounded-full bg-brand-700 px-2 py-0.5 font-semibold text-white">{p.statusTo}</span>
            </div>
          ) : null}
          {p.response || p.callStatus || p.mode ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {p.callStatus ? <Fact name="Call">{p.callStatus}</Fact> : null}
              {p.response ? <Fact name="Customer said">{p.response}</Fact> : null}
              {p.mode && !p.nextFollowUp ? <Fact name="Mode">{p.mode}</Fact> : null}
            </div>
          ) : null}
          {p.requirement ? <Fact name="Requirement">{p.requirement}</Fact> : null}
          {p.assignedTo ? <Fact name="Handed over">{p.assignedFrom} → {p.assignedTo}</Fact> : null}
          {p.note ? <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-slate-800">{p.note}</p> : null}
          {!p.note && !p.statusTo && !p.response && !p.callStatus && !p.requirement ? <p className="text-[13px] italic text-slate-400">No details written</p> : null}
          {p.nextFollowUp || p.demoAt ? (
            <div className="flex flex-wrap gap-2 pt-0.5">
              {p.nextFollowUp ? (
                <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-gold-50 px-2 py-1 text-[12px] font-semibold text-gold-800 ring-1 ring-gold-200">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
                  Next follow-up {p.nextFollowUp}{p.mode ? ` · ${p.mode}` : ""}
                </span>
              ) : null}
              {p.demoAt ? (
                <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-violet-50 px-2 py-1 text-[12px] font-semibold text-violet-800 ring-1 ring-violet-100">Demo {p.demoAt}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
