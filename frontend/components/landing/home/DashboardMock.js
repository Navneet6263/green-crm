// Illustrative product mock for the hero; sample data only.
const NAV = ["Dashboard", "Leads", "Tasks", "Calendar", "Workflow", "Analytics", "Attendance"];

const KPIS = [
  { label: "New leads", value: "18", tone: "text-brand-600" },
  { label: "Follow-ups today", value: "9", tone: "text-amber-600" },
  { label: "Pipeline", value: "₹12.4L", tone: "text-indigo-600" },
  { label: "Won this month", value: "6", tone: "text-brand-600" },
];

const BOARD = [
  { stage: "New", dot: "bg-sky-500", cards: [{ name: "Aarav Foods", note: "Website enquiry" }, { name: "Kapoor Steels", note: "Referral" }] },
  { stage: "Contacted", dot: "bg-amber-500", cards: [{ name: "BluePeak Realty", note: "Call back 4 PM" }] },
  { stage: "Proposal", dot: "bg-violet-500", cards: [{ name: "Nova Mobility", note: "₹2.4L quote sent" }, { name: "Sharma Traders", note: "Revised pricing" }] },
  { stage: "Won", dot: "bg-brand-500", cards: [{ name: "City Hospital", note: "Moved to Legal" }] },
];

const TODAY = [
  { time: "11:00", who: "Kapoor Steels", what: "Intro call" },
  { time: "14:30", who: "Nova Mobility", what: "Proposal follow-up" },
  { time: "16:00", who: "BluePeak Realty", what: "Site visit" },
];

export default function DashboardMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_40px_120px_-20px_rgba(15,23,42,0.35)]">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-cream px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand-400" />
        <span className="ml-3 hidden flex-1 rounded-md bg-white px-3 py-1 text-[11px] text-slate-400 sm:block">greencall.online/dashboard</span>
      </div>

      <div className="grid grid-cols-[150px_1fr] max-md:grid-cols-1">
        {/* Sidebar */}
        <aside className="border-r border-slate-100 bg-gradient-to-b from-white to-brand-50/60 p-3 max-md:hidden">
          <div className="mb-4 flex items-center gap-2 px-2 pt-1">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-gold-500 text-[11px] font-black text-brand-950">G</span>
            <span className="text-xs font-bold text-slate-900">GreenCRM</span>
          </div>
          {NAV.map((item, i) => (
            <div key={item} className={`mb-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${i === 0 ? "bg-brand-600 text-white shadow-sm" : "text-slate-500"}`}>{item}</div>
          ))}
        </aside>

        <div className="bg-cream/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400">Good morning, Priya</p>
              <p className="text-sm font-bold text-slate-900">Today&apos;s sales desk</p>
            </div>
            <span className="rounded-full bg-brand-600 px-3 py-1 text-[11px] font-semibold text-white">+ Add lead</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {KPIS.map((k) => (
              <div key={k.label} className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                <p className="text-[10px] font-medium text-slate-400">{k.label}</p>
                <p className={`mt-0.5 text-lg font-bold ${k.tone}`}>{k.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_180px]">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BOARD.map((col) => (
                <div key={col.stage} className="rounded-xl bg-slate-100/70 p-2">
                  <p className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
                    {col.stage}
                  </p>
                  {col.cards.map((c) => (
                    <div key={c.name} className="mb-1.5 rounded-lg bg-white p-2 shadow-sm">
                      <p className="truncate text-[11px] font-semibold text-slate-800">{c.name}</p>
                      <p className="truncate text-[10px] text-slate-400">{c.note}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-3 max-lg:hidden">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Follow-ups today</p>
              {TODAY.map((t) => (
                <div key={t.who} className="mt-2 flex gap-2">
                  <span className="text-[10px] font-semibold text-brand-600">{t.time}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-slate-800">{t.who}</p>
                    <p className="truncate text-[10px] text-slate-400">{t.what}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
