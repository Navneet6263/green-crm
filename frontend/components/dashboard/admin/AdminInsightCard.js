import Link from "next/link";

import { formatDashboardCount } from "./adminDashboardUtils";

export default function AdminInsightCard({ href, label, value, copy, accent }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group cursor-pointer rounded-[26px] border border-white/70 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.10),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.84),rgba(247,241,233,0.92))] p-4 shadow-[0_18px_42px_rgba(33,48,74,0.10)] backdrop-blur-xl transition duration-200 ease-out hover:scale-[1.02] hover:border-[#dbcdb8] hover:shadow-[0_24px_52px_rgba(33,48,74,0.14)]"
    >
      <span className="text-[10px] font-black uppercase tracking-[0.26em] text-[#93816a]">{label}</span>
      <div className="mt-4 flex items-end justify-between gap-3">
        <strong className="text-[2rem] font-black leading-none" style={{ color: accent }}>
          {formatDashboardCount(value)}
        </strong>
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
      </div>
      <p className="mt-3 text-sm leading-6 text-[#64748b]">{copy}</p>
    </Link>
  );
}
