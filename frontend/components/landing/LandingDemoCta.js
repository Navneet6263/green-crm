import Link from "next/link";

import { DEMO_AGENDA } from "./landing-data";
import { btnCtaLight, btnCtaOutline } from "./landing-styles";

export default function LandingDemoCta() {
  return (
    <section id="book-demo" className="mx-auto max-w-7xl px-4 pb-18 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[2.25rem] border border-emerald-900/20 bg-[linear-gradient(135deg,#064e3b_0%,#065f46_48%,#0f766e_100%)] px-6 py-7 text-white shadow-[0_34px_90px_rgba(6,78,59,0.24)] md:px-8 md:py-9">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.88fr] lg:items-center">
          <div>
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-emerald-200">
              Book Demo
            </span>
            <h2 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight md:text-[2.2rem]">
              Walk through GreenCRM with the workflow you actually need to run.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-emerald-100/80">
              Use the demo request route when you want a guided review of lead movement, role-based views, handoffs, and the operating structure behind the product.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book-demo" className={btnCtaLight}>Open Demo Request</Link>
              <Link href="/register" className={btnCtaOutline}>Explore Workspace Setup</Link>
            </div>
          </div>

          <aside className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-emerald-200">What we cover</p>
            <div className="mt-5 space-y-3">
              {DEMO_AGENDA.map((item, index) => (
                <div key={item} className="flex gap-3 rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm leading-7 text-emerald-50/90">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-[1.25rem] border border-emerald-300/20 bg-emerald-400/10 px-4 py-3">
              <p className="text-sm leading-7 text-emerald-100">
                The CTA is intentionally modular so this panel can expand into a richer inline booking experience later without rewriting the section.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
