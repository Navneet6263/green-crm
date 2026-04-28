import Link from "next/link";

import HeroVisual from "./HeroVisual";
import { btnGhost, btnPrimary, btnSecondary } from "./landing-styles";

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(circle_at_top_left,rgba(15,122,95,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(197,231,213,0.6),transparent_34%)]" />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-18 pt-12 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-24 lg:pt-16">
        <div className="relative z-10 flex flex-col justify-center">
          <span className="inline-flex w-fit rounded-full border border-[#cfe0d7] bg-white/82 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#0f7a5f]">
            GreenCRM for sales follow-up teams
          </span>
          <h1 className="mt-6 max-w-[34rem] text-4xl font-semibold tracking-tight text-[#0d1f1b] sm:text-[3.4rem] sm:leading-[0.98]">
            Run your sales follow-ups without losing a lead
          </h1>
          <p className="mt-5 max-w-[34rem] text-base leading-8 text-[#5c6f68] sm:text-[1.05rem]">
            GreenCRM helps teams manage leads, follow-ups, tasks, and customer conversations in one simple workspace.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/book-demo" className={btnPrimary}>Book Demo</Link>
            <Link href="#features" className={btnSecondary}>Explore Features</Link>
            <Link href="/login" className={btnGhost}>Login</Link>
          </div>
        </div>

        <div className="relative z-10">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
