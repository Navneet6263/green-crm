const ROWS = [
  ["Leads scattered across Excel sheets and WhatsApp chats", "Every lead in one place, with a clear owner"],
  ["Follow-ups depend on someone's memory", "Reminders for every follow-up, before it is due"],
  ["No idea where the field team went today", "GPS route and visit check-ins from the app"],
  ["Won deals stuck in emails between sales, legal and finance", "Deals move to legal, then finance, on the same record"],
  ["Managers call every rep for a status update", "Dashboards show the team's day at a glance"],
];

export default function BeforeAfter() {
  return (
    <section className="relative overflow-hidden bg-cream px-4 py-24 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -right-32 -top-20 h-96 w-96 rounded-full bg-gold-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 -bottom-20 h-96 w-96 rounded-full bg-brand-200/30 blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[12px] font-bold uppercase tracking-widest text-brand-600">The difference</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Your sales day, before and after GreenCRM</h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-rose-100 bg-white p-7 shadow-[0_20px_50px_-30px_rgba(225,29,72,0.25)]">
            <p className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-rose-600">😩 Without GreenCRM</p>
            <ul className="mt-6 space-y-4">
              {ROWS.map(([before]) => (
                <li key={before} className="flex gap-3 text-[15px] leading-relaxed text-slate-500">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-rose-50 text-xs font-bold text-rose-500">✕</span>
                  {before}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-500 p-7 text-white shadow-[0_30px_80px_-30px_rgba(12,96,93,0.6)]">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <p className="relative inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">🚀 With GreenCRM</p>
            <ul className="relative mt-6 space-y-4">
              {ROWS.map(([, after]) => (
                <li key={after} className="flex gap-3 text-[15px] font-medium leading-relaxed">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-brand-700">✓</span>
                  {after}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
