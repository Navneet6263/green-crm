export default function AdminChartPanel({ eyebrow, title, copy, children }) {
  return (
    <section className="relative overflow-hidden rounded-[30px] border border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,241,232,0.92))] p-5 shadow-[0_20px_54px_rgba(33,48,74,0.10)] backdrop-blur-xl transition duration-200 ease-out hover:border-[#ddd0be] hover:shadow-[0_24px_62px_rgba(33,48,74,0.14)] md:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
      <div className="mb-5">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#93816a]">{eyebrow}</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#0f172a]">{title}</h3>
        {copy ? <p className="mt-2 max-w-xl text-sm leading-6 text-[#64748b]">{copy}</p> : null}
      </div>
      {children}
    </section>
  );
}
