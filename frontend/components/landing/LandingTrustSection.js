import { sectionPadding } from "./landing-styles";

const TRUST = [
  { value: "500+", label: "Businesses Trust Us", icon: "🏢" },
  { value: "10K+", label: "Leads Managed Monthly", icon: "📈" },
  { value: "50K+", label: "Follow-ups Completed", icon: "📞" },
  { value: "99.9%", label: "Platform Uptime", icon: "⚡" },
];

export default function LandingTrustSection() {
  return (
    <section className={sectionPadding}>
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/30 px-8 py-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST.map(t => (
              <div key={t.label} className="text-center">
                <span className="text-2xl">{t.icon}</span>
                <p className="mt-2 text-3xl font-bold text-slate-900">{t.value}</p>
                <p className="mt-1 text-sm text-slate-500">{t.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
