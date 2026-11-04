"use client";

import Link from "next/link";
import DashboardShell from "../dashboard/DashboardShell";
import DashboardIcon from "../dashboard/icons";
import { settingsFor, settingsItem } from "./settingsNav";

/**
 * Every settings page: the Settings menu on the left (a scrolling strip on phones) and the page on the right.
 * `active` is the menu key; `title`/`description` default to the menu item's.
 */
export default function SettingsLayout({ session, active, title, description, actions, children, wide = false }) {
  const role = session?.user?.role || "";
  const sections = settingsFor(role);
  const item = settingsItem(active);
  const heading = title || item?.label || "Settings";

  return (
    <DashboardShell session={session} title={heading} hideTitle heroStats={[]}>
      <div className="tw-buttons min-w-0 pb-10">
        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="min-w-0 lg:sticky lg:top-[76px] lg:self-start">
            <Link href="/settings" prefetch className="mb-2 hidden items-center gap-2 px-2 text-[13px] font-bold text-slate-900 lg:flex">
              <DashboardIcon name="settings" className="h-4 w-4 text-slate-400" />Settings
            </Link>
            <nav aria-label="Settings" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:block lg:space-y-4 lg:overflow-visible lg:px-0 lg:pb-0">
              {sections.map((section) => (
                <div key={section.title} className="contents lg:block">
                  <p className="hidden px-2 pb-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400 lg:block">{section.title}</p>
                  <div className="contents lg:block lg:space-y-0.5">
                    {section.items.map((it) => {
                      const on = it.key === active;
                      return (
                        <Link key={it.key} href={it.href} prefetch aria-current={on ? "page" : undefined}
                          className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[10px] px-3 py-2 text-[13px] transition ${on ? "bg-white font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200" : "font-medium text-slate-600 hover:bg-white/70 hover:text-slate-900"}`}>
                          <DashboardIcon name={it.icon} className={`h-4 w-4 shrink-0 ${on ? "text-brand-700" : "text-slate-400"}`} />
                          {it.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          <section className={`min-w-0 space-y-4 ${wide ? "" : "max-w-[1100px]"}`}>
            <header className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-slate-400"><Link href="/settings" prefetch className="hover:text-slate-700">Settings</Link>{item ? ` / ${item.label}` : ""}</p>
                <h1 className="text-[22px] font-bold tracking-tight text-slate-900">{heading}</h1>
                {description || item?.description ? <p className="mt-0.5 text-[13px] text-slate-500">{description || item.description}</p> : null}
              </div>
              {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            </header>
            {children}
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}

/** Shared look for settings panels, inputs and buttons. */
export const S = {
  card: "rounded-[14px] bg-white ring-1 ring-slate-200",
  cardPad: "rounded-[14px] bg-white p-4 ring-1 ring-slate-200 sm:p-5",
  input: "h-10 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-[13.5px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-50",
  label: "text-[12px] font-semibold text-slate-600",
  primary: "inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-50",
  ghost: "inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-white px-3 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50",
  danger: "inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-white px-3 text-[13px] font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-50 disabled:opacity-50",
  sectionTitle: "text-[14.5px] font-bold text-slate-900",
};
