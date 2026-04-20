import Link from "next/link";

import SiteHeader from "../components/SiteHeader";
import DashboardIcon from "../components/dashboard/icons";
import { absoluteUrl, buildMetadata } from "../lib/seo";

const PRIMARY_BUTTON =
  "inline-flex min-h-[52px] items-center justify-center rounded-[18px] border border-[#10111d] bg-[#10111d] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#1a1c2b]";
const SECONDARY_BUTTON =
  "inline-flex min-h-[52px] items-center justify-center rounded-[18px] border border-[#eadfcd] bg-white px-5 py-3 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:border-[#d7b258] hover:text-[#060710]";
const PANEL =
  "rounded-[28px] border border-[#eadfcd] bg-white/88 p-5 shadow-[0_16px_42px_rgba(79,58,22,0.08)]";

const CORE_MODULES = [
  {
    icon: "leads",
    title: "Lead Pipeline",
    copy: "Capture leads, assign owners, run follow-ups, and keep every stage visible without spreadsheet drift.",
  },
  {
    icon: "customers",
    title: "Customer Management",
    copy: "Move qualified leads into customer records with contact history, company context, and team ownership.",
  },
  {
    icon: "workflow",
    title: "Sales To Legal To Finance",
    copy: "Track workflow handoffs, document gaps, and queue pressure across role-based business stages.",
  },
  {
    icon: "tasks",
    title: "Tasks And Reminders",
    copy: "Keep daily execution moving with reminders, calendars, task queues, and follow-up discipline.",
  },
];

const HIGHLIGHTS = [
  { label: "Role Dashboards", value: "7+", copy: "Admin, manager, sales, marketing, support, legal, and finance views." },
  { label: "One Workspace", value: "100%", copy: "Leads, workflow, customers, products, teams, and analytics stay connected." },
  { label: "Fast Setup", value: "Day 1", copy: "Create the company workspace, onboard the first admin, and start operations." },
];

const FAQS = [
  {
    question: "What is GreenCRM built for?",
    answer:
      "GreenCRM is designed for teams that need one CRM for leads, customers, follow-ups, workflow stages, and team-based operational visibility.",
  },
  {
    question: "Can different roles see different dashboards?",
    answer:
      "Yes. The platform supports role-based dashboards and permissions for admins, managers, sales, marketing, support, legal, and finance users.",
  },
  {
    question: "Does GreenCRM support workflow handoff tracking?",
    answer:
      "Yes. Leads can move across sales, legal, finance, and completion stages while keeping owners, notes, and document status visible.",
  },
];

export const metadata = buildMetadata({
  title: "CRM Software For Leads, Customers, Workflow, and Team Operations",
  description:
    "GreenCRM is a role-based CRM platform for lead management, customer tracking, workflow handoffs, reminders, tasks, and team visibility.",
  path: "/",
});

