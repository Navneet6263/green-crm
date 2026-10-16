import Link from "next/link";
import { btnPrimary, btnSecondary } from "./landing-styles";

const POINTS = ["Live product walkthrough", "Set up around your team size", "Android field app included", "No technical knowledge needed"];

export default function LandingDemoCta() {
  return (
    <section id="book-demo" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[2rem] border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-gold-50 px-8 py-14 shadow-[0_40px_100px_-40px_rgba(12,96,93,0.45)] md:px-14">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gold-200/50 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-brand-200/50 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Ready to stop losing leads?</h2>
              <p className="mt-4 max-w-lg text-lg leading-relaxed text-slate-600">Book a free 30-minute demo and see GreenCRM set up around how your team sells — no commitment.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/book-demo" className={btnPrimary}>Book Free Demo →</Link>
                <Link href="/login" className={btnSecondary}>Login to CRM</Link>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {POINTS.map((p) => (
                <div key={p} className="flex items-center gap-3 rounded-2xl border border-white bg-white/80 px-4 py-4 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold-100 text-xs font-bold text-gold-800">✓</span>
                  {p}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
