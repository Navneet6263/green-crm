import LandingIcon from "./LandingIcon";
import { sectionPadding, sectionTitle, sectionSub, iconBgSoft } from "./landing-styles";

const CASES = [
  { icon: "spark", title: "Sales Teams", desc: "Track every lead, call, and follow-up. Never miss a hot prospect again." },
  { icon: "pulse", title: "Startups", desc: "Affordable CRM that grows with you. No enterprise bloat, just what you need." },
  { icon: "grid", title: "Field Sales", desc: "Attendance with geo-fencing, location tracking, and mobile-first design." },
  { icon: "shield", title: "Multi-Branch", desc: "Role-based access, team management, and branch-level reporting." },
];

export default function LandingUseCases() {
  return (
    <section id="why-greencrm" className={`${sectionPadding} bg-gradient-to-b from-slate-50 to-white`}>
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-widest text-emerald-600">Why GreenCRM</p>
            <h2 className={`${sectionTitle} mt-2`}>Built for how Indian businesses actually sell</h2>
            <p className={`${sectionSub}`}>Not another complex enterprise tool. GreenCRM is fast, simple, and designed for teams that close deals on calls and WhatsApp.</p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {["Lead Pipeline", "Call Tracking", "WhatsApp CRM", "Attendance", "Analytics", "Multi-product"].map(f => (
                <div key={f} className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium text-emerald-800">{f}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {CASES.map(c => (
              <div key={c.title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${iconBgSoft}`}><LandingIcon name={c.icon} /></span>
                <h3 className="mt-4 text-base font-bold text-slate-900">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
