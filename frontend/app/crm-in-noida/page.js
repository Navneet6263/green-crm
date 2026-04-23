import { buildMetadata } from "../../lib/seo";
import SeoLandingShell from "../../components/landing/SeoLandingShell";

export const metadata = buildMetadata({
  title: "CRM in Noida | Best CRM Software in Noida | CRM Company Noida | GreenCRM",
  description:
    "GreenCRM is the best CRM in Noida for small businesses and sales teams. Manage leads, calls, WhatsApp, SMS, and attendance from one affordable CRM. CRM company based in Noida. Book free demo.",
  path: "/crm-in-noida",
  keywords: [
    "CRM in Noida",
    "CRM software in Noida",
    "best CRM in Noida",
    "CRM for small business in Noida",
    "CRM company in Noida",
    "best CRM software Noida",
    "sales CRM Noida",
    "lead management CRM Noida",
    "GreenCRM Noida",
    "CRM Noida India",
  ],
});

const features = [
  {
    title: "Local CRM Built for Noida Businesses",
    copy: "GreenCRM is a CRM company based in Noida. We understand the needs of local businesses, real estate teams, and field sales operations in the Delhi NCR region.",
    points: ["Noida-based CRM company", "Delhi NCR support", "Local business focus"],
  },
  {
    title: "Lead Management for Noida Sales Teams",
    copy: "Capture leads from calls, walk-ins, and online sources. Assign to your Noida sales team and track every follow-up from one dashboard.",
    points: ["Lead capture", "Team assignment", "Follow-up tracking"],
  },
  {
    title: "CRM with Calling for Noida Teams",
    copy: "Click-to-call from the CRM. Every call is logged so your Noida sales team can track conversations and outcomes without manual entry.",
    points: ["Click-to-call", "Call logs", "Call notes"],
  },
  {
    title: "WhatsApp & SMS CRM in Noida",
    copy: "Send WhatsApp messages and SMS to leads directly from GreenCRM. Perfect for Noida businesses that follow up on WhatsApp daily.",
    points: ["WhatsApp integration", "SMS integration", "Quick follow-ups"],
  },
  {
    title: "Attendance & Geo Fencing Noida",
    copy: "Track your field team's check-in and check-out with geo fencing. Ideal for Noida businesses with field sales or service staff.",
    points: ["Geo fencing", "Attendance tracking", "Field team management"],
  },
  {
    title: "Affordable CRM for Noida Startups",
    copy: "GreenCRM is priced for Noida startups and small businesses. Get a full-featured CRM without the heavy enterprise cost.",
    points: ["Affordable pricing", "Free demo", "Quick setup"],
  },
];

const faq = [
  {
    q: "Is GreenCRM a CRM company in Noida?",
    a: "Yes. GreenCRM is a CRM company based in Noida, Uttar Pradesh. We serve businesses across Noida, Delhi NCR, and all of India.",
  },
  {
    q: "What is the best CRM software in Noida?",
    a: "GreenCRM is the best CRM software in Noida for small businesses, real estate teams, and sales teams. It includes lead management, calling, WhatsApp, SMS, and attendance in one platform.",
  },
  {
    q: "Can small businesses in Noida use GreenCRM?",
    a: "Yes. GreenCRM is designed for small businesses in Noida and across India. It is affordable, easy to set up, and includes all features a growing team needs.",
  },
  {
    q: "Does GreenCRM support field teams in Noida?",
    a: "Yes. GreenCRM includes geo fencing and attendance tracking for field sales teams in Noida and Delhi NCR.",
  },
];

export default function CrmInNoidaPage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "GreenCRM",
      description:
        "GreenCRM is a CRM software company in Noida providing affordable CRM solutions for small businesses, startups, and sales teams across India.",
      url: "https://greencrm.in/crm-in-noida",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Noida",
        addressRegion: "Uttar Pradesh",
        addressCountry: "IN",
      },
      areaServed: ["Noida", "Delhi NCR", "India"],
      priceRange: "₹",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ];

  return (
    <>
      <SeoLandingShell
        hero={{
          eyebrow: "CRM in Noida",
          title: "Best CRM Software in Noida for Small Businesses & Sales Teams",
          description:
            "GreenCRM is a CRM company based in Noida. Manage leads, calls, WhatsApp, SMS, and field attendance from one affordable CRM. Trusted by businesses across Noida and Delhi NCR. Book a free demo today.",
        }}
        features={features}
        faq={faq}
        cta={{
          title: "Book a free CRM demo in Noida",
          description:
            "See how GreenCRM helps Noida businesses manage leads, calls, WhatsApp, and field teams from one CRM. Free demo, no commitment.",
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}
