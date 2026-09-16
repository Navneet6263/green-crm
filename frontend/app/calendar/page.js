"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import WorkspacePage from "../../components/dashboard/WorkspacePage";

const dayKey = date => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const button = "rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40";

export default function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => { setSelectedDay(dayKey(new Date())); }, []);
  const start = selectedDay ? new Date(`${selectedDay}T00:00:00+05:30`) : null;
  const valid = start && !Number.isNaN(start.getTime());
  const end = valid ? new Date(start.getTime() + 86400000) : null;
  const weekStart = valid ? new Date(start.getTime() - ((new Date(`${selectedDay}T12:00:00Z`).getUTCDay()+6)%7)*86400000) : null;
  const days = weekStart ? Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime()+i*86400000)) : [];
  const pickDay = value => { if (value) { setSelectedDay(value); setPage(1); } };
  return <WorkspacePage title="Calendar" eyebrow="Your weekly agenda" allowedRoles={["admin","manager","sales","marketing","legal-team","finance-team","support","viewer"]}
    requestDeps={[selectedDay,page]} requestBuilder={() => valid ? [{ key: "tasks", path: `/tasks?mine=1&due_from=${encodeURIComponent(start.toISOString())}&due_to=${encodeURIComponent(end.toISOString())}&page=${page}&page_size=25` }] : []}>
    {({ data, loading, error, refresh }) => <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">Your assigned tasks, by scheduled day. Times shown in Asia/Kolkata.</p><div className="flex flex-wrap gap-2"><button className={button} onClick={()=>pickDay(dayKey(new Date()))}>Today</button><button className={button} disabled={loading} onClick={refresh}>Refresh</button><Link className={button} href="/tasks">Create / manage tasks</Link></div></div>
      <div className="flex flex-wrap items-center gap-3"><button aria-label="Previous week" className={button} disabled={!valid} onClick={()=>pickDay(dayKey(new Date(start.getTime()-7*86400000)))}>Previous week</button><label className="text-sm">Date <input aria-label="Selected calendar date" type="date" className={`${button} ml-2`} value={selectedDay} onChange={event=>pickDay(event.target.value)} /></label><button className={button} disabled={!valid} onClick={()=>pickDay(dayKey(new Date(start.getTime()+7*86400000)))}>Next week</button></div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">{days.map(date => { const key=dayKey(date); return <button key={key} aria-pressed={key===selectedDay} className={`${button} py-4 ${key===selectedDay ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "bg-white"}`} onClick={()=>pickDay(key)}><span className="block text-xs">{date.toLocaleDateString("en-IN",{ timeZone:"Asia/Kolkata",weekday:"short" })}</span><span className="mt-1 block">{date.toLocaleDateString("en-IN",{ timeZone:"Asia/Kolkata",day:"numeric",month:"short" })}</span></button>; })}</div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="mb-4 text-lg font-bold">Scheduled work · {loading ? "Loading…" : `${data.tasks?.meta?.total || 0} tasks`}</h2>
        {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : loading ? <div role="status" className="h-40 animate-pulse rounded-xl bg-slate-100" /> : (data.tasks?.items || []).length ? <div className="divide-y divide-slate-100">{data.tasks.items.map(task => <article key={task.task_id} className="flex flex-wrap items-start gap-4 py-4"><time className="min-w-20 text-sm font-bold text-emerald-800">{new Date(task.due_date).toLocaleTimeString("en-IN",{ timeZone:"Asia/Kolkata",hour:"2-digit",minute:"2-digit" })}</time><div className="min-w-0 flex-1"><h3 className="break-words font-semibold">{task.title}</h3><p className="mt-1 text-xs text-slate-500">{task.status} · {task.priority} · {task.type}</p>{task.notes && <p className="mt-2 line-clamp-2 break-words text-sm text-slate-600">{task.notes}</p>}</div>{["lead","customer"].includes(task.related_to) && task.related_id && <Link className={button} href={`/${task.related_to==="lead"?"leads":"customers"}/${encodeURIComponent(task.related_id)}`}>Open record</Link>}</article>)}</div> : <p className="py-12 text-center text-sm text-slate-500">No tasks scheduled for this day. Undated work is in My Day → No date set.</p>}
        <div className="mt-4 flex items-center justify-between gap-3"><button className={button} disabled={loading||page<=1} onClick={()=>setPage(p=>p-1)}>Previous</button><span className="text-xs text-slate-500">Page {page} of {data.tasks?.meta?.total_pages || 1}</span><button className={button} disabled={loading||page>=(data.tasks?.meta?.total_pages||1)} onClick={()=>setPage(p=>p+1)}>Next</button></div>
      </section>
    </div>}
  </WorkspacePage>;
}
