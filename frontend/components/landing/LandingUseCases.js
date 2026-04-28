import LandingIcon from "./LandingIcon";
import SectionIntro from "./SectionIntro";
import { WHY_ITEMS } from "./landing-data";
import { iconBgSoft } from "./landing-styles";

export default function LandingUseCases() {
  return (
    <section id="why-greencrm" className="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionIntro
          eyebrow="Why GreenCRM"
          title="A cleaner CRM for teams that care about follow-through."
          description="The product is fast to understand, easy to manage, and built around real lead ownership."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {WHY_ITEMS.map((item) => (
            <article key={item.title} className="rounded-[1.8rem] border border-[#e7ece5] bg-white/88 p-6 shadow-[0_18px_42px_rgba(13,31,27,0.05)]">
              <span className={`grid h-12 w-12 place-items-center rounded-2xl ${iconBgSoft}`}>
                <LandingIcon name={item.icon} />
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
