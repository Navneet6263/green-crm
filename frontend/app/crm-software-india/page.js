import { absoluteUrl, buildMetadata } from "../../lib/seo";
import SeoLandingShell from "../../components/landing/SeoLandingShell";

export const metadata = buildMetadata({
  title: "CRM Software India | Best Sales CRM for Indian Businesses | GreenCRM",
  description:
    "GreenCRM is the best CRM software in India for small businesses, startups, and sales teams. Affordable CRM with lead management, calling, WhatsApp, SMS, and attendance. Free demo available.",
  path: "/crm-software-india",
  keywords: [
    "CRM software India",
    "best CRM software India",
    "CRM software in India",
    "sales CRM India",
    "affordable CRM software India",
    "CRM for business India",
    "customer relationship management software India",
    "CRM tools India",
    "CRM system India",
    "GreenCRM",
  ],
});

const features = [
  {
    title: "Lead Management CRM India",
    copy: "Capture leads from any source, assign owners, set follow-up reminders, and track every deal stage from one clean CRM dashboard.",
    points: ["Lead capture", "Owner assignment", "Pipeline tracking", "Follow-up reminders"],
  },
  {
    title: "CRM with Calling Integration",
    copy: "Click-to-call directly from the CRM. Every call is logged automatically so your sales team never loses track of a conversation.",
    points: ["Click-to-call", "Call history", "Call notes", "Call tracking"],
  },
  {
    title: "CRM with WhatsApp & SMS",
    copy: "Send WhatsApp messages and SMS from the same CRM record. Follow up faster without switching between apps.",
    points: ["WhatsApp integration", "SMS integration", "Template messages"],
  },
  {
    title: "CRM with Automation",
    copy: "Automate follow-up reminders, lead assignments, and status updates so your team focuses on selling, not admin work.",
    points: ["Workflow automation", "Auto reminders", "Lead routing"],
  },
  {
    title: "Multi-Role Dashboards",
    copy: "Owners, managers, and sales reps each get a clean dashboard with the right numbers — no clutter, no confusion.",
    points: ["Owner dashboard", "Manager view", "Sales rep KPIs"],
  },
  {
    title: "Affordable CRM for Startups",
    copy: "GreenCRM is priced for Indian startups and small businesses. Get enterprise-level features at a fraction of the cost.",
    points: ["Free demo", "Affordable pricing", "No heavy setup"],
  },
];

const faq = [
  {
    q: "What is the best CRM software in India?",
    a: "GreenCRM is one of the best CRM software options in India for small businesses and sales teams. It combines lead management, calling, WhatsApp, SMS, attendance, and dashboards in one affordable platform.",
  },
  {
    q: "Is GreenCRM affordable for Indian businesses?",
    a: "Yes. GreenCRM is designed as an affordable CRM software for Indian startups, small businesses, and growing sales teams. Book a free demo to see pricing options.",
  },
  {
    q: "Does GreenCRM work for all types of businesses in India?",
    a: "GreenCRM works for real estate, service businesses, local shops, field sales teams, and any business that manages leads and customer follow-ups in India.",
  },
  {
    q: "Can I get a free demo of GreenCRM?",
    a: "Yes. You can book a free CRM demo on our website. Our team will walk you through lead management, calling, WhatsApp, SMS, and attendance features.",
  },
];

export default function CrmSoftwareIndiaPage() {
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
          eyebrow: "CRM Software India",
          title: "Best CRM Software in India for Sales Teams & Small Businesses",
          description:
            "GreenCRM is an affordable CRM software built for India. Manage leads, calls, WhatsApp, SMS, attendance, and dashboards from one fast workspace. Trusted by small businesses, startups, and sales teams across India.",
        }}
        features={features}
        faq={faq}
        cta={{
          title: "Try the best CRM software in India — free demo",
          description:
            "Book a free GreenCRM demo and see how Indian businesses manage leads, calls, WhatsApp, and field teams from one CRM.",
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}
