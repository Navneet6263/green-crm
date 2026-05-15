import { sectionPadding, sectionTitle, sectionSub } from "./landing-styles";

const STEPS = [
  { num: "01", title: "New Lead Captured", desc: "From website, call, or referral — every enquiry enters the system.", color: "bg-blue-600" },
  { num: "02", title: "Call Connected", desc: "One-click calling with auto-logged outcomes and duration.", color: "bg-indigo-600" },
  { num: "03", title: "Notes Added", desc: "Record what was discussed, customer pain points, and requirements.", color: "bg-violet-600" },
  { num: "04", title: "Follow-up Scheduled", desc: "Set the next action with date, time, and auto-reminder.", color: "bg-amber-500" },
  { num: "05", title: "Deal Closed ✓", desc: "Lead converts to customer. Full history preserved forever.", color: "bg-emerald-600" },
];

export default function LandingWorkflow() {
  return (
    <section id="workflow" className={`${sectionPadding} bg-slate-900`}>
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <p className="text-[12px] font-bold uppercase tracking-widest text-emerald-400">How It Works</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">From lead to deal in 5 simple steps</h2>
          <p className="mt-4 mx-auto max-w-2xl text-base leading-relaxed text-slate-400">No complexity. No training needed. Your team starts closing deals from day one.</p>
        </div>

        <div className="mt-14 relative">
          {/* Connection line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-blue-600 via-violet-600 to-emerald-600 hidden lg:block" />

          <div className="grid gap-6 lg:grid-cols-5">
            {STEPS.map((s, i) => (
              <div key={s.num} className="relative flex flex-col items-center text-center">
                <span className={`grid h-12 w-12 place-items-center rounded-full ${s.color} text-sm font-bold text-white shadow-lg`}>{s.num}</span>
                {i < STEPS.length - 1 ? <div className="h-6 w-px bg-slate-700 lg:hidden" /> : null}
                <h3 className="mt-4 text-sm font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400 max-w-[180px]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
