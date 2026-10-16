import Link from "next/link";
import LandingFooter from "./LandingFooter";
import LandingNavbar from "./LandingNavbar";
import FloatingCTA from "./FloatingCTA";
import { CtaBanner } from "./MarketingPage";
import { btnPrimary, btnSecondary, cardGlass, sectionPadding } from "./landing-styles";

export default function SeoLandingShell({ hero, features, faq, cta }) {
  return (
    <div className="marketing-root min-h-screen bg-white text-slate-950">
      <LandingNavbar />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(12,96,93,0.06),transparent_50%)]" />
          <div className="absolute top-10 right-20 h-60 w-60 rounded-full bg-brand-100/30 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-[12px] font-semibold text-brand-700">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                {hero.eyebrow}
              </span>
              <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl lg:leading-[1.1]">{hero.title}</h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">{hero.description}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/book-demo" className={btnPrimary}>Book Free Demo →</Link>
                <Link href="/#features" className={btnSecondary}>See All Features</Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        {features?.length ? (
          <section className={`${sectionPadding} bg-cream`}>
            <div className="mx-auto max-w-7xl">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {features.map(item => (
                  <article key={item.title} className={cardGlass}>
                    <h2 className="text-lg font-bold text-slate-900">{item.title}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-slate-500">{item.copy}</p>
                    {item.points?.length ? (
                      <ul className="mt-4 grid gap-1.5">
                        {item.points.map(p => (
                          <li key={p} className="flex items-center gap-2 text-sm text-slate-700">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />{p}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* FAQ */}
        {faq?.length ? (
          <section className={sectionPadding}>
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Frequently Asked Questions</h2>
              <div className="mt-8 grid gap-4">
                {faq.map(item => (
                  <div key={item.q} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="text-sm font-bold text-slate-900">{item.q}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <CtaBanner
          title={cta?.title || "Ready to see GreenCRM in action?"}
          description={cta?.description || "Book a free demo and see how GreenCRM helps your sales team manage leads, calls, WhatsApp, and attendance from one place."}
        />
      </main>
      <LandingFooter />
      <FloatingCTA />
    </div>
  );
}
