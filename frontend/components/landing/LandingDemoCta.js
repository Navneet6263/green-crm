import Link from "next/link";

import { CTA_POINTS } from "./landing-data";
import { btnCtaLight, btnCtaOutline } from "./landing-styles";

export default function LandingDemoCta() {
  return (
    <section id="book-demo" className="mx-auto max-w-7xl px-4 pb-18 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[2.3rem] border border-[#d7e3dc] bg-[linear-gradient(135deg,#eef8f2_0%,#f8f4eb_100%)] px-6 py-8 shadow-[0_28px_80px_rgba(13,31,27,0.08)] md:px-8 md:py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.86fr] lg:items-center">
          <div>
            <span className="inline-flex rounded-full border border-white/70 bg-white/72 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#0f7a5f]">
              Final CTA
            </span>
            <h2 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-[#0d1f1b] md:text-[2.4rem]">
              Start managing leads the simple way
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[#5c6f68]">
              Give your team one place to capture leads, own follow-ups, log customer context, and keep deals moving.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book-demo" className={btnCtaLight}>Book Demo</Link>
              <Link href="#features" className={btnCtaOutline}>Explore Features</Link>
            </div>
          </div>

          <div className="grid gap-3 rounded-[1.8rem] border border-white/70 bg-white/72 p-4">
            {CTA_POINTS.map((item) => (
              <div key={item} className="rounded-[1.15rem] bg-[#f7fbf6] px-4 py-3 text-sm font-medium text-[#31534a]">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
