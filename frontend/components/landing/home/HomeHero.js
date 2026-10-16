import Link from "next/link";
import { PhoneMock } from "../LandingFieldApp";
import { btnPrimary, btnSecondary } from "../landing-styles";
import DashboardMock from "./DashboardMock";

const CHECKS = ["Free 30-minute demo", "Android field app included", "Your data kept private"];

const TOASTS = [
  { icon: "🔔", title: "New lead assigned", sub: "Aarav Foods → Rahul", pos: "-left-6 top-24", delay: "0s" },
  { icon: "📞", title: "Call logged · 4 min", sub: "BluePeak Realty", pos: "-left-10 bottom-24", delay: "1.2s" },
  { icon: "✅", title: "Deal moved to Legal", sub: "City Hospital · ₹3.1L", pos: "-right-6 -top-6", delay: "2.4s" },
];

export default function HomeHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(60rem_40rem_at_50%_-10%,rgba(12,96,93,0.16),transparent_60%),radial-gradient(40rem_30rem_at_100%_30%,rgba(232,189,0,0.12),transparent_60%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />

      <div className="relative mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8 lg:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-4 py-1.5 text-[12px] font-semibold text-brand-700 shadow-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-500" />
            Sales CRM + Field App · Made in India
          </span>

          <h1 className="mt-7 text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
            Stop losing leads.
            <br />
            <span className="bg-gradient-to-r from-brand-800 to-brand-500 bg-clip-text text-transparent">Start closing </span>
            <span className="relative inline-block text-brand-500">
              deals.
              <svg viewBox="0 0 200 20" className="absolute -bottom-2 left-0 h-3 w-full sm:-bottom-3 sm:h-4" preserveAspectRatio="none" aria-hidden="true">
                <path d="M3 14 C 50 4, 120 2, 197 9" fill="none" stroke="#e8bd00" strokeWidth="6" strokeLinecap="round" />
              </svg>
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            GreenCRM puts leads, follow-ups, calls, WhatsApp and your field team in one place — on the web and on every salesperson&apos;s phone.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/book-demo" className={btnPrimary}>Book Free Demo →</Link>
            <Link href="/features" className={btnSecondary}>Explore Features</Link>
          </div>

          <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
            {CHECKS.map((c) => (
              <li key={c} className="flex items-center gap-1.5">
                <span className="grid h-4 w-4 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">✓</span>
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto mt-16 max-w-6xl pb-20 lg:pb-28">
          <div className="absolute -inset-x-10 top-10 bottom-10 rounded-[3rem] bg-gradient-to-r from-brand-300/25 via-gold-200/20 to-brand-200/25 blur-3xl" />
          <div className="relative">
            <DashboardMock />

            {TOASTS.map((t) => (
              <div key={t.title} className={`motion-float absolute z-10 hidden items-center gap-3 rounded-2xl border border-slate-100 bg-white/95 px-4 py-3 shadow-xl shadow-slate-900/10 backdrop-blur lg:flex ${t.pos}`} style={{ animationDelay: t.delay }}>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold-50 text-lg">{t.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t.title}</p>
                  <p className="text-xs text-slate-500">{t.sub}</p>
                </div>
              </div>
            ))}

            <div className="absolute -bottom-20 -right-16 z-10 hidden origin-bottom-right scale-[0.6] xl:block">
              <PhoneMock />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
