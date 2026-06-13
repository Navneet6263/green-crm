import Link from "next/link";
import { formatDashboardCount } from "./adminDashboardUtils";

export default function AdminMetricCard({ href, label, value, accent, note, meta }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="absolute left-0 top-0 h-[3px] w-full opacity-80 transition-opacity duration-300 group-hover:opacity-100" style={{ backgroundColor: accent }} />
      
      <div className="flex items-center justify-between mt-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
        {meta && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{meta}</span>}
      </div>
      <div className="mt-3">
        <strong className="text-3xl font-black tracking-tight text-slate-900">
          {formatDashboardCount(value)}
        </strong>
      </div>
      {note && <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{note}</p>}
    </Link>
  );
}
