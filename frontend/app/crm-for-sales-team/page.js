import { buildMetadata } from "../../lib/seo";
import SeoLandingShell from "../../components/landing/SeoLandingShell";

export const metadata = buildMetadata({
  title: "CRM for Sales Team India | Sales CRM with Call Tracking | GreenCRM",
  description:
    "GreenCRM is the best CRM for sales teams in India. Track calls, WhatsApp follow-ups, lead pipeline, and daily performance from one dashboard. Free demo available.",
  path: "/crm-for-sales-team",
  keywords: [
    "CRM for sales team India",
    "sales CRM India",
    "CRM for sales team with call tracking",
    "sales CRM with calling",
    "CRM for field sales India",
    "sales team CRM India",
    "CRM with pipeline management",
    "sales CRM for small business India",
    "GreenCRM sales team",
  ],
});

const features = [
  {
    title: "Lead Pipeline for Sales Teams",
    copy: "Every sales rep sees their leads, follow-up status, and deal stage in one clean pipeline. No more Excel sheets or missed follow-ups.",
    points: ["Pipeline management", "Deal stage tracking", "Rep-wise view"],
  },
  {
    title: "CRM with Call Tracking for Sales",
    copy: "Sales reps can click-to-call leads and every call is logged automatically. Managers see call counts, outcomes, and activity without asking.",
    points: ["Click-to-call", "Auto call logs", "Manager visibility"],
  },
  {
    title: "WhatsApp & SMS for Sales Follow-ups",
    copy: "Sales teams in India follow up on WhatsApp. GreenCRM lets reps send WhatsApp and SMS from the CRM so every follow-up is tracked.",
    points: ["WhatsApp follow-ups", "SMS integration", "Follow-up history"],
  },
  {
    title: "Sales Performance Dashboards",
    copy: "Managers get a real-time view of team performance — calls made, leads converted, follow-ups pending, and daily activity.",
    points: ["Manager dashboard", "Team KPIs", "Daily activity reports"],
  },
  {
    title: "CRM for Field Sales India",
    copy: "Field sales reps can update lead status, log calls, and check in with geo fencing from their mobile. Managers see field activity in real time.",
    points: ["Mobile CRM", "Geo fencing", "Field activity tracking"],
  },
  {
    title: "CRM Automation for Sales Teams",
    copy: "Automate follow-up reminders, lead assignments, and status updates so your sales team spends more time selling.",
    points: ["Auto reminders", "Lead routing", "Workflow automation"],
  },
];

const faq = [
  {
    q: "What is the best CRM for sales teams in India?",
    a: "GreenCRM is one of the best CRM options for sales teams in India. It includes lead pipeline management, click-to-call, WhatsApp integration, and sales performance dashboards in one affordable platform.",
  },
  {
    q: "Does GreenCRM have call tracking for sales teams?",
    a: "Yes. GreenCRM is a CRM for sales teams with call tracking built in. Every call is automatically logged and managers can see call activity for every rep.",
  },
  {
    q: "Can GreenCRM be used for field sales in India?",
    a: "Yes. GreenCRM is a CRM for field sales in India. Field reps can update leads, log calls, and check in with geo fencing from their mobile.",
  },
  {
    q: "Does GreenCRM support WhatsApp for sales teams?",
    a: "Yes. GreenCRM lets sales teams send WhatsApp messages and SMS from the CRM. Every follow-up is tracked against the lead record.",
  },
];

export default function CrmForSalesTeamPage() {
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
          eyebrow: "CRM for Sales Team",
          title: "Best CRM for Sales Teams in India — Calls, WhatsApp & Pipeline",
          description:
            "GreenCRM is built for sales teams in India. Track leads, calls, WhatsApp follow-ups, and daily performance from one fast CRM. Includes call tracking, pipeline management, and field sales support.",
        }}
        features={features}
        faq={faq}
        cta={{
          title: "Give your sales team the CRM they need",
          description:
            "Book a free GreenCRM demo and see how sales teams across India manage leads, calls, and WhatsApp from one dashboard.",
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}
