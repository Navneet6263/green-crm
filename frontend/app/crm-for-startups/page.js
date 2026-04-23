import { buildMetadata } from "../../lib/seo";
import SeoLandingShell from "../../components/landing/SeoLandingShell";

export const metadata = buildMetadata({
  title: "CRM for Startups India | Affordable CRM Software for Startups | GreenCRM",
  description:
    "GreenCRM is the best CRM for startups in India. Affordable, fast, and easy to set up. Manage leads, calls, WhatsApp, SMS, and team dashboards from day one. Free demo available.",
  path: "/crm-for-startups",
  keywords: [
    "CRM for startups India",
    "CRM software for startups",
    "affordable CRM for startups",
    "best CRM for startups India",
    "startup CRM India",
    "CRM for new business India",
    "simple CRM for startups",
    "CRM for growing business India",
    "GreenCRM startups",
  ],
});

const features = [
  {
    title: "Quick Setup for Startups",
    copy: "GreenCRM is ready in minutes. No complex onboarding, no IT team needed. Your startup can start managing leads from day one.",
    points: ["Quick setup", "No IT needed", "Ready in minutes"],
  },
  {
    title: "Affordable CRM Pricing for Startups",
    copy: "Startups in India need powerful tools at startup prices. GreenCRM gives you a full CRM without the enterprise cost.",
    points: ["Startup-friendly pricing", "No hidden costs", "Free demo"],
  },
  {
    title: "Lead Management from Day One",
    copy: "Capture leads from your website, calls, and social media. Assign to your team and track every follow-up from one clean dashboard.",
    points: ["Lead capture", "Team assignment", "Pipeline tracking"],
  },
  {
    title: "Calling & WhatsApp for Startup Sales",
    copy: "Startup sales teams move fast. GreenCRM gives you click-to-call and WhatsApp integration so you can follow up leads instantly.",
    points: ["Click-to-call", "WhatsApp integration", "Fast follow-ups"],
  },
  {
    title: "CRM Automation for Small Teams",
    copy: "Automate follow-up reminders and lead assignments so your small startup team can handle more leads without more headcount.",
    points: ["Auto reminders", "Lead routing", "Workflow automation"],
  },
  {
    title: "Dashboards for Startup Founders",
    copy: "Founders get a clear view of leads, conversions, team activity, and pipeline health without digging through spreadsheets.",
    points: ["Founder dashboard", "Conversion tracking", "Team activity"],
  },
];

const faq = [
  {
    q: "Is GreenCRM good for startups in India?",
    a: "Yes. GreenCRM is designed for startups in India. It is affordable, quick to set up, and includes all the CRM features a growing startup needs — lead management, calling, WhatsApp, SMS, and dashboards.",
  },
  {
    q: "What is the best affordable CRM for startups in India?",
    a: "GreenCRM is one of the most affordable CRM options for startups in India. You get a full-featured CRM at startup-friendly pricing with a free demo available.",
  },
  {
    q: "How quickly can a startup set up GreenCRM?",
    a: "GreenCRM can be set up in minutes. There is no complex onboarding or IT team required. Your startup can start managing leads from day one.",
  },
  {
    q: "Does GreenCRM scale as a startup grows?",
    a: "Yes. GreenCRM is built for growing businesses. As your startup grows, you can add more users, teams, and workflows without switching to a different CRM.",
  },
];

export default function CrmForStartupsPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      <SeoLandingShell
        hero={{
          eyebrow: "CRM for Startups",
          title: "Best CRM for Startups in India — Affordable, Fast & Easy to Use",
          description:
            "GreenCRM is built for Indian startups. Get lead management, calling, WhatsApp, SMS, and dashboards from day one. Affordable CRM pricing, quick setup, no IT team needed. Book a free demo.",
        }}
        features={features}
        faq={faq}
        cta={{
          title: "The CRM your startup needs from day one",
          description:
            "Book a free GreenCRM demo and see how Indian startups manage leads, calls, and WhatsApp from one affordable CRM.",
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}