export default function HomePage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "GreenCRM",
      url: absoluteUrl("/"),
      logo: absoluteUrl("/icon.svg"),
      description:
        "GreenCRM is a role-based CRM platform for lead management, customer tracking, workflow handoffs, reminders, and team operations.",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "GreenCRM",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/"),
      description:
        "GreenCRM helps businesses manage leads, customers, workflow queues, tasks, reminders, and role-based CRM operations in one workspace.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(242,220,164,0.2),_rgba(255,250,242,0.88)_30%,_rgba(255,255,255,1)_100%)] text-[#060710]">
      <SiteHeader landing />
      <main>
        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-16">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/88 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
              CRM Platform
            </span>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-[2.6rem] font-semibold leading-[0.98] tracking-tight md:text-[4.35rem]">
                CRM software for leads, customers, workflow handoffs, and team execution.
              </h1>
              <p className="max-w-3xl text-base leading-8 text-[#6f614c] md:text-lg">
                GreenCRM gives operations, sales, marketing, legal, finance, and support teams one shared system to
                manage lead movement, customer records, reminders, tasks, documents, and role-based dashboards.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/book-demo" className={PRIMARY_BUTTON}>
                Book Demo
              </Link>
              <Link href="/register" className={SECONDARY_BUTTON}>
                Create Workspace
              </Link>
              <Link href="/login" className={SECONDARY_BUTTON}>
                Open Login
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {HIGHLIGHTS.map((item) => (
                <article key={item.label} className={PANEL}>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#9a886d]">{item.label}</p>
                  <strong className="mt-3 block text-[1.9rem] font-black leading-none">{item.value}</strong>
                  <p className="mt-2 text-sm leading-7 text-[#7a6b57]">{item.copy}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[36px] border border-[#ecd9b7] bg-[linear-gradient(145deg,rgba(245,233,201,0.9)_0%,rgba(255,248,235,0.98)_48%,rgba(245,226,174,0.84)_100%)] p-5 shadow-[0_30px_90px_rgba(79,58,22,0.12)] md:p-6">
              <div className="rounded-[30px] border border-[#efe2c8] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(255,249,239,0.98)_50%,_rgba(250,238,207,0.92)_100%)] p-5 md:p-6">
                <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/88 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                  Why Teams Use It
                </span>
                <div className="mt-5 space-y-4">
                  {CORE_MODULES.slice(0, 3).map((item) => (
                    <div key={item.title} className="flex items-start gap-3 rounded-[24px] border border-[#eadfcd] bg-white/88 p-4">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#fff4d9] text-[#8d6e27]">
                        <DashboardIcon name={item.icon} className="h-4 w-4" />
                      </span>
                      <div>
                        <h2 className="text-base font-semibold">{item.title}</h2>
                        <p className="mt-1 text-sm leading-7 text-[#7a6b57]">{item.copy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-2">
            <article className={PANEL}>
              <span className="inline-flex rounded-full border border-[#ddd3c2] bg-[#fffaf1] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                Built For Operations
              </span>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">One CRM across lead capture, follow-up, and post-sale workflow.</h2>
              <p className="mt-3 text-sm leading-8 text-[#746853]">
                Teams often lose visibility between sales updates, customer records, follow-up commitments, and
                workflow transfers. GreenCRM keeps those layers connected so handoffs stay accountable and searchable.
              </p>
            </article>
            <article className={PANEL}>
              <span className="inline-flex rounded-full border border-[#ddd3c2] bg-[#fffaf1] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                Team Visibility
              </span>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">Role-based dashboards without losing company-wide context.</h2>
              <p className="mt-3 text-sm leading-8 text-[#746853]">
                Decision-makers can view the pipeline at a high level while each functional team still works inside its
                own scoped dashboard, lead queues, customer views, and workflow responsibilities.
              </p>
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-6 space-y-3">
            <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/88 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
              Core Modules
            </span>
            <h2 className="text-[2.2rem] font-semibold tracking-tight">Features that make GreenCRM search-friendly and business-ready.</h2>
            <p className="max-w-3xl text-sm leading-8 text-[#746853]">
              The platform is structured around lead management, customer operations, reminders, tasks, analytics,
              product mapping, and workflow movement instead of isolated screens.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {CORE_MODULES.map((item) => (
              <article key={item.title} className={PANEL}>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fff4d9] text-[#8d6e27]">
                  <DashboardIcon name={item.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#7a6b57]">{item.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-[#eadfcd] bg-[linear-gradient(135deg,rgba(245,233,201,0.84)_0%,rgba(255,248,235,0.96)_48%,rgba(245,226,174,0.7)_100%)] p-6 shadow-[0_22px_60px_rgba(79,58,22,0.1)] md:p-8">
            <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/88 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
              FAQs
            </span>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {FAQS.map((item) => (
                <article key={item.question} className="rounded-[24px] border border-[#eadfcd] bg-white/88 p-5">
                  <h2 className="text-lg font-semibold">{item.question}</h2>
                  <p className="mt-3 text-sm leading-7 text-[#746853]">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-[#eadfcd] bg-[#10111d] px-6 py-8 text-white shadow-[0_22px_60px_rgba(6,7,16,0.16)] md:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/80">
                  Start GreenCRM
                </span>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight">See how your leads, customers, and workflow can run from one CRM.</h2>
                <p className="mt-3 text-sm leading-8 text-white/74">
                  Book a demo if you want the guided walkthrough, or create a workspace if you are ready to launch the
                  first admin account and start using the CRM.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/book-demo" className="inline-flex min-h-[50px] items-center justify-center rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-5 py-3 text-sm font-semibold text-[#060710] transition hover:-translate-y-0.5 hover:bg-[#efd48f]">
                  Book Demo
                </Link>
                <Link href="/register" className="inline-flex min-h-[50px] items-center justify-center rounded-[18px] border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/16">
                  Create Workspace
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </div>
  );
}
