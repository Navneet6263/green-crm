import Link from "next/link";
import MarketingPage, { CtaBanner, PageHero, SectionHeader } from "../../components/landing/MarketingPage";
import { COMPANY, SISTER_PRODUCTS } from "../../components/landing/landing-data";
import { buildMetadata } from "../../lib/seo";

export const metadata = buildMetadata({
  title: "About GreenCRM | Built by Green Call Technology, Noida",
  description:
    "GreenCRM is a sales CRM built in Noida by Green Call Technology for Indian sales and field teams. Learn about our mission, values and family of business software.",
  path: "/about",
  keywords: ["about GreenCRM", "Green Call Technology", "CRM company Noida", "Indian CRM company"],
});

// Quoted from greencall.in/about-us.aspx.
const BELIEFS = [
  { label: "Mission", text: "Our mission is to deliver superior software and IT solutions globally that exceed our clients' needs." },
  { label: "Vision", text: "Our vision is to empower businesses with innovative technology solutions." },
  { label: "Values", text: "Our values are embracing innovation, delivering exceptional quality, and upholding integrity in all interactions." },
];

const PRINCIPLES = [
  { title: "Built for how India sells", desc: "Calls and WhatsApp first, teams across branches, and deals that pass through legal and finance." },
  { title: "Field teams are first-class", desc: "An Android app with offline GPS tracking, because many sales happen outside the office." },
  { title: "Simple enough for day one", desc: "A clean workspace each role understands quickly, without weeks of setup." },
  { title: "Your data stays yours", desc: "Every company's data is kept separate, with role-based access and audit logs." },
];

export default function AboutPage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="About Us"
        title="Built in Noida for Indian sales teams"
        description={`GreenCRM is built by ${COMPANY.name}, a Noida-based software company that creates business software and technology services. We built GreenCRM because sales teams deserve better than spreadsheets and scattered WhatsApp chats.`}
        secondary={{ label: "Contact Us", href: "/contact" }}
        visual={<img src="/illustrations/sales-team.svg" alt="The GreenCRM team at work" className="w-full" />}
      />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="What drives us" title={`${COMPANY.name}`} />
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {BELIEFS.map((b) => (
              <figure key={b.label} className="rounded-3xl border border-slate-100 bg-gradient-to-b from-brand-50/60 to-white p-7">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{b.label}</p>
                <blockquote className="mt-4 text-lg font-medium leading-relaxed text-slate-800">&ldquo;{b.text}&rdquo;</blockquote>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cream px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="How we build GreenCRM" title="Four principles behind the product" />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map((p, i) => (
              <div key={p.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <span className="text-sm font-bold text-brand-600">0{i + 1}</span>
                <h3 className="mt-3 text-base font-bold text-slate-900">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader align="left" eyebrow="Our product family" title="More software from Green Call" description="GreenCRM is part of a family of business products. We also offer IT services — websites, apps, AI, digital marketing and more." />
            <Link href="/services" className="mt-6 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800">See our services →</Link>
          </div>
          <div className="grid gap-3">
            {SISTER_PRODUCTS.map((p) => (
              <a key={p.label} href={p.href} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm transition hover:border-brand-200 hover:shadow-md">
                <div>
                  <p className="font-semibold text-slate-900 group-hover:text-brand-700">{p.label}</p>
                  <p className="text-sm text-slate-500">{p.desc}</p>
                </div>
                <span className="text-slate-300 group-hover:text-brand-600">↗</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-3xl border border-brand-100 bg-gradient-to-r from-brand-50 via-white to-gold-50 px-8 py-10 shadow-[0_30px_80px_-40px_rgba(12,96,93,0.45)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Visit us</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{COMPANY.address}</p>
          </div>
          <a href={COMPANY.mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:-translate-y-0.5">
            Open in Google Maps ↗
          </a>
        </div>
      </section>

      <CtaBanner />
    </MarketingPage>
  );
}
