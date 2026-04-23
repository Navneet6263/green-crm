import BlogPostShell from "../../../components/landing/BlogPostShell";
import { buildMetadata } from "../../../lib/seo";

export const metadata = buildMetadata({
  title: "How CRM Helps Small Business in India Grow Faster | GreenCRM",
  description:
    "Discover how CRM software helps small businesses in India manage leads, follow-ups, and customer relationships. Stop losing leads to Excel and WhatsApp chaos.",
  path: "/blog/how-crm-helps-small-business",
  keywords: [
    "how CRM helps small business",
    "CRM for small business India",
    "benefits of CRM for small business",
    "CRM helps business grow India",
    "small business CRM India",
    "CRM for local business India",
    "CRM for growing business India",
  ],
});

const meta = {
  tag: "Small Business",
  title: "How CRM Helps Small Business in India Grow Faster",
  description:
    "Discover how a CRM helps small businesses in India manage leads, follow-ups, and customer relationships without Excel or manual tracking.",
};

const sections = [
  {
    heading: "The Problem: Leads Getting Lost in Excel and WhatsApp",
    body: "Most small businesses in India start managing leads in Excel sheets or WhatsApp groups. It works at first, but as the business grows, leads get missed, follow-ups are forgotten, and the owner has no clear picture of what the sales team is doing. This is where CRM software helps.",
  },
  {
    heading: "How CRM Helps Small Business: Lead Management",
    body: "A CRM gives your small business one place to capture all leads — from calls, website forms, walk-ins, and referrals. Every lead is assigned to a team member with a follow-up date. Nothing falls through the cracks because the CRM reminds your team when to follow up.",
  },
  {
    heading: "How CRM Helps Small Business: Calling & WhatsApp",
    body: "Small businesses in India close deals on calls and WhatsApp. A CRM with calling lets your team click-to-call leads and log every call automatically. A CRM with WhatsApp integration lets your team send follow-up messages from the same record. GreenCRM combines both so your team works faster.",
  },
  {
    heading: "How CRM Helps Small Business: Manager Visibility",
    body: "Without a CRM, small business owners have to call their team to get updates. With GreenCRM, owners and managers get a real-time dashboard showing leads, follow-ups, calls made, and conversions. No more chasing status updates.",
  },
  {
    heading: "How CRM Helps Small Business: Saving Time with Automation",
    body: "CRM automation handles follow-up reminders, lead assignments, and status updates automatically. This saves your small team hours every week and lets them focus on selling instead of admin work.",
  },
  {
    heading: "GreenCRM: The Best CRM for Small Business in India",
    body: "GreenCRM is built for small businesses in India. It is affordable, easy to set up, and includes lead management, calling, WhatsApp, SMS, attendance, and dashboards in one platform. Book a free demo to see how it fits your business.",
  },
];

export default function HowCrmHelpsSmallBusinessPage() {
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
