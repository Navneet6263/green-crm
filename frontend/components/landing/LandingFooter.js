import Link from "next/link";

import { FOOTER_LINK_GROUPS } from "./landing-data";

export default function LandingFooter() {
  return (
    <footer className="border-t border-slate-200/70 bg-white/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3 text-slate-950">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 text-sm font-semibold text-white">
              G
            </span>
            <div>
              <p className="text-base font-semibold tracking-[0.08em]">GreenCRM</p>
              <p className="text-sm text-slate-500">CRM for connected teams and clean operations.</p>
            </div>
          </div>
          <p className="mt-5 max-w-xl text-sm leading-8 text-slate-600">
            A calmer way to run lead flow, customer continuity, team coordination, and day-to-day CRM execution.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          {FOOTER_LINK_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-sm font-semibold text-slate-950">{group.title}</p>
              <div className="mt-4 grid gap-3">
                {group.links.map((link) => (
                  <Link key={link.href} href={link.href} className="text-sm text-slate-600 transition hover:text-emerald-700">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-slate-200/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-sm text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>&copy; {new Date().getFullYear()} GreenCRM. All rights reserved.</p>
          <p>Built for teams that need clarity across every handoff.</p>
        </div>
      </div>
    </footer>
  );
}
