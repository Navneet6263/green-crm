import SectionIntro from "./SectionIntro";
import { WORKFLOW_STEPS } from "./landing-data";

export default function LandingWorkflow() {
  return (
    <section id="workflow" className="border-y border-slate-200/70 bg-white/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-18 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionIntro
            eyebrow="How It Works"
            title="A simple operating rhythm from first touch to completed handoff."
            description="The workflow is intentionally easy to scan. Teams can see what just happened, what is blocked, and what needs to happen next."
          />
        </div>

        <div className="grid gap-4">
          {WORKFLOW_STEPS.map((step, index) => (
            <article
              key={step.step}
              className="grid gap-4 rounded-[1.75rem] border border-slate-200/80 bg-[#f8fafc] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.05)] md:grid-cols-[auto_1fr]"
            >
              <div className="flex items-center gap-4 md:block">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(16,185,129,0.2)]">
                  {step.step}
                </span>
                {index < WORKFLOW_STEPS.length - 1 ? (
                  <span className="hidden h-16 w-px bg-emerald-200 md:mx-auto md:mt-4 md:block" />
                ) : null}
              </div>
              <div className="pt-1">
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">{step.title}</h3>
                <p className="mt-3 max-w-2xl text-sm leading-8 text-slate-600">{step.note}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
