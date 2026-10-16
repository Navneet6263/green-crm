import Link from "next/link";
import MarketingPage, { PageHero } from "../../components/landing/MarketingPage";
import { COMPANY } from "../../components/landing/landing-data";
import { buildMetadata } from "../../lib/seo";

export const metadata = buildMetadata({
  title: "Contact GreenCRM | Call, Email or WhatsApp Our Noida Team",
  description:
    "Contact the GreenCRM team at Green Call Technology, Noida. Call +91 120 310 1985, email reachus@greencall.in, chat on WhatsApp or book a free demo.",
  path: "/contact",
  keywords: ["contact GreenCRM", "GreenCRM phone number", "CRM company Noida contact", "Green Call Technology contact"],
});

const CHANNELS = [
  { title: "Book a demo", desc: "See GreenCRM with your own workflow in 30 minutes.", action: "Pick a time →", href: "/book-demo", internal: true, accent: true },
  { title: "Call us", desc: "Talk to our team directly.", action: COMPANY.phone, href: COMPANY.phoneHref },
  { title: "Email us", desc: "For sales, support or partnership questions.", action: COMPANY.email, href: `mailto:${COMPANY.email}` },
  { title: "WhatsApp", desc: "Quick questions? Message us anytime.", action: "Start a chat ↗", href: COMPANY.whatsappHref, external: true },
];

export default function ContactPage() {
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(COMPANY.address)}&z=15&output=embed`;

  return (
    <MarketingPage>
      <PageHero
        eyebrow="Contact"
        title="Let's talk about your sales team"
        description="Whether you want a demo, have a question about pricing or need help with your account — we are a call, email or WhatsApp away."
        primary={null}
      />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CHANNELS.map((c) => {
            const className = `group flex flex-col rounded-3xl border p-6 transition hover:-translate-y-0.5 hover:shadow-lg ${c.accent ? "border-brand-600 bg-gradient-to-br from-brand-700 to-brand-500 text-white" : "border-slate-100 bg-white shadow-sm"}`;
            const body = (
              <>
                <h2 className={`text-lg font-bold ${c.accent ? "text-white" : "text-slate-900"}`}>{c.title}</h2>
                <p className={`mt-2 flex-1 text-sm leading-relaxed ${c.accent ? "text-brand-50" : "text-slate-500"}`}>{c.desc}</p>
                <span className={`mt-6 break-all text-sm font-semibold ${c.accent ? "text-white" : "text-brand-700"}`}>{c.action}</span>
              </>
            );
            return c.internal ? (
              <Link key={c.title} href={c.href} className={className}>{body}</Link>
            ) : (
              <a key={c.title} href={c.href} className={className} {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{body}</a>
            );
          })}
        </div>
      </section>

      <section className="bg-cream px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-stretch">
          <div className="flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Office</p>
              <h2 className="mt-3 text-2xl font-bold text-slate-900">{COMPANY.name}</h2>
              <p className="mt-3 text-base leading-relaxed text-slate-600">{COMPANY.address}</p>
            </div>
            <div className="mt-8 grid gap-3 text-sm">
              <a href={COMPANY.mapUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 hover:text-brand-800">Get directions ↗</a>
              <Link href="/login" className="text-slate-500 hover:text-brand-700">Already a customer? Log in to GreenCRM →</Link>
            </div>
          </div>
          <div className="min-h-[320px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm">
            <iframe title={`Map of ${COMPANY.name} office`} src={mapSrc} className="h-full min-h-[320px] w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </div>
      </section>
    </MarketingPage>
  );
}
