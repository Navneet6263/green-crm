"use client";

import Link from "next/link";
import EmailButton from "../../email/EmailButton";
import { WidgetFrame } from "../../dashboard/home/charts";
import { PALETTE, ago, colorFor, count } from "../../dashboard/home/widgetCatalog";
import { getLeadStatusLabel } from "../../../lib/leadStatus";
import { parseNote } from "../../updates/updateUtils";

const when = (value) => (value ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }) : "–");
const daysLate = (value) => Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
const initials = (name) => String(name || "?").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const titleize = (v) => String(v || "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function PersonHeader({ person, activity, actions }) {
  const color = colorFor(person.user_id);
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-[18px] font-bold text-white" style={{ background: color }} aria-hidden="true">{initials(person.name)}</span>
      <div className="min-w-0 flex-1">
        <h1 className="text-[20px] font-bold tracking-tight text-slate-900">{person.name}</h1>
        <p className="text-[13px] text-slate-500">{[titleize(person.role), person.teams, person.email].filter(Boolean).join(" · ")}</p>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate-500">
          <span>Last login: <b className="font-semibold text-slate-700">{ago(activity?.lastLogin || person.last_login_at)}</b></span>
          <span>Last activity: <b className="font-semibold text-slate-700">{ago(activity?.lastActive)}</b></span>
          {!person.is_active ? <span className="font-semibold text-rose-700">Account inactive</span> : null}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </section>
  );
}

export function ActivityCard({ activity, range }) {
  const items = [
    ["Updates written", count(activity?.updates), PALETTE[4]],
    ["Leads added", count(activity?.leadsAdded), PALETTE[1]],
    ["Calls logged", count(activity?.calls), PALETTE[0]],
  ];
  return (
    <WidgetFrame title="Activity" accent={PALETTE[4]} subtitle={range?.all ? "All time" : "In the chosen period"}>
      <div className="grid grid-cols-3 gap-2">
        {items.map(([label, value, color]) => (
          <div key={label} className="rounded-[10px] p-3" style={{ background: `${color}14` }}>
            <p className="text-[11.5px] font-medium text-slate-600">{label}</p>
            <p className="text-[22px] font-bold tabular-nums text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </WidgetFrame>
  );
}

export function OverdueCard({ overdue, session, person }) {
  return (
    <WidgetFrame title="Overdue follow-ups" accent="#e11d48" subtitle={overdue.total ? `${count(overdue.total)} past their date · oldest first` : "Nothing overdue"}
      action={overdue.total > overdue.items.length ? <Link href={`/leads?follow_up=overdue&assigned_to=${encodeURIComponent(person.user_id)}`} prefetch={false} className="text-[12.5px] font-semibold text-brand-700 hover:underline">See all</Link> : null}>
      {overdue.items.length ? (
        <ul className="divide-y divide-slate-100">
          {overdue.items.map((l) => (
            <li key={l.lead_id} className="flex items-center gap-3 py-2">
              <Link href={`/leads/${l.lead_id}`} prefetch={false} className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-slate-900 hover:text-brand-700">{l.company_name || l.contact_person}</span>
                <span className="block truncate text-[11.5px] text-slate-500">{[l.contact_person, l.phone, getLeadStatusLabel(l.status)].filter(Boolean).join(" · ")}</span>
              </Link>
              <span className="shrink-0 text-right text-[12px]">
                <b className="block font-semibold text-rose-700">{daysLate(l.follow_up_date)}d late</b>
                <span className="text-slate-400">{when(l.follow_up_date)}</span>
              </span>
              <EmailButton session={session} variant="icon" label={`Email ${person.name} about this lead`} kind="lead" lead={{ ...l, assigned_to_name: person.name }} defaultTo={[person.user_id]} />
            </li>
          ))}
        </ul>
      ) : <p className="py-6 text-center text-[13px] text-slate-400">No overdue follow-ups. Well done.</p>}
    </WidgetFrame>
  );
}

export function NotesCard({ notes }) {
  return (
    <WidgetFrame title="Latest updates written" accent={PALETTE[2]} subtitle="The newest notes this person added">
      {notes.length ? (
        <ul className="space-y-2.5">
          {notes.map((n) => {
            const p = parseNote(n.content);
            return (
              <li key={n.id} className="text-[13px]">
                <p className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <Link href={`/leads/${n.lead_id}`} prefetch={false} className="font-semibold text-brand-800 hover:underline">{n.company_name || n.contact_person}</Link>
                  <span className="text-[11.5px] text-slate-400">{ago(n.created_at)}</span>
                </p>
                <p className="mt-0.5 line-clamp-2 text-slate-600">{[p.statusTo ? `${p.statusFrom ? `${p.statusFrom} → ` : ""}${p.statusTo}` : "", p.response, p.note].filter(Boolean).join(" · ") || "Updated"}</p>
              </li>
            );
          })}
        </ul>
      ) : <p className="py-6 text-center text-[13px] text-slate-400">No updates yet.</p>}
    </WidgetFrame>
  );
}

