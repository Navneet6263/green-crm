"use client";

import { useEffect, useRef, useState } from "react";
import LeadFollowUpStatusButton from "../LeadFollowUpStatusButton";
import LeadQuickStatusControl from "../LeadQuickStatusControl";
import WorkflowBadge from "../WorkflowBadge";
import { PRIORITY_TONE, STATUS_TONE } from "../shared/leadPageConstants";
import { leadInitials, leadPrimaryName, leadSecondaryName, titleizeLeadValue } from "../shared/leadPageFormatters";
import { DEFAULT_COLUMNS, LEAD_COLUMNS, followUpState, formatClock, formatDay, moneyShort } from "./leadWorkspaceConfig";

const AVATARS = ["bg-brand-700", "bg-sky-600", "bg-violet-600", "bg-rose-600", "bg-amber-600", "bg-emerald-600", "bg-slate-600"];
const avatarClass = (name = "") => AVATARS[(name.charCodeAt(0) || 0) % AVATARS.length];
const validHex = (value) => (/^#[0-9a-f]{6}$/i.test(String(value || "").trim()) ? value : null);
const ICON_LINK = "grid h-7 w-7 place-items-center rounded-[8px] text-slate-400 transition hover:bg-brand-50 hover:text-brand-700";

export function Pill({ tone, children }) {
  return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize" style={{ background: tone?.[0], color: tone?.[1] }}>{children}</span>;
}

export function LeadAvatar({ lead, size = "h-9 w-9 text-[12px]" }) {
  const hex = validHex(lead.product_color);
  return (
    <span className={`grid shrink-0 place-items-center rounded-[10px] font-bold text-white ${size} ${hex ? "" : avatarClass(leadPrimaryName(lead))}`} style={hex ? { backgroundColor: hex } : undefined}>
      {leadInitials(lead.contact_person, lead.company_name, lead.email)}
    </span>
  );
}

export function FollowUpChip({ lead }) {
  const state = followUpState(lead);
  if (!lead.follow_up_date) return <span className="text-[12px] text-slate-300">Not set</span>;
  const tones = { overdue: "text-rose-700", today: "text-brand-800", upcoming: "text-slate-700", "": "text-slate-400" };
  return (
    <span className={`block whitespace-nowrap text-[12.5px] font-medium ${tones[state]}`}>
      {state === "today" ? "Today" : formatDay(lead.follow_up_date)}
      <span className="block text-[11px] font-normal opacity-75">{state === "overdue" ? "Overdue" : formatClock(lead.follow_up_date)}</span>
    </span>
  );
}

const LogIcon = () => <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" role="img" aria-label="Log a follow-up"><title>Log a follow-up</title><path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" /></svg>;
const CallIcon = () => <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>;
const WhatsAppIcon = () => <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 0 1-13.5 7.8L3 21l1.2-4.5A9 9 0 1 1 21 12" /></svg>;
export const telHref = (value) => { const p = String(value || "").replace(/[^\d+]/g, ""); return p ? `tel:${p}` : ""; };
export const whatsappHref = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
};

function StatusCell({ lead, canEdit, enabledStatuses, token, teamUsers, onUpdated, onRefresh }) {
  if (lead.is_workflow) return <WorkflowBadge status={lead.workflow_status} leadId={lead.lead_id} lead={lead} onAction={(updated) => (updated ? onUpdated(updated) : onRefresh?.())} />;
  if (!canEdit) return <Pill tone={STATUS_TONE[lead.status] || STATUS_TONE.new}>{titleizeLeadValue(lead.status || "new")}</Pill>;
  return (
    <LeadQuickStatusControl assigneeOptions={teamUsers} enabledStatuses={enabledStatuses} lead={lead} token={token} onUpdated={onUpdated} hideLabel
      selectClassName="h-8 w-[122px] min-h-0 rounded-[8px] border border-slate-200 bg-white py-0 pl-2 pr-1 text-[12.5px] font-semibold text-slate-800" />
  );
}

