const K = "text-[10px] font-bold uppercase tracking-widest text-slate-400";

export default function SelectedEntityCard({ record }) {
  if (!record) return null;

  const isLead = record.entity_type === "lead";

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-base font-bold text-white ${isLead ? "bg-amber-500" : "bg-emerald-600"}`}>
            {String(record.subtitle || "R").slice(0,2).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">{record.subtitle}</h3>
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${isLead ? "border-amber-200 bg-amber-100 text-amber-800" : "border-emerald-200 bg-emerald-100 text-emerald-700"}`}>
                {record.entity_type}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">{record.status}</span>
            </div>
            <p className="mt-0.5 text-sm text-slate-400">{record.title}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 border-t border-slate-50 pt-4">
        {[["Email", record.email || "—"], ["Phone", record.phone || "—"], ["Context", record.product || "—"], ["Owner", record.owner || "—"]].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
            <p className={K}>{l}</p>
            <p className="mt-1 text-sm font-semibold text-slate-800 break-words">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
