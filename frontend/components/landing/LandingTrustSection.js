import LandingIcon from "./LandingIcon";
import SectionIntro from "./SectionIntro";
import { WHY_CHOOSE_FACTS, WHY_CHOOSE_ITEMS } from "./landing-data";
import { iconBgLight } from "./landing-styles";

export default function LandingTrustSection() {
  return (
    <section id="why-greencrm" className="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8">
      <SectionIntro
        eyebrow="Why Choose Us"
        title="Why teams choose GreenCRM."
        description="GreenCRM is built for teams that want a clean CRM without the usual software overload."
      />

      <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <article className="overflow-hidden rounded-[2rem] border border-emerald-900/20 bg-[linear-gradient(135deg,#064e3b_0%,#065f46_48%,#0f766e_100%)] p-7 text-white shadow-[0_30px_80px_rgba(6,78,59,0.22)]">
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Made for daily sales work
          </span>
          <h3 className="mt-5 max-w-xl text-[1.95rem] font-semibold tracking-tight">
            Simple enough for daily use. Strong enough for growing sales teams.
          </h3>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-emerald-100/80">
            Use GreenCRM when you need lead management, calling, WhatsApp, SMS, attendance, and dashboards to feel
            connected instead of scattered across apps.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {WHY_CHOOSE_FACTS.map((item) => (
              <div key={item} className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4 text-sm font-medium text-emerald-50">
                {item}
              </div>
            ))}
          </div>
        </article>

        <div className="grid gap-4 sm:grid-cols-2">
          {WHY_CHOOSE_ITEMS.map((item) => (
            <article
              key={item.title}
              className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
            >
              <div className="flex items-start gap-4">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${iconBgLight}`}>
                  <LandingIcon name={item.icon} />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-8 text-slate-600">{item.copy}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