function renderCell(key, lead, ctx) {
  switch (key) {
    case "lead": {
      const secondary = leadSecondaryName(lead);
      return (
        <span className="flex items-center gap-2.5">
          <LeadAvatar lead={lead} />
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] font-semibold text-slate-900">{leadPrimaryName(lead)}</span>
            {secondary ? <span className="block truncate text-[12px] text-slate-500">{secondary}</span> : null}
          </span>
        </span>
      );
    }
    case "status":
      return <span onClick={(e) => e.stopPropagation()} className="block"><StatusCell lead={lead} canEdit={ctx.canEdit} enabledStatuses={ctx.enabledStatuses} token={ctx.token} teamUsers={ctx.teamUsers} onUpdated={ctx.onStatusUpdated} onRefresh={ctx.onRefresh} /></span>;
    case "priority": return <Pill tone={PRIORITY_TONE[lead.priority] || PRIORITY_TONE.medium}>{lead.priority || "medium"}</Pill>;
    case "owner": return lead.assigned_to_name ? <span className="block truncate text-[13px] text-slate-700">{lead.assigned_to_name}</span> : <span className="text-[12px] font-semibold text-amber-700">Unassigned</span>;
    case "followUp": return <FollowUpChip lead={lead} />;
    case "value": return <span className="text-[13px] font-semibold tabular-nums text-slate-800">{Number(lead.estimated_value) ? moneyShort(lead.estimated_value) : "–"}</span>;
    case "advance": return <span className="text-[13px] tabular-nums text-emerald-700">{Number(lead.advance_received) ? moneyShort(lead.advance_received) : "–"}</span>;
    case "total": return <span className="text-[13px] font-semibold tabular-nums text-slate-800">{Number(lead.total_lead_value || lead.estimated_value) ? moneyShort(lead.total_lead_value || lead.estimated_value) : "–"}</span>;
    case "pending": {
      const pending = Math.max(0, Number(lead.total_lead_value || lead.estimated_value || 0) - Number(lead.advance_received || 0));
      return <span className={`text-[13px] tabular-nums ${pending ? "font-semibold text-amber-700" : "text-slate-400"}`}>{pending ? moneyShort(pending) : "–"}</span>;
    }
    case "paymentMode": return <span className="block truncate text-[13px] text-slate-600">{titleizeLeadValue(lead.payment_mode || "") || "–"}</span>;
    case "paymentDate": return <span className="whitespace-nowrap text-[12.5px] text-slate-500">{formatDay(lead.payment_date) || "–"}</span>;
    case "nextPayment": return <span className="whitespace-nowrap text-[12.5px] text-slate-500">{formatDay(lead.next_payment_date) || "–"}</span>;
    case "phone": return <span className="whitespace-nowrap text-[13px] tabular-nums text-slate-600">{lead.phone || "–"}</span>;
    case "email": return <span className="block max-w-[200px] truncate text-[13px] text-slate-600">{lead.email || "–"}</span>;
    case "product": return <span className="block truncate text-[13px] text-slate-600">{lead.product_name || "–"}</span>;
    case "source": return <span className="block truncate text-[13px] text-slate-600">{titleizeLeadValue(lead.lead_source || "") || "–"}</span>;
    case "team": return <span className="block truncate text-[13px] text-slate-600">{lead.team_name || "–"}</span>;
    case "note": return <span className="line-clamp-2 max-w-[280px] text-[12.5px] leading-snug text-slate-500">{lead.latest_note || "–"}</span>;
    case "notes": return <span className="text-[13px] tabular-nums text-slate-500">{Number(lead.note_count || 0)}</span>;
    case "createdBy": return <span className="block truncate text-[13px] text-slate-600">{lead.created_by_name || "–"}</span>;
    case "created": return <span className="whitespace-nowrap text-[12.5px] text-slate-500">{formatDay(lead.created_at)}</span>;
    case "updated": return <span className="whitespace-nowrap text-[12.5px] text-slate-500">{formatDay(lead.updated_at)}</span>;
    default: return null;
  }
}

