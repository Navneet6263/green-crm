import BlogPostShell from "../../../components/landing/BlogPostShell";
import { buildMetadata } from "../../../lib/seo";

export const metadata = buildMetadata({
  title: "Why Every Sales Team in India Needs a CRM in 2025 | GreenCRM",
  description:
    "Learn why sales teams in India need a CRM to track calls, WhatsApp follow-ups, and lead pipeline. Stop losing deals to missed follow-ups and manual tracking.",
  path: "/blog/why-sales-team-needs-crm",
  keywords: [
    "why sales team needs CRM",
    "CRM for sales team India",
    "sales team CRM India",
    "why use CRM for sales",
    "CRM benefits for sales team",
    "sales CRM India 2025",
    "CRM for sales team with call tracking",
  ],
});

const meta = {
  tag: "Sales Team",
  title: "Why Every Sales Team in India Needs a CRM in 2025",
  description:
    "Learn why sales teams in India need a CRM to track calls, WhatsApp follow-ups, and lead pipeline instead of relying on manual methods.",
};

const sections = [
  {
    heading: "The Problem with Manual Sales Tracking",
    body: "Most sales teams in India track leads in Excel, WhatsApp groups, or their own notebooks. This works for a team of 2-3 people, but as the team grows, leads get missed, follow-ups are forgotten, and managers have no visibility into what the team is doing. A CRM solves all of this.",
  },
  {
    heading: "Reason 1: Never Miss a Follow-up Again",
    body: "The biggest reason sales teams lose deals is missed follow-ups. A CRM automatically reminds your team when to follow up with each lead. GreenCRM sends follow-up reminders so your sales reps always know who to call next.",
  },
  {
    heading: "Reason 2: Track Every Call and WhatsApp",
    body: "Sales teams in India close deals on calls and WhatsApp. A CRM with calling lets your team click-to-call and log every call automatically. A CRM with WhatsApp integration logs every WhatsApp message. Managers can see all activity without asking for manual reports.",
  },
  {
    heading: "Reason 3: Manager Visibility Without Micromanaging",
    body: "With a CRM, managers get a real-time dashboard showing each rep's leads, calls, follow-ups, and conversions. No more daily status calls or manual reports. GreenCRM gives managers the visibility they need without micromanaging the team.",
  },
  {
    heading: "Reason 4: Pipeline Management for Sales Teams",
    body: "A CRM gives your sales team a clear pipeline view — which leads are new, which are in follow-up, which are close to closing, and which are lost. This helps managers forecast revenue and identify where deals are getting stuck.",
  },
  {
    heading: "Reason 5: CRM Automation Saves Time",
    body: "CRM automation handles follow-up reminders, lead assignments, and status updates automatically. This saves your sales team hours every week and lets them focus on selling instead of admin work.",
  },
  {
    heading: "GreenCRM: The Best CRM for Sales Teams in India",
    body: "GreenCRM is built for sales teams in India. It includes lead pipeline management, click-to-call, WhatsApp integration, SMS, attendance tracking, and manager dashboards in one affordable CRM. Book a free demo to see how it fits your sales team.",
  },
];

export default function WhySalesTeamNeedsCrmPage() {
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
