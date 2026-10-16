import Link from "next/link";

const TEAMS = [
  { emoji: "🧑‍💼", title: "Sales reps", tone: "from-brand-700 to-brand-400", points: ["Their own leads and tasks", "Call and WhatsApp in one tap", "Follow-up reminders"] },
  { emoji: "🧭", title: "Managers", tone: "from-indigo-500 to-violet-500", points: ["Whole team's pipeline", "Assign and reassign leads", "Team performance"] },
  { emoji: "🏃", title: "Field staff", tone: "from-amber-500 to-orange-500", points: ["Android app on the go", "GPS route and visits", "Lead photos"] },
  { emoji: "⚖️", title: "Legal team", tone: "from-sky-500 to-cyan-500", points: ["Only won deals reach them", "Agreements and documents", "Approve and pass on"] },
  { emoji: "💰", title: "Finance team", tone: "from-rose-500 to-pink-500", points: ["Deals cleared by legal", "Invoice and tax invoice", "Payment tracking"] },
  { emoji: "👑", title: "Owners & admins", tone: "from-slate-700 to-slate-900", points: ["Company-wide dashboards", "Users, roles and teams", "Audit logs and attendance"] },
];

export default function TeamsSection() {
  return (
    <section id="why-greencrm" className="relative overflow-hidden bg-gradient-to-b from-white via-cream to-white px-4 py-24 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-gold-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-10 h-96 w-96 rounded-full bg-brand-200/30 blur-3xl" />
      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[12px] font-bold uppercase tracking-widest text-brand-600">Built for every team</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">One CRM. Everyone sees what they need.</h2>
          </div>
          <Link href="/security" className="text-sm font-semibold text-brand-700 hover:text-brand-800">How access works →</Link>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TEAMS.map((t) => (
            <article key={t.title} className="group relative overflow-hidden rounded-3xl border border-white bg-white/90 p-7 shadow-[0_20px_50px_-30px_rgba(12,96,93,0.35)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_-30px_rgba(12,96,93,0.5)]">
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${t.tone} opacity-0 transition group-hover:opacity-100`} />
              <span className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${t.tone} text-2xl shadow-lg`}>{t.emoji}</span>
              <h3 className="mt-5 text-xl font-bold text-slate-900">{t.title}</h3>
              <ul className="mt-4 space-y-2">
                {t.points.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