export function LeadColumnMenu({ columns, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const toggle = (key) => onChange(columns.includes(key) ? columns.filter((k) => k !== key) : [...columns, key]);
  const move = (key, step) => {
    const i = columns.indexOf(key);
    const j = i + step;
    if (j < 1 || j >= columns.length) return;
    const next = [...columns];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const ordered = [...columns.map((k) => LEAD_COLUMNS.find((c) => c.key === k)).filter(Boolean), ...LEAD_COLUMNS.filter((c) => !columns.includes(c.key))];
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-white px-3 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 5h16v14H4zM10 5v14M15 5v14" /></svg>Columns
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1.5 w-[270px] rounded-[12px] bg-white p-2 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-200">
          <div className="flex items-center justify-between px-2 pb-1.5 pt-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Show columns</p>
            <button type="button" onClick={() => onChange(DEFAULT_COLUMNS)} className="text-[12px] font-semibold text-brand-700 hover:underline">Reset</button>
          </div>
          <ul className="max-h-[340px] overflow-y-auto">
            {ordered.map((column) => {
              const on = columns.includes(column.key);
              return (
                <li key={column.key} className="flex items-center gap-2 rounded-[8px] px-2 py-1 hover:bg-slate-50">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-[13px] text-slate-700">
                    <input type="checkbox" checked={on} disabled={column.fixed} onChange={() => toggle(column.key)} className="h-4 w-4 accent-[#0c605d]" />
                    <span className="truncate">{column.label}</span>
                  </label>
                  {on && !column.fixed ? (
                    <span className="flex">
                      <button type="button" onClick={() => move(column.key, -1)} aria-label={`Move ${column.label} left`} className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700">←</button>
                      <button type="button" onClick={() => move(column.key, 1)} aria-label={`Move ${column.label} right`} className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700">→</button>
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Pager({ page, totalPages, total, pageSize, onPage, onPageSize }) {
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 text-[12.5px] text-slate-500">
      <span>{from}–{to} of <b className="font-semibold text-slate-800">{total.toLocaleString("en-IN")}</b></span>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5">Rows
          <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} className="h-8 rounded-[8px] border border-slate-200 bg-white px-1.5 text-[12.5px] text-slate-800">
            {[25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="h-8 rounded-[8px] px-3 font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40">Prev</button>
        <span className="px-1 tabular-nums">{Math.min(page, totalPages)} / {totalPages}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="h-8 rounded-[8px] px-3 font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}

export default function LeadsTable({
  rows, loading, columns, sort, sortDir, onSort, canEdit, canManage, enabledStatuses, token, teamUsers, picked, allPicked,
  onPickToggle, onToggleAllPicked, selectedId, onOpen, onStatusUpdated, onNoteSaved, onRefresh, emptyMessage,
  page, totalPages, total, pageSize, onPage, onPageSize,
}) {
  const ctx = { canEdit, enabledStatuses, token, teamUsers, onStatusUpdated, onRefresh };
  const shown = columns.map((key) => LEAD_COLUMNS.find((c) => c.key === key)).filter(Boolean);
  const clickSort = (column) => {
    if (!column.sort) return;
    if (sort === column.sort) onSort(column.sort, sortDir === "asc" ? "desc" : "asc");
    else onSort(column.sort, ["estimated_value", "updated_at", "created_at", "priority"].includes(column.sort) ? "desc" : "asc");
  };

  if (!rows.length) {
    return (
      <section className="rounded-[14px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <p className="text-[15px] font-semibold text-slate-800">{loading ? "Loading leads…" : "No leads here"}</p>
        {!loading ? <p className="mx-auto mt-1 max-w-sm text-[13px] text-slate-500">{emptyMessage}</p> : null}
      </section>
    );
  }

  return (
    <section className={`overflow-hidden rounded-[14px] border border-slate-200 bg-white transition-opacity ${loading ? "opacity-60" : ""}`}>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {canManage ? (
                <th className="w-10 pl-4 pr-1">
                  <input type="checkbox" checked={allPicked} onChange={onToggleAllPicked} aria-label="Select this page" className="h-4 w-4 align-middle accent-[#0c605d]" />
                </th>
              ) : null}
              {shown.map((column) => {
                const active = sort === column.sort;
                return (
                  <th key={column.key} className={`${column.width || ""} whitespace-nowrap px-2.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 ${column.align === "right" ? "text-right" : ""}`}
                    aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                    {column.sort ? (
                      <button type="button" onClick={() => clickSort(column)} className={`uppercase tracking-wider hover:text-slate-900 ${active ? "text-brand-700" : ""}`}>
                        {column.label}{active ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                      </button>
                    ) : column.label}
                  </th>
                );
              })}
              <th className="w-[100px] px-2 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((lead) => {
              const isOpen = selectedId === lead.lead_id;
              const isPicked = picked.includes(lead.lead_id);
              return (
                <tr key={lead.lead_id} onClick={() => onOpen(lead.lead_id)}
                  className={`cursor-pointer border-b border-slate-100 align-middle transition last:border-0 ${isOpen ? "bg-brand-50" : isPicked ? "bg-brand-50/50" : "hover:bg-slate-50/80"}`}>
                  {canManage ? (
                    <td className="pl-4 pr-1" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={isPicked} onChange={() => onPickToggle(lead.lead_id)} aria-label={`Select ${leadPrimaryName(lead)}`} className="h-4 w-4 align-middle accent-[#0c605d]" />
                    </td>
                  ) : null}
                  {shown.map((column) => (
                    <td key={column.key} className={`max-w-[320px] px-2.5 py-2 ${column.align === "right" ? "text-right" : ""}`}>{renderCell(column.key, lead, ctx)}</td>
                  ))}
                  <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                    <span className="flex items-center justify-end gap-0.5">
                      {lead.phone ? <a href={telHref(lead.phone)} className={ICON_LINK} title={`Call ${lead.phone}`} aria-label={`Call ${lead.phone}`}><CallIcon /></a> : null}
                      {lead.phone ? <a href={whatsappHref(lead.phone)} target="_blank" rel="noreferrer" className={ICON_LINK} title="WhatsApp" aria-label="WhatsApp"><WhatsAppIcon /></a> : null}
                      {canEdit ? <LeadFollowUpStatusButton className={ICON_LINK} label={<LogIcon />} lead={lead} onSaved={onNoteSaved} token={token} disabled={!lead.status || lead.status === "new"} /> : null}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Phones get a compact list instead of a wide table. */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((lead) => (
          <li key={lead.lead_id} onClick={() => onOpen(lead.lead_id)} className={`flex items-center gap-3 px-3 py-2.5 ${selectedId === lead.lead_id ? "bg-brand-50" : ""}`}>
            {canManage ? <input type="checkbox" checked={picked.includes(lead.lead_id)} onClick={(e) => e.stopPropagation()} onChange={() => onPickToggle(lead.lead_id)} aria-label={`Select ${leadPrimaryName(lead)}`} className="h-4 w-4 accent-[#0c605d]" /> : null}
            <LeadAvatar lead={lead} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold text-slate-900">{leadPrimaryName(lead)}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <Pill tone={STATUS_TONE[lead.status] || STATUS_TONE.new}>{titleizeLeadValue(lead.status || "new")}</Pill>
                {followUpState(lead) === "overdue" ? <span className="text-[11.5px] font-semibold text-rose-700">Overdue</span> : followUpState(lead) === "today" ? <span className="text-[11.5px] font-semibold text-brand-800">Today</span> : null}
              </span>
            </span>
            {lead.phone ? <a href={telHref(lead.phone)} onClick={(e) => e.stopPropagation()} className={`${ICON_LINK} h-9 w-9 text-brand-700`} aria-label={`Call ${lead.phone}`}><CallIcon /></a> : null}
          </li>
        ))}
      </ul>

      <Pager page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={onPage} onPageSize={onPageSize} />
    </section>
  );
}
