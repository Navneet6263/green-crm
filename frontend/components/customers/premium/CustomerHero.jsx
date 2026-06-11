import Link from "next/link";
import DashboardIcon from "../../dashboard/icons";

function initials(v = "C") {
  return String(v).split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("") || "C";
}

function money(v) {
  return `₹${Number(v || 0).toLocaleString("en-IN")}`;
}

export default function CustomerHero({ customer }) {
  if (!customer) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 p-8 shadow-sm">
      {/* Abstract Background Design */}
      <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emerald-100/50 blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-indigo-100/50 blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 blur opacity-50"></div>
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-2xl font-black text-white shadow-inner border border-emerald-300">
              {initials(customer.company_name || customer.name)}
            </div>
            {customer.status === "active" && (
              <div className="absolute -bottom-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 border-2 border-white text-white shadow-sm">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">
                {customer.company_name || customer.name}
              </h1>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-100">
                {customer.status}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <DashboardIcon name="user" className="h-4 w-4 opacity-70" /> {customer.name || "Primary Contact"}
              <span className="opacity-30">•</span>
              <DashboardIcon name="mail" className="h-4 w-4 opacity-70" /> {customer.email}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end gap-4">
          <div className="flex flex-col items-start md:items-end bg-slate-50/80 px-5 py-3 rounded-2xl backdrop-blur-sm border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Portfolio Value</span>
            <span className="text-2xl font-black text-emerald-600">{money(customer.total_value)}</span>
          </div>

          <div className="flex items-center gap-2">
            {customer.phone && (
              <a href={`tel:${String(customer.phone).replace(/[^\d+]/g, "")}`} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition border border-slate-200">
                <DashboardIcon name="phone" className="h-4 w-4" />
              </a>
            )}
            <Link href={`/customers/${customer.customer_id}/edit`} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500 transition shadow-[0_0_15px_rgba(79,70,229,0.2)]">
              <DashboardIcon name="settings" className="h-4 w-4" /> Edit Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
