import LandingIcon from "./LandingIcon";
import { sectionPadding, sectionTitle, sectionSub, cardGlass, iconBg } from "./landing-styles";

const FEATURES = [
  { icon: "layers", title: "Lead Management", desc: "Capture, assign, and track every lead from first enquiry to deal closure." },
  { icon: "notes", title: "Follow-up Notes & Calls", desc: "Log call outcomes, add notes, and never forget what was discussed." },
  { icon: "calendar", title: "Smart Reminders", desc: "Auto-schedule follow-ups so no lead goes cold. Get notified before deadlines." },
  { icon: "history", title: "Activity Timeline", desc: "See every call, note, status change, and task in one chronological view." },
  { icon: "users", title: "Team & Role Access", desc: "Assign leads to the right person. Managers see everything, reps see their own." },
  { icon: "documents", title: "WhatsApp & Communication", desc: "Follow up via WhatsApp, email, and calls — all tracked inside the CRM." },
];

export default function LandingFeatureHighlights() {
  return (
    <section id="features" className={sectionPadding}>
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <p className="text-[12px] font-bold uppercase tracking-widest text-emerald-600">Features</p>
          <h2 className={`${sectionTitle} mt-2`}>Everything your sales team needs</h2>
          <p className={`${sectionSub} mx-auto`}>From lead capture to deal closure — one workspace for your entire sales process.</p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(f => (
            <article key={f.title} className={cardGlass}>
              <span className={`grid h-12 w-12 place-items-center rounded-xl ${iconBg}`}>
                <LandingIcon name={f.icon} />
              </span>
              <h3 className="mt-5 text-lg font-bold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
