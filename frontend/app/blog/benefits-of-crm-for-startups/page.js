import BlogPostShell from "../../../components/landing/BlogPostShell";
import { buildMetadata } from "../../../lib/seo";

export const metadata = buildMetadata({
  title: "Benefits of CRM for Startups in India — Why Start Early | GreenCRM",
  description:
    "Discover the key benefits of using a CRM for your startup in India from day one. Lead management, automation, calling, WhatsApp, and team dashboards for growing startups.",
  path: "/blog/benefits-of-crm-for-startups",
  keywords: [
    "benefits of CRM for startups",
    "CRM for startups India",
    "why startups need CRM India",
    "CRM benefits startup India",
    "affordable CRM for startups India",
    "startup CRM India",
    "CRM software for startups",
  ],
});

const meta = {
  tag: "Startups",
  title: "Benefits of CRM for Startups in India — Why Start Early",
  description:
    "Discover the key benefits of using a CRM for your startup in India from day one. From lead management to automation and team dashboards.",
};

const sections = [
  {
    heading: "Why Startups in India Need a CRM from Day One",
    body: "Most Indian startups delay getting a CRM because they think it is only for large companies. But the best time to set up a CRM is when your startup is small. Starting early means your team builds good habits, your lead data is clean, and you never have to migrate from messy Excel sheets later.",
  },
  {
    heading: "Benefit 1: Capture Every Lead from the Start",
    body: "Startups cannot afford to lose leads. A CRM captures every lead from your website, calls, social media, and referrals in one place. Every lead is assigned to a team member with a follow-up date so nothing is missed.",
  },
  {
    heading: "Benefit 2: Build a Sales Process Early",
    body: "A CRM helps startups build a repeatable sales process from the beginning. With a clear pipeline, follow-up reminders, and call logs, your startup can scale the sales process as the team grows without starting from scratch.",
  },
  {
    heading: "Benefit 3: Calling & WhatsApp Built In",
    body: "Startup sales teams in India close deals on calls and WhatsApp. GreenCRM gives startups click-to-call and WhatsApp integration from day one so every conversation is tracked and no follow-up is missed.",
  },
  {
    heading: "Benefit 4: Founder Visibility Without Micromanaging",
    body: "Startup founders need to see what the sales team is doing without being in every call. GreenCRM gives founders a real-time dashboard showing leads, calls, follow-ups, and conversions so they can make decisions based on data.",
  },
  {
    heading: "Benefit 5: Affordable CRM for Indian Startups",
    body: "GreenCRM is priced for Indian startups. You get a full-featured CRM with lead management, calling, WhatsApp, SMS, attendance, and dashboards at a price that makes sense for a growing startup. Book a free demo to see the pricing.",
  },
  {
    heading: "Benefit 6: Scale Without Switching Tools",
    body: "When your startup grows from 5 to 50 people, you do not want to switch CRM tools. GreenCRM is built to scale with your team. Add more users, teams, and workflows as your startup grows without migrating to a new platform.",
  },
];

export default function BenefitsOfCrmForStartupsPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.description,
    author: { "@type": "Organization", name: "GreenCRM" },
    publisher: { "@type": "Organization", name: "GreenCRM" },
    inLanguage: "en-IN",
  };

  return (
    <>
      <BlogPostShell meta={meta}>
        {sections.map((section) => (
          <div key={section.heading} className="rounded-[1.35rem] border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-950">{section.heading}</h2>
            <p className="mt-3 text-sm leading-8 text-slate-600">{section.body}</p>
          </div>
        ))}
      </BlogPostShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}
