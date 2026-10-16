import Link from "next/link";
import LandingIcon from "../../components/landing/LandingIcon";
import MarketingPage, { CheckList, CtaBanner, PageHero, SectionHeader } from "../../components/landing/MarketingPage";
import { buildMetadata } from "../../lib/seo";

export const metadata = buildMetadata({
  title: "GreenCRM Features | Lead Management, Calling, WhatsApp & Field Tracking",
  description:
    "Explore GreenCRM features: lead management, follow-ups, click-to-call, WhatsApp, SMS, teams and roles, sales to legal to finance workflow, attendance, Android field app and analytics.",
  path: "/features",
  keywords: ["GreenCRM features", "CRM features India", "lead management software", "CRM with WhatsApp", "CRM with calling", "field sales CRM"],
});

const GROUPS = [
  {
    id: "leads",
    short: "Leads",
    icon: "layers",
    title: "Lead Management",
    desc: "Every enquiry in one clean record, owned by the right person.",
    points: [
      "Custom lead statuses and custom fields for your process",
      "Assign leads to users, teams and products",
      "Duplicate phone check within a team",
      "Filters that stay saved while you work",
      "Bulk upload from CSV with preview and error report",
      "Export filtered lists to CSV, Excel or HTML",
    ],
  },
  {
    id: "follow-ups",
    short: "Follow-ups",
    icon: "calendar",
    title: "Follow-ups, Tasks & Notes",
    desc: "The next step is always visible, so leads do not go cold.",
    points: [
      "Follow-up dates with reminders and notifications",
      "Tasks, calendar and a My Day view for each rep",
      "Notes on leads and customers, with pins and tags",
      "Full history of every change, call and note",
      "Recent updates page across the team",
    ],
  },
  {
    id: "communication",
    short: "Communication",
    icon: "notes",
    title: "Calling, WhatsApp, SMS & Email",
    desc: "Talk to customers from inside the CRM and keep a record of it.",
    points: [
      "Click-to-call through your telephony provider, with call logs",
      "Send WhatsApp and SMS messages from the lead",
      "Email from your own company SMTP",
      "Every conversation logged on the lead timeline",
      "Internal team chat — direct and group",
    ],
  },
  {
    id: "teams",
    short: "Teams & Roles",
    icon: "users",
    title: "Teams, Roles & Access",
    desc: "Each person sees exactly what their job needs.",
    points: [
      "12 ready-made roles — admin, manager, sales, legal, finance, viewer and more",
      "Teams with their own members and leads",
      "Sales see their leads, managers their team, admins the company",
      "Read-only viewer role for auditors or partners",
    ],
  },
  {
    id: "workflow",
    short: "Deal Workflow",
    icon: "path",
    title: "Sales → Legal → Finance Workflow",
    desc: "Won deals move forward without email chains.",
    points: [
      "Closed-won deals move to the legal team automatically",
      "Legal uploads agreements and approves",
      "Finance records invoice, tax invoice and payment",
      "Workflow tracker shows where every deal is",
    ],
  },
  {
    id: "field",
    short: "Field & Attendance",
    icon: "pulse",
    title: "Field Team & Attendance",
    desc: "Know what happened in the field, not just in the office.",
    points: [
      "Punch in and out with location",
      "Android app for leads, tasks, notes and photos",
      "GPS route tracking that works offline",
      "Visit check-ins on the route",
    ],
    link: { label: "Explore the Field Sales App →", href: "/field-sales-app" },
  },
  {
    id: "customers",
    short: "Customers",
    icon: "documents",
    title: "Customers & Documents",
    desc: "Keep everything after the sale in the same place.",
    points: [
      "Convert won leads into customers",
      "Customer notes, activity and onboarding details",
      "Documents stored with the lead — legal and finance separately",
    ],
  },
  {
    id: "analytics",
    short: "Analytics",
    icon: "chart",
    title: "Analytics & Dashboards",
    desc: "See what is working without building spreadsheets.",
    points: [
      "Dashboards for each role",
      "Lead source and status breakdown",
      "Pipeline value and team performance",
      "Performance view for managers",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Features"
        title="Everything your sales team needs, in one CRM"
        description="From the first enquiry to the final invoice — leads, follow-ups, calls, WhatsApp, field work and approvals, built for how Indian businesses sell."
        secondary={{ label: "See the Field App", href: "/field-sales-app" }}
      />

      <div className="sticky top-[69px] z-30 hidden border-b border-slate-100 bg-white/90 backdrop-blur lg:block">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-1 px-8 py-2">
          {GROUPS.map((g) => (
            <a key={g.id} href={`#${g.id}`} className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-brand-50 hover:text-brand-700">{g.short}</a>
          ))}
        </div>
      </div>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="The platform" title="Built around your daily sales work" description="Eight areas that cover the full journey of a lead." />
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {GROUPS.map((g) => (
              <article key={g.id} id={g.id} className="scroll-mt-32 rounded-3xl border border-slate-100 bg-white p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
                <div className="flex items-center gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600"><LandingIcon name={g.icon} /></span>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{g.title}</h2>
                    <p className="text-sm text-slate-500">{g.desc}</p>
                  </div>
                </div>
                <CheckList items={g.points} className="mt-6" />
                {g.link ? <Link href={g.link.href} className="mt-5 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800">{g.link.label}</Link> : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner />
    </MarketingPage>
  );
}
