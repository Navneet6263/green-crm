"use client";

import Link from "next/link";

import AppLogo from "../branding/AppLogo";

export default function AuthShell({
  modeLabel,
  switchText,
  switchHref,
  switchLabel,
  title,
  description,
  children,
  sideEyebrow,
  sideTitle,
  sideCopy,
  features = [],
}) {
  return (
    <div className="marketing-root relative min-h-screen overflow-hidden bg-gradient-to-br from-brand-50 via-white to-gold-50">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-brand-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[30rem] w-[30rem] rounded-full bg-gold-200/50 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex max-w-[min(56vw,11.5rem)] items-center sm:max-w-[12rem]">
            <AppLogo size="lg" variant="auth" priority />
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="hidden rounded-full px-4 py-2 font-semibold text-slate-600 transition hover:text-brand-700 sm:inline-flex">← Back to website</Link>
            <Link href={switchHref} className="rounded-full bg-white px-4 py-2 font-semibold text-brand-700 shadow-sm ring-1 ring-brand-100 transition hover:ring-brand-300">
              {switchLabel}
            </Link>
          </div>
        </header>

        <main className="flex flex-1 items-center py-8">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <aside className="hidden lg:block">
              {sideEyebrow ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-gold-300 bg-gold-50 px-3.5 py-1.5 text-[12px] font-semibold text-gold-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
                  {sideEyebrow}
                </span>
              ) : null}
              <h2 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 xl:text-5xl">{sideTitle}</h2>
              {sideCopy ? <p className="mt-4 max-w-lg text-lg leading-relaxed text-slate-600">{sideCopy}</p> : null}

              <img src="/illustrations/sales-team.svg" alt="Sales team working together in GreenCRM" className="mt-8 w-full max-w-lg" />

              {features.length ? (
                <ul className="mt-6 flex flex-wrap gap-2">
                  {features.map((item) => (
                    <li key={item.title} className="flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-brand-100">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">✓</span>
                      {item.title}
                    </li>
                  ))}
                </ul>
              ) : null}
            </aside>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-brand-200/60 via-white to-gold-200/60 blur-2xl" />
              <div className="relative overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-[0_40px_100px_-30px_rgba(12,96,93,0.45)]">
                <div className="h-1.5 bg-gradient-to-r from-brand-700 via-gold-400 to-brand-500" />
                <div className="px-6 py-8 sm:px-10 sm:py-10">
                  {modeLabel ? (
                    <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand-700">{modeLabel}</span>
                  ) : null}
                  <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
                  {description ? <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p> : null}

                  <div className="mt-7">{children}</div>

                  <p className="mt-7 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
                    {switchText}{" "}
                    <Link href={switchHref} className="font-semibold text-brand-700 underline decoration-gold-400 decoration-2 underline-offset-4 hover:text-brand-800">
                      {switchLabel}
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
