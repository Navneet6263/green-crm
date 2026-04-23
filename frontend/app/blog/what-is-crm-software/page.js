import BlogPostShell from "../../../components/landing/BlogPostShell";
import { buildMetadata } from "../../../lib/seo";

export const metadata = buildMetadata({
  title: "What is CRM Software? Simple Guide for Indian Businesses | GreenCRM",
  description:
    "Learn what CRM software is, how it works, and why small businesses and sales teams in India need it. A simple guide to customer relationship management software.",
  path: "/blog/what-is-crm-software",
  keywords: [
    "what is CRM software",
    "what is CRM",
    "CRM software meaning",
    "customer relationship management software India",
    "CRM for business India",
    "CRM tools India",
    "what is sales CRM",
    "CRM software guide India",
  ],
});

const meta = {
  tag: "Guide",
  title: "What is CRM Software? A Simple Guide for Indian Businesses",
  description:
    "Learn what CRM software is, how it works, and why small businesses and sales teams in India need it to manage leads and customers.",
};

const sections = [
  {
    heading: "What is CRM Software?",
    body: "CRM software stands for Customer Relationship Management software. It is a tool that helps businesses manage their leads, customers, and sales activities from one place. Instead of tracking leads in Excel or WhatsApp chats, a CRM gives your team a single workspace to capture leads, assign follow-ups, log calls, and track every deal stage.",
  },
  {
    heading: "Why Do Indian Businesses Need CRM Software?",
    body: "Most small businesses in India start by managing leads in Excel or WhatsApp groups. This works for a while, but as the team grows, leads get missed, follow-ups are forgotten, and managers have no visibility. CRM software solves this by giving every team member a clear view of their leads and tasks, and giving managers a real-time dashboard of team activity.",
  },
  {
    heading: "What Does CRM Software Do?",
    body: "CRM software helps you capture leads from any source, assign them to sales reps, track follow-up status, log calls and WhatsApp messages, and see conversion rates. Modern CRM tools like GreenCRM also include calling integration, WhatsApp integration, SMS, attendance tracking, and automation so your team can do more without more manual work.",
  },
  {
    heading: "CRM Software for Small Business India",
    body: "Small businesses in India need a CRM that is affordable, easy to use, and works for the way Indian sales teams operate — on calls and WhatsApp. GreenCRM is built for this. It combines lead management, calling, WhatsApp, SMS, and attendance in one affordable CRM designed for Indian small businesses and startups.",
  },
  {
    heading: "How to Choose the Best CRM Software in India?",
    body: "When choosing CRM software in India, look for: affordable pricing for small teams, calling integration (click-to-call), WhatsApp and SMS integration, easy lead pipeline management, dashboards for managers and owners, and attendance tracking if you have field staff. GreenCRM includes all of these in one platform.",
  },
];

export default function WhatIsCrmSoftwarePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.description,
    author: { "@type": "Organization", name: "GreenCRM" },
    publisher: { "@type": "Organization", name: "GreenCRM" },
    inLanguage: "en-IN",
    about: { "@type": "Thing", name: "CRM Software" },
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
