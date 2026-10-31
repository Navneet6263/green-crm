"use client";

import Link from "next/link";
import { useEffect } from "react";
import { addDays, categoryOf, istParts, styleOf, todayKey } from "./calendarUtils";

const when = (value) => new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: true });

/** Side panel for a calendar item. Tasks can be completed, moved, edited or deleted from here. */
export default function ItemDetail({ item, onClose, onEdit, onToggleDone, onMove, onDelete, busy, error }) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!item) return null;
  const style = styleOf(item);
  const isTask = item.kind === "task";
  const rows = [
    ["When", item.timed ? when(item.at) : `${when(item.at).split(" at ")[0]} · any time`],
    ["Status", item.overdue ? "Overdue" : item.status],
    item.priority ? ["Priority", item.priority] : null,
    item.owner ? ["Assigned to", item.owner] : null,
    item.raw?.team_name ? ["Team", item.raw.team_name] : null,
    item.raw?.created_by_name ? ["Created by", item.raw.created_by_name] : null,
  ].filter(Boolean);
  const lines = String(item.notes || "").split("\n");
  const today = todayKey();
  const day = istParts(item.at).key;
  const moves = [[today, "Today"], [addDays(today, 1), "Tomorrow"], [addDays(day, 7), "+1 week"]].filter(([key]) => key !== day);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={onClose} />
      <aside className="tw-buttons fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-slate-200 bg-white shadow-[-24px_0_60px_-30px_rgba(15,23,42,0.4)]" aria-label="Calendar item">
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${style.dot}`} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{categoryOf(item.category).label}</p>
            <h2 className={`mt-0.5 text-lg font-bold text-slate-900 ${item.done ? "line-through opacity-60" : ""}`}>{item.title}</h2>
            {item.subtitle ? <p className="text-sm capitalize text-slate-500">{item.subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-[8px] text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isTask ? (
            <div className="flex gap-2 px-5 pt-4">
              <button type="button" disabled={busy} onClick={() => onToggleDone(item)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-[10px] px-3 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${item.done ? "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d={item.done ? "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" : "m5 12 5 5L20 7"} /></svg>
                {item.done ? "Reopen" : "Mark done"}
              </button>
              <button type="button" disabled={busy} onClick={() => onEdit(item)}
                className="flex items-center gap-2 rounded-[10px] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" /></svg>Edit
              </button>
            </div>
          ) : null}

          <dl className="divide-y divide-slate-100 px-5 pt-2">
            {rows.map(([name, value]) => (
              <div key={name} className="flex justify-between gap-4 py-3 text-sm">
                <dt className="text-slate-500">{name}</dt>
                <dd className={`text-right font-medium ${name === "When" ? "" : "capitalize"} ${name === "Status" && item.overdue ? "text-rose-600" : "text-slate-900"}`}>{value}</dd>
              </div>
            ))}
          </dl>

          {isTask && !item.done && moves.length ? (
            <div className="px-5 pb-1 pt-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Move to</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {moves.map(([key, text]) => (
                  <button key={text} type="button" disabled={busy} onClick={() => onMove(item, key)}
                    className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-brand-50 hover:text-brand-800 hover:ring-brand-200 disabled:opacity-60">{text}</button>
                ))}
              </div>
            </div>
          ) : null}

          {item.notes ? (
            <div className="mx-5 mt-3 space-y-1 rounded-[12px] bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
              {lines.map((line, i) => (line.startsWith("☐ ")
                ? <p key={i} className="flex items-center gap-2"><span className="h-3.5 w-3.5 shrink-0 rounded-[4px] ring-1 ring-slate-300" />{line.slice(2)}</p>
                : <p key={i} className={line ? "" : "h-2"}>{line}</p>))}
            </div>
          ) : null}
          {error ? <p className="mx-5 mt-3 rounded-[10px] bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
          {item.href ? (
            <Link href={item.href} className="flex-1 rounded-[10px] bg-brand-700 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-800">{item.hrefLabel}</Link>
          ) : <span className="flex-1 self-center text-[12px] text-slate-400">Not linked to a lead or customer.</span>}
          {isTask && onDelete ? (
            <button type="button" disabled={busy} onClick={() => onDelete(item.raw)} className="rounded-[10px] px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60">Delete</button>
          ) : null}
        </div>
      </aside>
    </>
  );
}
