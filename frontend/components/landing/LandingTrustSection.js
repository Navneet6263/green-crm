import { sectionPadding } from "./landing-styles";

const HIGHLIGHTS = [
  { title: "Android Sales App", label: "Leads, tasks and photos on the phone", icon: "📱" },
  { title: "GPS Route Tracking", label: "Saved offline, synced when online", icon: "📍" },
  { title: "Attendance", label: "Punch in and out with location", icon: "🕒" },
  { title: "Secure by Role", label: "Role-based access and audit logs", icon: "🔒" },
];

export default function LandingTrustSection() {
  return (
    <section className={sectionPadding}>
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/30 px-8 py-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {HIGHLIGHTS.map(t => (
              <div key={t.title} className="text-center">
                <span className="text-2xl">{t.icon}</span>
                <p className="mt-2 text-lg font-bold text-slate-900">{t.title}</p>
                <p className="mt-1 text-sm text-slate-500">{t.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
