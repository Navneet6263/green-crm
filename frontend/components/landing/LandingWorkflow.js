import SectionIntro from "./SectionIntro";
import { WORKFLOW_STEPS } from "./landing-data";

export default function LandingWorkflow() {
  return (
    <section id="workflow" className="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[2.2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(248,251,247,0.96),rgba(255,255,255,0.92))] p-6 shadow-[0_26px_70px_rgba(13,31,27,0.06)] md:p-8">
        <SectionIntro
          eyebrow="Workflow"
          title="Capture lead, assign owner, add follow-up, track history, close cleanly."
          description="The workflow keeps every step visible so teams can move faster without losing context."
        />

        <div className="mt-10 grid gap-4 lg:grid-cols-5">
          {WORKFLOW_STEPS.map((item) => (
            <article key={item.step} className="relative rounded-[1.7rem] border border-[#e5ece3] bg-white/88 p-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#edf8f2] text-sm font-semibold text-[#0f7a5f]">
                {item.step}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-[#0d1f1b]">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#5c6f68]">{item.note}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
