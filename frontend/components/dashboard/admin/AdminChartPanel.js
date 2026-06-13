export default function AdminChartPanel({ eyebrow, title, copy, children }) {
  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-md">
      <div className="border-b border-slate-100 px-5 py-4">
        {eyebrow && <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">{eyebrow}</p>}
        <h3 className="font-semibold tracking-tight text-slate-900">{title}</h3>
        {copy && <p className="mt-1 text-xs text-slate-500 line-clamp-1">{copy}</p>}
      </div>
      <div className="flex-1 p-5">{children}</div>
    </section>
  );
}
