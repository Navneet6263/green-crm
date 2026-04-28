import { TRUST_STATS } from "./landing-data";

export default function LandingTrustSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-3 rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(246,249,243,0.92))] p-4 shadow-[0_24px_60px_rgba(13,31,27,0.06)] md:grid-cols-4 md:p-5">
        {TRUST_STATS.map((item) => (
          <article key={item.label} className="rounded-[1.35rem] bg-white/72 px-4 py-4">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6a7f76]">{item.label}</span>
            <strong className="mt-3 block text-3xl font-semibold tracking-tight text-[#0d1f1b]">{item.value}</strong>
            <p className="mt-2 text-sm leading-6 text-[#5c6f68]">{item.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
