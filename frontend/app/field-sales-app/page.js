import MarketingPage, { CheckList, CtaBanner, PageHero, SectionHeader } from "../../components/landing/MarketingPage";
import { PhoneMock } from "../../components/landing/LandingFieldApp";
import { buildMetadata } from "../../lib/seo";

export const metadata = buildMetadata({
  title: "Field Sales App with GPS Route Tracking | GreenCRM Android App",
  description:
    "GreenCRM's Android app lets field sales staff work on leads and tasks, attach photos, and record their route with GPS — even without internet. Built for Indian field sales teams.",
  path: "/field-sales-app",
  keywords: ["field sales app India", "GPS tracking CRM app", "sales tracking app", "CRM mobile app India", "offline sales app"],
});

const STEPS = [
  { title: "Tap Start tracking", desc: "The rep starts their day in the app. Nothing is recorded before this." },
  { title: "Route is recorded", desc: "GPS keeps recording while the phone is locked or in the pocket." },
  { title: "Mark each visit", desc: "A named Reached check-in marks every client visit on the route." },
  { title: "Synced to the CRM", desc: "Data uploads automatically when there is network, or with one tap." },
];

const TOOLS = [
  {
    title: "Leads on the go",
    points: ["My Leads list with search and filters", "Lead details, history and conversation notes", "Add new leads with all sales fields", "Export selected columns to CSV"],
  },
  {
    title: "Follow-ups & tasks",
    points: ["Update status and schedule follow-ups", "Add notes after every meeting", "My Tasks with due dates", "In-app notifications"],
  },
  {
    title: "Photos as proof",
    points: ["Attach up to 3 photos per lead", "Camera or gallery", "Photos are compressed before upload", "Only authorised users can view them"],
  },
  {
    title: "Route map",
    points: ["Google Maps on Android", "Route lines and numbered visit pins", "Estimated distance for the day", "Bad or fake GPS points left out of distance"],
  },
];

const TRUST = [
  { title: "Works without internet", desc: "Tracking and check-ins are stored on the phone and upload when the network returns." },
  { title: "Encrypted on the phone", desc: "The offline queue is kept in encrypted storage, and sign-in tokens in the phone's secure store." },
  { title: "Employee in control", desc: "Tracking runs only after the rep taps Start and can be stopped anytime from the app." },
  { title: "Simple sign-in", desc: "Sign in with password or a one-time code sent to the work email." },
];

export default function FieldSalesAppPage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Field Sales App · Android"
        title="Your field team's day, recorded on their phone"
        description="Leads, follow-ups, photos and GPS route tracking in one Android app — connected to the same GreenCRM your office uses."
        secondary={{ label: "All Features", href: "/features" }}
        visual={<PhoneMock />}
      />

      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/70 via-white to-gold-50/40 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[12px] font-bold uppercase tracking-widest text-brand-600">How tracking works</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Four steps, no extra work for the rep</h2>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-2xl border border-brand-100 bg-white p-6 shadow-[0_20px_50px_-30px_rgba(12,96,93,0.4)]">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gold-400 text-sm font-bold text-brand-950">{i + 1}</span>
                <h3 className="mt-4 text-base font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="In the app" title="Everything a sales rep needs outside the office" />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map((t) => (
              <article key={t.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">{t.title}</h3>
                <CheckList items={t.points} className="mt-4" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-50/50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Built for the real world" title="Reliable in the field, respectful of privacy" />
          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {TRUST.map((t) => (
              <div key={t.title} className="flex gap-4 rounded-2xl border border-brand-100 bg-white p-6">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">{t.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner title="See the field app on a real phone" description="Book a demo and we will show the app, route tracking and the CRM side together." />
    </MarketingPage>
  );
}
