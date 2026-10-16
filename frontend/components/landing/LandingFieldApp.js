import Link from "next/link";
import { btnPrimary, sectionPadding, sectionTitle, sectionSub } from "./landing-styles";

const POINTS = [
  { title: "Route on the map", desc: "Field staff tap Start tracking and their route is recorded with GPS, with an estimated distance for the day." },
  { title: "Visit check-ins", desc: "Mark every client visit with a named Reached check-in, shown in order on the route." },
  { title: "Works without internet", desc: "Tracking and check-ins are saved on the phone in encrypted storage and upload when the network returns." },
  { title: "Leads in the pocket", desc: "Reps see their leads and tasks, add notes and follow-ups, and attach up to three photos to a lead." },
];

const VISITS = [
  { name: "Sharma Traders", time: "10:42 am" },
  { name: "City Hospital", time: "12:15 pm" },
  { name: "Metro Builders", time: "3:30 pm" },
];

export function PhoneMock() {
  return (
    <div className="relative mx-auto w-[280px] rounded-[2.5rem] border-[10px] border-slate-900 bg-white shadow-2xl shadow-slate-900/20">
      <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-slate-200" />
      <div className="px-4 pb-5 pt-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900">Today&apos;s route</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
            Tracking
          </span>
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100 bg-[#eef4ef]">
          <svg viewBox="0 0 240 150" className="h-[150px] w-full" role="img" aria-label="Sample sales route with three visits">
            <path d="M0 40h240M0 95h240M60 0v150M150 0v150" stroke="#ffffff" strokeWidth="8" />
            <path d="M24 128 C 50 100, 58 70, 72 58 S 120 70, 138 48 S 190 30, 214 30" fill="none" stroke="#059669" strokeWidth="4" strokeLinecap="round" />
            <circle cx="24" cy="128" r="6" fill="#0f172a" />
            {[[72, 58], [138, 48], [214, 30]].map(([cx, cy], i) => (
              <g key={i}>
                <circle cx={cx} cy={cy} r="10" fill="#059669" />
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffffff">{i + 1}</text>
              </g>
            ))}
          </svg>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-cream px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Distance</p>
            <p className="text-base font-bold text-slate-900">18.4 km</p>
          </div>
          <div className="rounded-xl bg-cream px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Visits</p>
            <p className="text-base font-bold text-slate-900">3</p>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {VISITS.map((v, i) => (
            <div key={v.name} className="flex items-center gap-2.5 rounded-xl border border-slate-100 px-3 py-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">{i + 1}</span>
              <p className="flex-1 truncate text-xs font-semibold text-slate-800">{v.name}</p>
              <p className="text-[11px] text-slate-400">{v.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingFieldApp() {
  return (
    <section id="field-app" className={`${sectionPadding} relative overflow-hidden bg-gradient-to-b from-white to-brand-50/50`}>
      <div className="pointer-events-none absolute right-0 top-1/4 h-[28rem] w-[28rem] rounded-full bg-gold-200/40 blur-3xl" />
      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-widest text-brand-600">Field Sales App</p>
            <h2 className={`${sectionTitle} mt-2`}>Your field team&apos;s whole day, recorded on their phone</h2>
            <p className={sectionSub}>
              GreenCRM comes with an Android app for your sales staff. Routes and visits are saved to your CRM, and leads and follow-ups stay in sync with the web workspace.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {POINTS.map((p) => (
                <div key={p.title} className="rounded-2xl border border-white bg-white p-5 shadow-[0_20px_50px_-30px_rgba(12,96,93,0.4)]">
                  <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <span className="h-2 w-2 rounded-full bg-brand-500" />
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{p.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link href="/field-sales-app" className={btnPrimary}>Explore the Field App →</Link>
            </div>
          </div>
          <div className="relative pb-10">
            <img src="/illustrations/field-rep.svg" alt="Field sales rep on a GPS-tracked route" className="w-full drop-shadow-[0_30px_50px_rgba(12,96,93,0.18)]" />
            <div className="absolute -bottom-6 right-0 hidden origin-bottom-right scale-[0.62] sm:block lg:-right-6">
              <PhoneMock />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
