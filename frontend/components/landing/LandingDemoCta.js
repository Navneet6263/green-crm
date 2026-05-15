import Link from "next/link";
import { btnCtaLight, btnCtaOutline } from "./landing-styles";

export default function LandingDemoCta() {
  return (
    <section id="book-demo" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 px-8 py-14 md:px-14 md:py-18">
          {/* Decorative */}
          <div className="absolute top-0 right-0 h-60 w-60 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Ready to stop losing leads?</h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-300">Book a free 30-minute demo. See how GreenCRM fits your team's workflow — no commitment, no credit card.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/book-demo" className={btnCtaLight}>Book Free Demo →</Link>
                <Link href="/login" className={btnCtaOutline}>Login to CRM</Link>
              </div>
            </div>
            <div className="grid gap-3">
              {["✓ Live product walkthrough", "✓ Custom setup for your team size", "✓ See ROI in first 30 days", "✓ No technical knowledge needed"].map(p => (
                <div key={p} className="rounded-xl bg-white/5 border border-white/10 px-5 py-3 text-sm font-medium text-slate-200">{p}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
