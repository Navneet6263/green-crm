import { sectionPadding, sectionTitle, sectionSub } from "./landing-styles";

const PROBLEMS = [
  { emoji: "😰", title: "Missed Follow-ups", desc: "Important callbacks slip through when reminders live in WhatsApp, sticky notes, and memory." },
  { emoji: "📊", title: "Excel Chaos", desc: "Leads get lost in spreadsheets. No one knows who called whom, or what was discussed." },
  { emoji: "🔇", title: "No Call Tracking", desc: "Sales calls happen but outcomes aren't logged. Managers have zero visibility." },
  { emoji: "🤷", title: "No Ownership", desc: "When 5 people handle leads, nobody knows who's responsible for the next action." },
];

export default function LandingProblem() {
  return (
    <section className={`${sectionPadding} bg-slate-50`}>
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <p className="text-[12px] font-bold uppercase tracking-widest text-rose-500">The Problem</p>
          <h2 className={`${sectionTitle} mt-2`}>Your sales team is losing deals every day</h2>
          <p className={`${sectionSub} mx-auto`}>Without a proper CRM, leads fall through cracks, follow-ups get missed, and revenue walks out the door.</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEMS.map(p => (
            <div key={p.title} className="rounded-2xl border border-rose-100 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-rose-100/50">
              <span className="text-3xl">{p.emoji}</span>
              <h3 className="mt-4 text-base font-bold text-slate-900">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
