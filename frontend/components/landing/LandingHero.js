import Link from "next/link";

import HeroVisual from "./HeroVisual";
import { HERO_METRICS } from "./landing-data";
import { btnPrimary, btnSecondary, btnGhost } from "./landing-styles";

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(20,184,166,0.14),_transparent_30%)]" />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-18 pt-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:pb-24 lg:pt-16">
        <div className="relative lg:pr-4 lg:pt-4">
          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Modern CRM For Multi-Team Execution
          </span>
          <h1 className="mt-6 max-w-[31rem] text-4xl font-semibold tracking-tight text-slate-950 sm:text-[3rem] sm:leading-[1.04] lg:text-[3.3rem]">
            Bring pipeline, handoffs, and follow-up into one calm operating system.
          </h1>
          <p className="mt-6 max-w-[34rem] text-base leading-8 text-slate-600 sm:text-[1.05rem]">
            GreenCRM helps growing teams run leads, customer records, reminders, and cross-functional workflow from one
            connected workspace built for serious day-to-day operations.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/book-demo" className={btnPrimary}>Book Demo</Link>
            <Link href="/register" className={btnSecondary}>Create Workspace</Link>
            <Link href="/login" className={btnGhost}>Login →</Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {HERO_METRICS.map((item) => (
              <article key={item.label} className="rounded-[1.35rem] border border-emerald-100/80 bg-white/90 p-5 shadow-[0_16px_40px_rgba(16,185,129,0.06)]">
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
