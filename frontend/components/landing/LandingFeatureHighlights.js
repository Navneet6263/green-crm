import LandingIcon from "./LandingIcon";
import SectionIntro from "./SectionIntro";
import { FEATURE_HIGHLIGHTS } from "./landing-data";
import { iconBg } from "./landing-styles";

export default function LandingFeatureHighlights() {
  return (
    <section id="platform" className="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8">
      <SectionIntro
        eyebrow="Product Value"
        title="Designed for teams that need more than a simple contact list."
        description="The product experience is organized around ownership, movement, and accountability so teams can operate with less friction and less reporting noise."
      />

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        {FEATURE_HIGHLIGHTS.map((item) => (
          <article
            key={item.title}
            className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition hover:shadow-[0_24px_64px_rgba(16,185,129,0.1)]"
          >
            <div className="flex items-start gap-4">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${iconBg}`}>
                <LandingIcon name={item.icon} />
              </span>
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-emerald-600">{item.eyebrow}</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{item.title}</h3>
              </div>
            </div>
            <p className="mt-5 text-sm leading-8 text-slate-600">{item.copy}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {item.points.map((point) => (
                <span key={point} className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
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
