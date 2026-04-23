import { buildMetadata } from "../../lib/seo";
import SeoLandingShell from "../../components/landing/SeoLandingShell";

export const metadata = buildMetadata({
  title: "CRM with WhatsApp | CRM with WhatsApp Integration India | GreenCRM",
  description:
    "GreenCRM is a CRM with WhatsApp integration for Indian sales teams. Send WhatsApp messages, follow-ups, and templates directly from your CRM. Best CRM with WhatsApp for small businesses in India.",
  path: "/crm-with-whatsapp",
  keywords: [
    "CRM with WhatsApp",
    "CRM with WhatsApp integration",
    "CRM with WhatsApp India",
    "WhatsApp CRM India",
    "CRM with calling and WhatsApp India",
    "sales CRM with WhatsApp",
    "CRM with WhatsApp and SMS",
    "WhatsApp integration CRM India",
    "GreenCRM WhatsApp",
  ],
});

const features = [
  {
    title: "Send WhatsApp from CRM",
    copy: "Send WhatsApp messages to leads and customers directly from their CRM record. No switching between apps, no copy-pasting numbers.",
    points: ["WhatsApp from CRM", "No app switching", "Direct messaging"],
  },
  {
    title: "WhatsApp Template Messages",
    copy: "Use pre-built WhatsApp templates for follow-ups, reminders, and updates. Send consistent messages to leads at every stage of the pipeline.",
    points: ["Template messages", "Follow-up templates", "Consistent messaging"],
  },
  {
    title: "CRM with WhatsApp & Calling Together",
    copy: "Call a lead and then send a WhatsApp follow-up from the same CRM record. Calling and WhatsApp in one workspace means faster conversions.",
    points: ["Calling + WhatsApp", "One workspace", "Faster follow-ups"],
  },
  {
    title: "CRM with WhatsApp & SMS",
    copy: "GreenCRM supports both WhatsApp and SMS so you can reach leads on their preferred channel without leaving the CRM.",
    points: ["WhatsApp + SMS", "Multi-channel", "Lead preference tracking"],
  },
  {
    title: "WhatsApp Follow-up Tracking",
    copy: "Every WhatsApp message sent from GreenCRM is logged against the lead record. Managers can see follow-up activity across the team.",
    points: ["Message logs", "Follow-up history", "Team activity"],
  },
  {
    title: "WhatsApp CRM for Small Business India",
    copy: "Most Indian small businesses run on WhatsApp. GreenCRM brings WhatsApp into your CRM so you never miss a lead conversation.",
    points: ["Built for India", "WhatsApp-first follow-up", "Small business ready"],
  },
];

const faq = [
  {
    q: "What is a CRM with WhatsApp integration?",
    a: "A CRM with WhatsApp integration lets your sales team send WhatsApp messages directly from the CRM without switching apps. GreenCRM includes WhatsApp integration so you can follow up with leads on WhatsApp from the same record.",
  },
  {
    q: "Does GreenCRM support WhatsApp for sales teams in India?",
    a: "Yes. GreenCRM is a CRM with WhatsApp integration built for Indian sales teams. You can send WhatsApp messages, use templates, and track all follow-ups from the CRM.",
  },
  {
    q: "Can I use GreenCRM for WhatsApp and calling together?",
    a: "Yes. GreenCRM is a CRM with calling and WhatsApp integration. You can call a lead and send a WhatsApp follow-up from the same CRM record.",
  },
  {
    q: "Is GreenCRM a good WhatsApp CRM for small businesses in India?",
    a: "Yes. GreenCRM is one of the best CRM with WhatsApp options for small businesses in India. It is affordable, easy to use, and designed for teams that follow up on WhatsApp daily.",
  },
];

export default function CrmWithWhatsappPage() {
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
          eyebrow: "CRM with WhatsApp",
          title: "CRM with WhatsApp Integration for Sales Teams in India",
          description:
            "GreenCRM is a CRM with WhatsApp integration built for Indian businesses. Send WhatsApp messages, follow-ups, and templates directly from your CRM. Best CRM with WhatsApp for small businesses and sales teams.",
        }}
        features={features}
        faq={faq}
        cta={{
          title: "See GreenCRM's WhatsApp integration in action",
          description:
            "Book a free demo and see how WhatsApp, calling, and SMS work together in GreenCRM for your sales team.",
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}
