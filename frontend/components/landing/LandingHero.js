import Link from "next/link";

import HeroVisual from "./HeroVisual";
import { HERO_POINTS } from "./landing-data";
import { btnGhost, btnPrimary, btnSecondary } from "./landing-styles";

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.2),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(20,184,166,0.12),_transparent_30%)]" />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-18 pt-12 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-24 lg:pt-16">
        <div className="relative lg:pr-4 lg:pt-4">
          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-emerald-700">
            GreenCRM For Growing Teams
          </span>
          <h1 className="mt-6 max-w-[34rem] text-4xl font-semibold tracking-tight text-slate-950 sm:text-[3rem] sm:leading-[1.04] lg:text-[3.3rem]">
            Manage leads, calls, and WhatsApp from one fast CRM
          </h1>
          <p className="mt-6 max-w-[35rem] text-base leading-8 text-slate-600 sm:text-[1.05rem]">
            GreenCRM brings lead management, calling, WhatsApp, SMS, attendance, and dashboards into one simple
            workspace.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/book-demo" className={btnPrimary}>Book Demo</Link>
            <Link href="#features" className={btnSecondary}>See Features</Link>
            <Link href="/login" className={btnGhost}>Login</Link>
          </div>

          <p className="mt-4 max-w-[32rem] text-sm leading-7 text-slate-500">
            Built for startups, local businesses, field teams, and growing sales teams.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {HERO_POINTS.map((item) => (
              <article
                key={item.label}
                className="rounded-[1.35rem] border border-emerald-100/80 bg-white/90 p-5 shadow-[0_16px_40px_rgba(16,185,129,0.06)]"
              >
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.value}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="relative lg:pl-2">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
