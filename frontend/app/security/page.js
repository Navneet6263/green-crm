import LandingIcon from "../../components/landing/LandingIcon";
import MarketingPage, { CtaBanner, PageHero, SectionHeader } from "../../components/landing/MarketingPage";
import { buildMetadata } from "../../lib/seo";

export const metadata = buildMetadata({
  title: "Security at GreenCRM | How We Protect Your Sales Data",
  description:
    "How GreenCRM protects your data: separate data for every company, role-based access, audit logs, secure sign-in, encrypted offline storage on phones and private lead photos.",
  path: "/security",
  keywords: ["secure CRM India", "CRM data security", "role based access CRM", "GreenCRM security"],
});

const PILLARS = [
  { icon: "grid", title: "Every company's data kept separate", desc: "Each company works in its own workspace. Users only ever see records from their own company." },
  { icon: "users", title: "Role-based access", desc: "Sales see their own leads, managers their team, admins the whole company. Viewer, legal and finance roles see only what they need." },
  { icon: "history", title: "Audit logs", desc: "Important actions — user and team changes, tasks, attendance and deal workflow steps — are logged with who did what and when." },
  { icon: "shield", title: "Secure sign-in", desc: "Passwords are stored as salted hashes, never in plain text. Sign-in, OTP and password reset requests are rate limited." },
  { icon: "spark", title: "One-time email codes", desc: "Mobile users can sign in with a short-lived, single-use code sent to their work email." },
  { icon: "path", title: "Sessions end on logout", desc: "When a user logs out, their session token is revoked on the server and cannot be reused." },
  { icon: "layers", title: "Encrypted on the phone", desc: "The field app keeps its offline tracking queue in encrypted storage and sign-in tokens in the phone's secure store." },
  { icon: "documents", title: "Private lead photos", desc: "Photos attached to leads are not public links. They can only be opened by signed-in users allowed to see that lead." },
];

export default function SecurityPage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Security"
        title="Your sales data, protected at every step"
        description="Your leads and customers are your business. Here is how GreenCRM keeps them safe — in the browser, on the server and on your team's phones."
        primary={{ label: "Ask a Security Question", href: "/contact" }}
        secondary={{ label: "Book a Demo", href: "/book-demo" }}
      />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="How we protect you" title="Security built into the product" description="Not an add-on. These protections are on for every company from day one." />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <article key={p.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><LandingIcon name={p.icon} /></span>
                <h3 className="mt-5 text-base font-bold text-slate-900">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{p.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cream px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
          <SectionHeader align="left" eyebrow="Your control" title="Admins decide who sees what" description="Add or remove users, change roles and organise teams from settings. When someone leaves, deactivate them and their access stops." />
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {[
              ["Admin", "Whole company"],
              ["Manager", "Their team"],
              ["Sales", "Their own leads"],
              ["Legal / Finance", "Deals at their stage"],
              ["Viewer", "Read only"],
            ].map(([role, scope]) => (
              <div key={role} className="flex items-center justify-between border-b border-slate-100 py-3.5 last:border-0">
                <span className="text-sm font-semibold text-slate-800">{role}</span>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{scope}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner title="Have a security question?" description="Our team will walk you through how GreenCRM handles your data." />
    </MarketingPage>
  );
}
