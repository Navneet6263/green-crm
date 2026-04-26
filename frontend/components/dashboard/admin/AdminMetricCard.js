import Link from "next/link";

import { formatDashboardCount } from "./adminDashboardUtils";

export default function AdminMetricCard({ href, label, value, accent, note, meta }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group cursor-pointer rounded-[26px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(247,241,233,0.92))] p-4 shadow-[0_18px_42px_rgba(33,48,74,0.10)] backdrop-blur-xl transition duration-200 ease-out hover:scale-[1.02] hover:border-[#dbcdb8] hover:shadow-[0_24px_52px_rgba(33,48,74,0.14)]"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#93816a]">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <strong className="text-3xl font-black tracking-tight" style={{ color: accent }}>
          {formatDashboardCount(value)}
        </strong>
        {meta ? <span className="rounded-full border border-[#e4d9ca] bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#6b7280]">{meta}</span> : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-[#64748b]">{note}</p>
    </Link>
  );
}
