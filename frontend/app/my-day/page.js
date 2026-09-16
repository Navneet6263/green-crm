"use client";

import Link from "next/link";
import { useState } from "react";
import WorkspacePage from "../../components/dashboard/WorkspacePage";
import { apiRequest } from "../../lib/api";

const ROLES = ["admin", "manager", "sales", "marketing", "legal-team", "finance-team", "support", "viewer"];
const BUCKETS = [["overdue", "Overdue"], ["today", "Today"], ["upcoming", "Upcoming"], ["unscheduled", "No date set"]];
const button = "rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40 hover:bg-slate-50";
const when = value => value ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Schedule a next action";

function Queue({ title, response, pending, error, page, onPage, children }) {
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-lg font-bold text-slate-900">{title}</h2><span className="text-sm text-slate-500">{pending ? "Loading…" : error ? "Unavailable" : `${response?.meta?.total || 0} matching`}</span></div>
    {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : pending ? <div role="status" className="space-y-3">{[1,2,3].map(n => <div key={n} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}</div> : response?.items?.length ? <div className="space-y-3">{children}</div> : <p className="py-10 text-center text-sm text-slate-500">Nothing in this queue. Check another view.</p>}
    <div className="mt-4 flex items-center justify-between gap-2"><button className={button} disabled={pending || page <= 1} onClick={()=>onPage(page-1)}>Previous</button><span className="text-xs text-slate-500">Page {page} of {response?.meta?.total_pages || 1}</span><button className={button} disabled={pending || page >= (response?.meta?.total_pages || 1)} onClick={()=>onPage(page+1)}>Next</button></div>
  </section>;
}

function MyDayContent({ session, data, resourceLoading, resourceErrors, refresh, leadPage, taskPage, setLeadPage, setTaskPage }) {
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canWrite = session?.user?.role !== "viewer";
  const leads = data.leads?.items || [];
  const tasks = data.tasks?.items || [];
  async function complete(task) {
    if (saving || !canWrite) return;
    setSaving(task.task_id); setError(""); setNotice("");
    try {
      await apiRequest(`/tasks/${encodeURIComponent(task.task_id)}`, { token: session.token, method: "PATCH", body: { status: "done" } });
      setNotice(`Completed: ${task.title}`);
      if (tasks.length === 1 && taskPage > 1) setTaskPage(taskPage-1); else await refresh();
    } catch (failure) { setError(failure.message); }
    finally { setSaving(""); }
  }
  return <>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">Your assigned/shared open leads and your unfinished tasks. Day boundaries use India time; overdue means before today.</p><button className={button} onClick={refresh} disabled={Object.values(resourceLoading).some(Boolean)}>Refresh queues</button></div>
    {error && <p role="alert" className="mb-4 text-sm text-rose-700">{error}</p>}
    {notice && <p role="status" className="mb-4 text-sm text-emerald-700">{notice}</p>}
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <Queue title="Lead follow-ups" response={data.leads} pending={resourceLoading.leads} error={resourceErrors.leads} page={leadPage} onPage={setLeadPage}>
        {leads.map(lead => <article key={lead.lead_id} className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h3 className="break-words font-semibold text-slate-900">{lead.company_name || lead.contact_person}</h3><p className="text-xs text-slate-500">{lead.contact_person} · {lead.status}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{lead.priority}</span></div>
          <p className="mt-2 text-sm font-medium text-amber-800">{when(lead.follow_up_date)}</p>
          <p className="mt-2 line-clamp-2 break-words text-sm text-slate-600">{lead.latest_note || "No conversation recorded yet."}</p>
          <div className="mt-3 flex flex-wrap gap-2"><Link className={button} href={`/leads/${encodeURIComponent(lead.lead_id)}`}>Open & record outcome</Link>{lead.phone && <a className={button} href={`tel:${String(lead.phone).replace(/[^+\d]/g, "")}`}>Call</a>}</div>
        </article>)}
      </Queue>
      <Queue title="My tasks" response={data.tasks} pending={resourceLoading.tasks} error={resourceErrors.tasks} page={taskPage} onPage={setTaskPage}>
        {tasks.map(task => <article key={task.task_id} className="rounded-xl border border-slate-200 p-4">
          <h3 className="break-words font-semibold text-slate-900">{task.title}</h3><p className="mt-1 text-xs text-slate-500">{task.type} · {task.priority} · {task.status}</p><p className="mt-2 text-sm font-medium text-amber-800">{when(task.due_date)}</p>
          {task.notes && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{task.notes}</p>}
          <div className="mt-3 flex flex-wrap gap-2">{canWrite && <button className={button} disabled={Boolean(saving)} onClick={()=>complete(task)}>{saving === task.task_id ? "Saving…" : "Mark complete"}</button>}
            {["lead", "customer"].includes(task.related_to) && task.related_id && <Link className={button} href={`/${task.related_to === "lead" ? "leads" : "customers"}/${encodeURIComponent(task.related_id)}`}>Related record</Link>}
            <Link className={button} href="/tasks">Task workspace</Link></div>
        </article>)}
      </Queue>
    </div>
  </>;
}

export default function MyDayPage() {
  const [bucket, setBucket] = useState("today");
  const [leadPage, setLeadPage] = useState(1);
  const [taskPage, setTaskPage] = useState(1);
  return <WorkspacePage title="My Day" eyebrow="Your next actions" allowedRoles={ROLES} progressive requestDeps={[bucket, leadPage, taskPage]}
    requestBuilder={() => [
      { key: "leads", path: `/leads/my-day?bucket=${bucket}&page=${leadPage}&page_size=15` },
      { key: "tasks", path: `/tasks?mine=1&open_only=1&due_bucket=${bucket}&page=${taskPage}&page_size=15` },
    ]}>
    {props => <><div className="mb-5 flex flex-wrap gap-2" aria-label="Work queue date filter">{BUCKETS.map(([key, label]) => <button key={key} className={`${button} ${bucket === key ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "bg-white"}`} aria-pressed={bucket === key} onClick={()=>{ setBucket(key); setLeadPage(1); setTaskPage(1); }}>{label}</button>)}</div><MyDayContent {...props} leadPage={leadPage} taskPage={taskPage} setLeadPage={setLeadPage} setTaskPage={setTaskPage} /></>}
  </WorkspacePage>;
}
