import LandingIcon from "./LandingIcon";
import SectionIntro from "./SectionIntro";
import { USE_CASES } from "./landing-data";
import { iconBgLight } from "./landing-styles";

export default function LandingUseCases() {
  return (
    <section id="use-cases" className="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8">
      <SectionIntro
        eyebrow="Use Cases"
        title="Built for the teams that need speed and visibility every day."
        description="GreenCRM fits businesses that manage incoming leads, sales follow-ups, field teams, and local customer conversations."
      />

      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {USE_CASES.map((item) => (
          <article
            key={item.title}
            className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
          >
            <span className={`grid h-12 w-12 place-items-center rounded-2xl ${iconBgLight}`}>
              <LandingIcon name={item.icon} />
            </span>
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">{item.title}</h3>
            <p className="mt-3 text-sm leading-8 text-slate-600">{item.copy}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {item.points.map((point) => (
                <span key={point} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                  {point}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
