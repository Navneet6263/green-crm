"use client";

import Link from "next/link";
import DashboardIcon from "../../components/dashboard/icons";
import { T, nice } from "./task-tokens";

const STAT_CFG = [
  { key:"pending",  label:"Pending",  accent:"border-amber-200 bg-amber-50"   },
  { key:"overdue",  label:"Overdue",  accent:"border-rose-200 bg-rose-50"     },
  { key:"done",     label:"Done",     accent:"border-emerald-200 bg-emerald-50"},
  { key:"total",    label:"Total",    accent:"border-slate-100 bg-slate-50"   },
];

const TYPE_OPTS = ["all","call","whatsapp","email","meeting","demo","reminder","task","note"];
const PRIORITY_OPTS = ["all","low","medium","high","urgent"];
const STATUS_OPTS = ["all","pending","in-progress","done","cancelled"];

export function TaskFilters({ stats, typeFilter, priorityFilter, statusFilter, search, onType, onPriority, onStatus, onSearch, onCreateTrigger }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={T.kicker}>Execution Queue</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">Task Board</h1>
          <p className="mt-0.5 text-sm text-slate-400">Team-scoped tasks from leads, customers, and manual scheduling.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateTrigger}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow shadow-amber-200 transition active:scale-95"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
            Create New Task
          </button>
          <Link href="/leads" prefetch={false} className={T.ghost}>
            <DashboardIcon name="leads" className="h-4 w-4" />
            Create from Lead
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAT_CFG.map(s => (
          <div key={s.key} className={`group relative overflow-hidden rounded-2xl border px-4 py-3.5 transition hover:-translate-y-0.5 hover:shadow-sm ${s.accent}`}>
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
            <p className={T.kicker}>{s.label}</p>
            <p className="mt-1 text-2xl font-bold leading-none text-slate-900">{stats[s.key]}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className={`${T.panel} px-4 py-4`}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative sm:col-span-2 xl:col-span-1">
            <DashboardIcon name="leads" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className={`${T.input} pl-10`} value={search} onChange={e => onSearch(e.target.value)} placeholder="Search title, assignee, notes…" />
          </div>
          <select className={T.input} value={typeFilter} onChange={e => onType(e.target.value)}>
            {TYPE_OPTS.map(o => <option key={o} value={o}>{o === "all" ? "All types" : nice(o)}</option>)}
          </select>
          <select className={T.input} value={priorityFilter} onChange={e => onPriority(e.target.value)}>
            {PRIORITY_OPTS.map(o => <option key={o} value={o}>{o === "all" ? "All priorities" : nice(o)}</option>)}
          </select>
          <select className={T.input} value={statusFilter} onChange={e => onStatus(e.target.value)}>
            {STATUS_OPTS.map(o => <option key={o} value={o}>{o === "all" ? "All statuses" : nice(o)}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
