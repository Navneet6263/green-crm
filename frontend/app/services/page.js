import MarketingPage, { CtaBanner, PageHero, SectionHeader } from "../../components/landing/MarketingPage";
import { COMPANY, GREENCALL_SERVICES, SISTER_PRODUCTS } from "../../components/landing/landing-data";
import { buildMetadata } from "../../lib/seo";

export const metadata = buildMetadata({
  title: "IT Services & Business Software | Green Call Technology, Noida",
  description:
    "Green Call Technology, the team behind GreenCRM, offers website, mobile app and web app development, custom AI, digital marketing, payroll processing, IT staffing and BPO services.",
  path: "/services",
  keywords: ["Green Call Technology services", "software company Noida", "app development Noida", "website development Noida", "IT staffing Noida"],
});

const ICONS = ["🌐", "📱", "🧩", "🤖", "📣", "💼", "👥", "🎧"];

export default function ServicesPage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow={`Services by ${COMPANY.name}`}
        title="Technology services from the team behind GreenCRM"
        description="Beyond our own products, we build websites, apps and AI solutions, run digital marketing, and support businesses with payroll, staffing and BPO."
        primary={{ label: "Talk to Us →", href: "/contact" }}
      />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Our services" title="What we can do for your business" />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {GREENCALL_SERVICES.map((s, i) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="group flex flex-col rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-2xl">{ICONS[i]}</span>
                <h3 className="mt-5 text-base font-bold text-slate-900 group-hover:text-brand-700">{s.label}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{s.desc}</p>
                <span className="mt-5 text-sm font-semibold text-brand-700">Learn more ↗</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cream px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Our products" title="Business software, ready to use" description="GreenCRM is one of our products. Here are the others." />
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SISTER_PRODUCTS.map((p) => (
              <a key={p.label} href={p.href} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-sm transition hover:border-brand-200 hover:shadow-md">
                <div>
                  <p className="font-bold text-slate-900 group-hover:text-brand-700">{p.label}</p>
                  <p className="mt-1 text-sm text-slate-500">{p.desc}</p>
                </div>
                <span className="text-slate-300 group-hover:text-brand-600">↗</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner title="Have a project in mind?" description="Tell us what you need — a CRM rollout, an app, a website or a team. We will get back to you." />
    </MarketingPage>
  );
}
