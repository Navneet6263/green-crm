import { KICKER_CLASS } from "./constants";

const STAT_ACCENT = [
  "border-amber-200 bg-amber-50",
  "border-emerald-200 bg-emerald-100",
  "border-sky-200 bg-sky-100",
  "border-violet-200 bg-violet-100",
];

export default function CommunicationHero({ leads, customers, records, selectedRecord, capabilities }) {
  const enabledChannels = ["email","call","whatsapp","sms"].filter(c => capabilities?.[c]?.enabled).length;
  const stats = [
    { label: "Lead Contacts",     value: leads.length },
    { label: "Customers",         value: customers.length },
    { label: "Reachable Records", value: records.filter(r => r.email || r.phone).length },
    { label: "Live Channels",     value: enabledChannels || 0 },
  ];

  return (
    <div className="space-y-4">
      {/* Title row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Multi-channel CRM</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">Communications</h1>
          <p className="mt-0.5 text-sm text-slate-400">Email, call, WhatsApp, and SMS — one unified desk.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className={`group relative overflow-hidden rounded-2xl border px-4 py-3.5 transition hover:-translate-y-0.5 hover:shadow-sm ${STAT_ACCENT[i]}`}>
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
            <p className="mt-1 text-2xl font-bold leading-none text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Selected record strip */}
      {selectedRecord ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500 text-xs font-bold text-white">
              {String(selectedRecord.subtitle || "R").slice(0,2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{selectedRecord.subtitle}</p>
              <p className="text-xs text-slate-500">{selectedRecord.title}</p>
            </div>
          </div>
          <span className="rounded-full border border-amber-300 bg-white px-3 py-0.5 text-[11px] font-semibold text-amber-800">{selectedRecord.status}</span>
        </div>
      ) : null}
    </div>
  );
}
