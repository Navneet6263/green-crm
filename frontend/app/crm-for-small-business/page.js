import { buildMetadata } from "../../lib/seo";
import SeoLandingShell from "../../components/landing/SeoLandingShell";

export const metadata = buildMetadata({
  title: "CRM for Small Business India | Affordable CRM Software | GreenCRM",
  description:
    "GreenCRM is the best CRM for small business in India. Affordable, simple, and powerful. Manage leads, calls, WhatsApp, SMS, and attendance without heavy software. Free demo available.",
  path: "/crm-for-small-business",
  keywords: [
    "CRM for small business India",
    "best CRM for small business",
    "CRM for small business in Noida",
    "affordable CRM for small business",
    "simple CRM software India",
    "easy CRM for business",
    "CRM for local business India",
    "small business CRM India",
    "GreenCRM small business",
  ],
});

const features = [
  {
    title: "Simple Lead Management",
    copy: "No complex setup. Add leads, assign owners, and track follow-ups from a clean dashboard that your whole team can use from day one.",
    points: ["Easy lead capture", "Simple pipeline", "Quick follow-ups"],
  },
  {
    title: "Calling Built Into the CRM",
    copy: "Click-to-call from the lead record. No separate dialer needed. Every call is logged automatically so nothing gets missed.",
    points: ["Click-to-call", "Auto call logs", "Call notes"],
  },
  {
    title: "WhatsApp & SMS Follow-ups",
    copy: "Most small business sales happen on WhatsApp. GreenCRM lets you send WhatsApp and SMS from the same lead record.",
    points: ["WhatsApp integration", "SMS integration", "Template messages"],
  },
  {
    title: "Affordable Pricing for Small Teams",
    copy: "GreenCRM is priced for small businesses and startups in India. You get a full CRM without paying enterprise prices.",
    points: ["Affordable plans", "No hidden costs", "Free demo"],
  },
  {
    title: "Dashboards for Owners & Managers",
    copy: "See your team's daily activity, pending follow-ups, and conversion numbers from a clean owner or manager dashboard.",
    points: ["Owner dashboard", "Manager view", "Daily activity"],
  },
  {
    title: "Attendance for Field Teams",
    copy: "If your small business has field staff, GreenCRM tracks attendance with geo fencing so you always know who is where.",
    points: ["Geo fencing", "Attendance tracking", "Field visibility"],
  },
];

const faq = [
  {
    q: "Is GreenCRM good for small businesses in India?",
    a: "Yes. GreenCRM is designed specifically for small businesses in India. It is affordable, simple to use, and includes lead management, calling, WhatsApp, SMS, and attendance in one platform.",
  },
  {
    q: "What is the best affordable CRM for small business India?",
    a: "GreenCRM is one of the most affordable CRM options for small businesses in India. It gives you all the features you need without the heavy cost of enterprise CRM software.",
  },
  {
    q: "Can a small team of 2-5 people use GreenCRM?",
    a: "Yes. GreenCRM works for teams of any size. Small teams of 2-5 people can use it to manage leads, calls, and follow-ups without any complex setup.",
  },
  {
    q: "Does GreenCRM work for local businesses in India?",
    a: "Yes. GreenCRM is used by local businesses across India including real estate, service businesses, retail, and field sales teams.",
  },
];

export default function CrmForSmallBusinessPage() {
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
          eyebrow: "CRM for Small Business",
          title: "Best CRM for Small Business India — Simple, Affordable & Powerful",
          description:
            "GreenCRM is built for small businesses in India. Manage leads, calls, WhatsApp, SMS, and attendance from one simple CRM. No heavy setup, no enterprise pricing. Book a free demo today.",
        }}
        features={features}
        faq={faq}
        cta={{
          title: "The best CRM for small business in India — try it free",
          description:
            "Book a free GreenCRM demo and see how small businesses across India manage leads, calls, and WhatsApp from one affordable CRM.",
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}
