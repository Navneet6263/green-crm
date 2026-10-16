import MarketingPage from "../../components/landing/MarketingPage";
import { COMPANY } from "../../components/landing/landing-data";
import BookDemoForm from "./BookDemoForm";

const DEMO_TOPICS = [
  { icon: "📋", title: "Leads & follow-ups", desc: "Your pipeline, owners and reminders" },
  { icon: "📞", title: "Calling & WhatsApp", desc: "Talking to customers from the lead" },
  { icon: "📍", title: "Field Sales App", desc: "GPS route and visits on Android" },
  { icon: "⚖️", title: "Sales → Legal → Finance", desc: "Won deal to paid invoice" },
];

export default function BookDemoPage() {
  return (
    <MarketingPage>
      <section className="relative overflow-hidden px-4 pb-24 pt-14 sm:px-6 lg:px-8 lg:pt-20">
        <div className="absolute inset-0 bg-[radial-gradient(50rem_30rem_at_0%_0%,rgba(12,96,93,0.12),transparent_60%),radial-gradient(40rem_30rem_at_100%_20%,rgba(232,189,0,0.14),transparent_60%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="lg:pt-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-300 bg-gold-50 px-3.5 py-1.5 text-[12px] font-semibold text-gold-800">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-500" /> Free · 30 minutes · No commitment
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl">
              See GreenCRM work for <span className="text-brand-600">your team</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">
              A live walkthrough set up around how you sell — with your questions answered by our team.
            </p>

            <p className="mt-10 text-xs font-bold uppercase tracking-widest text-slate-400">What you&apos;ll see</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {DEMO_TOPICS.map((t) => (
                <div key={t.title} className="flex items-start gap-3 rounded-2xl border border-white bg-white/80 p-4 shadow-[0_15px_40px_-25px_rgba(12,96,93,0.5)] backdrop-blur">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-lg">{t.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{t.title}</p>
                    <p className="text-xs text-slate-500">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50 to-gold-50 p-5">
              <p className="text-sm font-bold text-slate-900">Prefer to talk right now?</p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <a href={COMPANY.phoneHref} className="rounded-full bg-white px-4 py-2 font-semibold text-brand-700 shadow-sm">📞 {COMPANY.phone}</a>
                <a href={COMPANY.whatsappHref} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white px-4 py-2 font-semibold text-brand-700 shadow-sm">💬 WhatsApp us</a>
              </div>
            </div>
          </div>

          <BookDemoForm />
        </div>
      </section>
    </MarketingPage>
  );
}
