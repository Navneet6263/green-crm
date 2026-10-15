import { FAQ_ITEMS } from "./landing-data";
import { sectionPadding, sectionTitle, sectionSub } from "./landing-styles";

export default function LandingFaq() {
  return (
    <section id="faq" className={`${sectionPadding} bg-slate-50`}>
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-[12px] font-bold uppercase tracking-widest text-emerald-600">FAQ</p>
          <h2 className={`${sectionTitle} mt-2`}>Questions teams ask us</h2>
          <p className={`${sectionSub} mx-auto`}>Still unsure? Book a demo and we will walk you through it.</p>
        </div>
        <div className="mt-12 space-y-3">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className="group rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm open:shadow-md">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                {item.question}
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
