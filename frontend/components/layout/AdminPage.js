"use client";

import DashboardShell from "../dashboard/DashboardShell";

/** Standard page frame for the main sections (Users, Teams, Products): title, one-line description and actions. */
export default function AdminPage({ session, title, description, actions, children }) {
  return (
    <DashboardShell session={session} title={title} hideTitle heroStats={[]}>
      <div className="tw-buttons min-w-0 space-y-4 pb-10">
        <header className="flex flex-wrap items-end justify-between gap-3 pt-1">
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold tracking-tight text-slate-900">{title}</h1>
            {description ? <p className="mt-0.5 text-[13px] text-slate-500">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
        {children}
      </div>
    </DashboardShell>
  );
}
