import Link from "next/link";

import LandingFooter from "./LandingFooter";
import LandingNavbar from "./LandingNavbar";

export default function SeoLandingShell({ hero, features, faq, cta }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fcf9_0%,#f5f7fb_34%,#ffffff_100%)] text-slate-950">
      <LandingNavbar />
      <main>
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-emerald-700">
              {hero.eyebrow}
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-[2.8rem] sm:leading-[1.08]">
              {hero.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-[1.05rem]">
              {hero.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/book-demo"
                className="inline-flex items-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                Book Free Demo
              </Link>
              <Link
                href="/#features"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
              >
                See All Features
              </Link>
            </div>
          </div>
        </section>

        {features?.length ? (
          <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)]"
                >
                  <h2 className="text-lg font-semibold text-slate-950">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.copy}</p>
                  {item.points?.length ? (
                    <ul className="mt-4 grid gap-1.5">
                      {item.points.map((point) => (
                        <li key={point} className="flex items-center gap-2 text-sm text-slate-700">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {faq?.length ? (
          <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Frequently Asked Questions
            </h2>
            <div className="mt-8 grid gap-5">
              {faq.map((item) => (
                <div key={item.q} className="rounded-[1.35rem] border border-slate-200 bg-white p-5">
                  <p className="text-sm font-semibold text-slate-950">{item.q}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-8 text-center sm:p-12">
            <p className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              {cta?.title || "Ready to see GreenCRM in action?"}
            </p>
            <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-slate-600">
              {cta?.description ||
                "Book a free demo and see how GreenCRM helps your sales team manage leads, calls, WhatsApp, and attendance from one place."}
            </p>
            <Link
              href="/book-demo"
              className="mt-6 inline-flex items-center rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Book Free Demo - It&apos;s Free
            </Link>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
