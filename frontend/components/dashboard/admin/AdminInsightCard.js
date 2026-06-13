import Link from "next/link";
import { formatDashboardCount } from "./adminDashboardUtils";

export default function AdminInsightCard({ href, label, value, copy, accent }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="absolute left-0 top-0 h-[3px] w-full" style={{ backgroundColor: accent }} />
      <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</span>
      <div className="mt-2 flex items-center justify-between">
        <strong className="text-3xl font-black tracking-tight text-slate-900">
          {formatDashboardCount(value)}
        </strong>
      </div>
      {copy && <p className="mt-2 text-[11px] text-slate-500">{copy}</p>}
    </Link>
  );
}
