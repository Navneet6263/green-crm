import LandingIcon from "./LandingIcon";
import SectionIntro from "./SectionIntro";
import { PLATFORM_FACTS, TRUST_PILLARS } from "./landing-data";
import { iconBgLight } from "./landing-styles";

export default function LandingTrustSection() {
  return (
    <section id="proof" className="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8">
      <SectionIntro
        eyebrow="Trust And Proof"
        title="A CRM experience built for credibility, clarity, and long-term extension."
        description="This landing page reflects the same product direction: structured information, calm spacing, and a serious operational tone instead of visual noise."
      />

      <div className="mt-10 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,#064e3b_0%,#065f46_48%,#0f766e_100%)] p-7 text-white shadow-[0_30px_80px_rgba(6,78,59,0.22)]">
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Why teams outgrow patchwork systems
          </span>
          <h3 className="mt-5 max-w-xl text-[1.95rem] font-semibold tracking-tight">
            When ownership lives in one tool and execution lives somewhere else, teams lose momentum.
          </h3>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-emerald-100/80">
            GreenCRM is aimed at organizations that need lead flow, customer continuity, task discipline, and cross-team visibility to feel connected.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PLATFORM_FACTS.map((item) => (
              <div key={item.value} className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">{item.value}</p>
                <p className="mt-2 text-sm leading-7 text-emerald-100/70">{item.label}</p>
              </div>
            ))}
          </div>
        </article>

        <div className="grid gap-4">
          {TRUST_PILLARS.map((item) => (
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
