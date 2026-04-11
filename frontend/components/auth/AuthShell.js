"use client";

import Link from "next/link";

import DashboardIcon from "../dashboard/icons";

function FeatureCard({ icon, title, copy, tone = "bg-[#fff4d9] text-[#8d6e27]" }) {
  return (
    <div className="rounded-[24px] border border-[#eadfcd] bg-white/82 p-4 shadow-[0_12px_28px_rgba(79,58,22,0.06)]">
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tone}`}>
          <DashboardIcon name={icon} className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#060710]">{title}</p>
          <p className="mt-1 text-xs leading-6 text-[#8f816a]">{copy}</p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, copy }) {
  return (
    <div className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#9a886d]">{label}</p>
      <strong className="mt-3 block text-[1.8rem] font-black leading-none text-[#060710]">{value}</strong>
      <p className="mt-2 text-xs leading-6 text-[#8f816a]">{copy}</p>
    </div>
  );
}

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
  metrics = [],
  features = [],
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(242,220,164,0.35),_rgba(255,250,242,0.85)_35%,_rgba(255,255,255,1)_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 py-2">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#10111d] text-lg font-black text-white shadow-[0_16px_28px_rgba(6,7,16,0.18)]">
              G
            </span>
            <div>
              <p className="text-[1.7rem] font-black tracking-[0.08em] text-[#060710]">GREENCRM</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#9a886d]">Platform</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2 text-sm font-semibold text-[#5d503c] transition hover:border-[#d7b258] hover:text-[#060710]">
              Login
            </Link>
            <Link href="/register" className="rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2 text-sm font-semibold text-[#060710] shadow-[0_14px_26px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f]">
              Sign Up
            </Link>
          </div>
        </header>

        <main className="flex flex-1 items-center py-6">
          <div className="w-full rounded-[42px] border border-[#ecd9b7] bg-[linear-gradient(135deg,rgba(245,233,201,0.88)_0%,rgba(255,248,235,0.96)_48%,rgba(245,226,174,0.78)_100%)] p-2 shadow-[0_32px_100px_rgba(79,58,22,0.12)]">
            <section className="grid overflow-hidden rounded-[38px] border border-[#efe2c8] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(255,249,239,0.98)_50%,_rgba(250,238,207,0.92)_100%)] lg:grid-cols-[0.95fr_1.05fr]">
              <aside className="border-b border-[#efe2c8] px-5 py-6 md:px-8 md:py-8 lg:border-b-0 lg:border-r">
                <div className="space-y-5">
                  <div className="space-y-3">
                    <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/88 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                      {sideEyebrow}
                    </span>
                    <div className="space-y-2">
                      <h2 className="max-w-xl text-[2rem] font-semibold leading-[1.04] tracking-tight text-[#060710] md:text-[2.8rem]">
                        {sideTitle}
                      </h2>
                      <p className="max-w-lg text-sm leading-7 text-[#746853] md:text-base">{sideCopy}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                    {metrics.map((item) => (
                      <MetricCard key={item.label} label={item.label} value={item.value} copy={item.copy} />
                    ))}
                  </div>

                  <div className="grid gap-3">
                    {features.map((item) => (
                      <FeatureCard key={item.title} icon={item.icon} title={item.title} copy={item.copy} tone={item.tone} />
                    ))}
                  </div>
                </div>
              </aside>

              <div className="px-5 py-6 md:px-8 md:py-8 lg:px-10">
                <div className="mx-auto w-full max-w-2xl">
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/88 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                      {modeLabel}
                    </span>
                    <div className="text-sm text-[#7c6d55]">
                      <span>{switchText} </span>
                      <Link href={switchHref} className="font-semibold text-[#060710] underline decoration-[#d7b258] underline-offset-4">
                        {switchLabel}
                      </Link>
                    </div>
                  </div>

                  <div className="mb-6 space-y-2">
                    <h1 className="text-[2rem] font-semibold tracking-tight text-[#060710] md:text-[2.6rem]">{title}</h1>
                    <p className="max-w-2xl text-sm leading-7 text-[#746853] md:text-base">{description}</p>
                  </div>

                  {children}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
