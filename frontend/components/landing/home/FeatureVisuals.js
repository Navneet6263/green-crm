// Small illustrative UI mocks for the home feature tabs; sample data only.
const card = "rounded-2xl border border-slate-100 bg-white shadow-sm";

const STATUS = {
  New: "bg-sky-50 text-sky-700",
  Contacted: "bg-amber-50 text-amber-700",
  Proposal: "bg-violet-50 text-violet-700",
  Won: "bg-brand-50 text-brand-700",
};

function LeadsVisual() {
  const rows = [
    ["Aarav Foods", "Rahul", "New", "Website"],
    ["BluePeak Realty", "Sneha", "Contacted", "Exhibition"],
    ["Nova Mobility", "Rahul", "Proposal", "Referral"],
    ["City Hospital", "Amit", "Won", "Walk-in"],
    ["Kapoor Steels", "Sneha", "New", "Call"],
  ];
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-lg bg-cream px-3 py-2 text-xs text-slate-400">🔍 Search leads…</div>
        <span className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white">Filters · 2</span>
      </div>
      <div className="mt-3 divide-y divide-slate-100">
        {rows.map(([name, owner, status, source], i) => (
          <div key={name} className="grid grid-cols-[1fr_auto] items-center gap-3 py-2.5 opacity-0 animate-[fadeIn_0.4s_ease_forwards]" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
              <p className="text-xs text-slate-400">{owner} · {source}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS[status]}`}>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FollowUpsVisual() {
  const items = [
    { time: "10:00", title: "Call Kapoor Steels", tag: "Call", done: true },
    { time: "12:30", title: "Send quote to Nova Mobility", tag: "Task", done: true },
    { time: "16:00", title: "Follow up BluePeak Realty", tag: "Follow-up", done: false },
    { time: "17:30", title: "Demo for Aarav Foods", tag: "Meeting", done: false },
  ];
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-900">My Day</p>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">2 due soon</span>
      </div>
      <div className="mt-3 space-y-2">
        {items.map((it, i) => (
          <div key={it.title} className="flex items-center gap-3 rounded-xl bg-cream px-3 py-2.5 opacity-0 animate-[fadeIn_0.4s_ease_forwards]" style={{ animationDelay: `${i * 90}ms` }}>
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] ${it.done ? "border-brand-500 bg-brand-500 text-white" : "border-slate-300 bg-white"}`}>{it.done ? "✓" : ""}</span>
            <span className="w-11 text-xs font-semibold text-brand-600">{it.time}</span>
            <span className={`flex-1 truncate text-sm ${it.done ? "text-slate-400 line-through" : "font-medium text-slate-800"}`}>{it.title}</span>
            <span className="hidden rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 sm:inline">{it.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommsVisual() {
  const items = [
    { icon: "📞", color: "bg-indigo-50", title: "Outgoing call · 4m 12s", note: "Interested, wants pricing by Friday" },
    { icon: "💬", color: "bg-brand-50", title: "WhatsApp sent", note: "Hi Mr. Mehta, sharing the brochure 📎" },
    { icon: "✉️", color: "bg-sky-50", title: "Email sent", note: "Quotation – Nova Mobility" },
    { icon: "📝", color: "bg-amber-50", title: "Note added", note: "Decision maker is the CFO" },
  ];
  return (
    <div className={`${card} p-4`}>
      <p className="text-sm font-bold text-slate-900">Nova Mobility · Activity</p>
      <div className="relative mt-4 space-y-3 pl-5 before:absolute before:bottom-2 before:left-[17px] before:top-2 before:w-px before:bg-slate-200">
        {items.map((it, i) => (
          <div key={it.title} className="relative flex gap-3 opacity-0 animate-[fadeIn_0.4s_ease_forwards]" style={{ animationDelay: `${i * 100}ms` }}>
            <span className={`relative -ml-5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${it.color} text-sm ring-4 ring-white`}>{it.icon}</span>
            <div className="min-w-0 rounded-xl bg-cream px-3 py-2">
              <p className="text-xs font-semibold text-slate-800">{it.title}</p>
              <p className="truncate text-xs text-slate-500">{it.note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldVisual() {
  return (
    <div className={`${card} overflow-hidden`}>
      <svg viewBox="0 0 400 220" className="h-56 w-full bg-[#eef4ef]" role="img" aria-label="Sample route with four visits">
        <path d="M0 60h400M0 150h400M90 0v220M230 0v220M330 0v220" stroke="#fff" strokeWidth="10" />
        <path d="M30 190 C 70 160, 80 110, 110 95 S 180 120, 210 80 S 290 40, 320 60 S 360 120, 380 100" fill="none" stroke="#059669" strokeWidth="5" strokeLinecap="round" strokeDasharray="600" strokeDashoffset="600" className="animate-[dash_1.6s_ease_forwards]" />
        <circle cx="30" cy="190" r="7" fill="#0f172a" />
        {[[110, 95], [210, 80], [320, 60], [380, 100]].map(([cx, cy], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r="12" fill="#059669" />
            <text x={cx} y={cy + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">{i + 1}</text>
          </g>
        ))}
      </svg>
      <div className="grid grid-cols-3 divide-x divide-slate-100 text-center">
        {[["Distance", "24.6 km"], ["Visits", "4"], ["Pending upload", "0"]].map(([k, v]) => (
          <div key={k} className="px-2 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{k}</p>
            <p className="text-base font-bold text-slate-900">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkflowVisual() {
  const stages = [
    { name: "Sales", tone: "border-sky-200 bg-sky-50 text-sky-700", items: ["Closed won ✓"] },
    { name: "Legal", tone: "border-violet-200 bg-violet-50 text-violet-700", items: ["Agreement uploaded", "Approved ✓"] },
    { name: "Finance", tone: "border-brand-200 bg-brand-50 text-brand-700", items: ["Invoice INV-2041", "Payment received ✓"] },
  ];
  return (
    <div className={`${card} p-4`}>
      <p className="text-sm font-bold text-slate-900">City Hospital · ₹3.1L</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {stages.map((s, i) => (
          <div key={s.name} className="relative opacity-0 animate-[fadeIn_0.4s_ease_forwards]" style={{ animationDelay: `${i * 200}ms` }}>
            <div className={`rounded-xl border p-3 ${s.tone}`}>
              <p className="text-xs font-bold uppercase tracking-wide">{s.name}</p>
              {s.items.map((it) => <p key={it} className="mt-1.5 text-xs text-slate-700">{it}</p>)}
            </div>
            {i < stages.length - 1 ? <span className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-slate-300 sm:block">→</span> : null}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">
        <span>✓</span> Deal completed — every team worked on the same record
      </div>
    </div>
  );
}

function AnalyticsVisual() {
  const bars = [42, 58, 35, 70, 64, 88, 76];
  const sources = [["Website", "38%", "bg-brand-500"], ["Referral", "24%", "bg-indigo-500"], ["Calls", "21%", "bg-amber-500"], ["Others", "17%", "bg-slate-300"]];
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-900">Leads this week</p>
        <span className="text-xs font-semibold text-brand-600">▲ 18%</span>
      </div>
      <div className="mt-4 flex h-32 items-end gap-2">
        {bars.map((h, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="motion-grow w-full rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400" style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }} />
            <span className="text-[10px] text-slate-400">{"MTWTFSS"[i]}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {sources.map(([name, pct, dot]) => (
          <div key={name} className="flex items-center gap-2 rounded-lg bg-cream px-2.5 py-1.5 text-xs">
            <span className={`h-2 w-2 rounded-full ${dot}`} />
            <span className="flex-1 text-slate-600">{name}</span>
            <span className="font-semibold text-slate-900">{pct}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const FEATURE_VISUALS = {
  leads: LeadsVisual,
  "follow-ups": FollowUpsVisual,
  communication: CommsVisual,
  field: FieldVisual,
  workflow: WorkflowVisual,
  analytics: AnalyticsVisual,
};
