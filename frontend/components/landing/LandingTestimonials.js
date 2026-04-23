import SectionIntro from "./SectionIntro";
import { TESTIMONIALS } from "./landing-data";

export default function LandingTestimonials() {
  return (
    <section id="testimonials" className="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8">
      <SectionIntro
        eyebrow="Testimonials"
        title="What teams say after switching to GreenCRM."
        description="These sample testimonials reflect the kind of outcomes sales and field teams usually want from a practical CRM."
      />

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((item) => (
          <article
            key={item.name}
            className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
          >
            <p className="text-3xl leading-none text-emerald-500">&ldquo;</p>
            <p className="mt-4 text-sm leading-8 text-slate-600">{item.quote}</p>
            <div className="mt-6 border-t border-slate-100 pt-4">
              <p className="text-sm font-semibold text-slate-950">{item.name}</p>
              <p className="mt-1 text-sm text-slate-500">{item.role}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
