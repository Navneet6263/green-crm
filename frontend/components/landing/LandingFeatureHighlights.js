import LandingIcon from "./LandingIcon";
import SectionIntro from "./SectionIntro";
import { FEATURE_HIGHLIGHTS } from "./landing-data";
import { iconBg } from "./landing-styles";

export default function LandingFeatureHighlights() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8">
      <SectionIntro
        eyebrow="Features"
        title="Everything your team needs to run follow-ups with less friction."
        description="The product stays focused on daily lead movement instead of heavy CRM complexity."
        align="center"
      />

      <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {FEATURE_HIGHLIGHTS.map((item) => (
          <article key={item.title} className="rounded-[1.75rem] border border-[#e7ece5] bg-white/88 p-6 shadow-[0_20px_48px_rgba(13,31,27,0.05)] transition hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(15,122,95,0.08)]">
            <span className={`grid h-12 w-12 place-items-center rounded-2xl ${iconBg}`}>
              <LandingIcon name={item.icon} />
            </span>
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-[#0d1f1b]">{item.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[#5c6f68]">{item.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
