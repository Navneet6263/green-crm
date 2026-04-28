import SectionIntro from "./SectionIntro";
import { PROBLEM_ITEMS } from "./landing-data";

export default function LandingTestimonials() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.84fr_1.16fr]">
        <SectionIntro
          eyebrow="The Problem"
          title="Sales follow-ups break when the system is not built for daily action."
          description="GreenCRM is designed around the small things teams do every day to move a lead forward."
        />

        <div className="grid gap-4 md:grid-cols-3">
          {PROBLEM_ITEMS.map((item, index) => (
            <article key={item.title} className="rounded-[1.8rem] border border-[#e7ece5] bg-white/86 p-6 shadow-[0_18px_42px_rgba(13,31,27,0.05)]">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#edf8f2] text-sm font-semibold text-[#0f7a5f]">
                0{index + 1}
              </span>
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-[#0d1f1b]">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#5c6f68]">{item.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
