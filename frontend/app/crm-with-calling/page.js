import { buildMetadata } from "../../lib/seo";
import SeoLandingShell from "../../components/landing/SeoLandingShell";

export const metadata = buildMetadata({
  title: "CRM with Calling | CRM with Call Tracking India | GreenCRM",
  description:
    "GreenCRM is a CRM with calling built in. Click-to-call, call tracking, and call logs for your sales team. Best CRM with calling feature for small businesses and sales teams in India.",
  path: "/crm-with-calling",
  keywords: [
    "CRM with calling",
    "CRM with call tracking",
    "CRM for sales team with call tracking",
    "CRM with calling feature India",
    "click to call CRM India",
    "sales CRM with calling",
    "CRM with calling and WhatsApp India",
    "CRM with calling India",
    "GreenCRM calling",
  ],
});

const features = [
  {
    title: "Click-to-Call from CRM",
    copy: "Call any lead or customer directly from their CRM record. No manual dialing, no switching apps. One click and you are connected.",
    points: ["Click-to-call", "Direct from lead record", "No manual dialing"],
  },
  {
    title: "Automatic Call Logging",
    copy: "Every call is automatically logged with duration, outcome, and notes. Your sales team never has to manually enter call data again.",
    points: ["Auto call logs", "Call duration", "Call outcome tracking"],
  },
  {
    title: "Call Notes & Follow-ups",
    copy: "Add notes during or after a call and set the next follow-up reminder. Your team always knows what was discussed and what to do next.",
    points: ["Call notes", "Follow-up reminders", "Call history"],
  },
  {
    title: "CRM with Calling & WhatsApp Together",
    copy: "After a call, send a WhatsApp follow-up from the same CRM record. Calling and WhatsApp in one place means faster sales cycles.",
    points: ["Calling + WhatsApp", "SMS follow-up", "One workspace"],
  },
  {
    title: "Call Tracking for Sales Managers",
    copy: "Managers can see call activity, call counts, and outcomes for every rep. Track team performance without asking for manual reports.",
    points: ["Manager call reports", "Rep activity tracking", "Team call analytics"],
  },
  {
    title: "CRM with Calling for Field Sales",
    copy: "Field sales reps can call leads from their mobile CRM, log outcomes, and update lead status on the go.",
    points: ["Mobile calling", "Field sales support", "On-the-go updates"],
  },
];

const faq = [
  {
    q: "What is a CRM with calling?",
    a: "A CRM with calling is a customer relationship management software that has a built-in calling feature. GreenCRM lets your sales team click-to-call leads directly from the CRM and automatically logs every call.",
  },
  {
    q: "Does GreenCRM have call tracking?",
    a: "Yes. GreenCRM includes call tracking for sales teams. Every call is logged with duration, outcome, and notes. Managers can see call activity for every rep.",
  },
  {
    q: "Can I use GreenCRM for calling and WhatsApp together?",
    a: "Yes. GreenCRM is a CRM with calling and WhatsApp integration. You can call a lead and then send a WhatsApp follow-up from the same record.",
  },
  {
    q: "Is GreenCRM a good CRM with calling for small businesses in India?",
    a: "Yes. GreenCRM is one of the best CRM with calling options for small businesses and sales teams in India. It is affordable, easy to use, and includes click-to-call, call logs, and WhatsApp integration.",
  },
];

export default function CrmWithCallingPage() {
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
          eyebrow: "CRM with Calling",
          title: "CRM with Calling & Call Tracking for Sales Teams in India",
          description:
            "GreenCRM is a CRM with calling built in. Click-to-call leads, auto-log every call, and track your team's call activity from one dashboard. Best CRM with calling feature for Indian sales teams.",
        }}
        features={features}
        faq={faq}
        cta={{
          title: "See GreenCRM's calling feature in action",
          description:
            "Book a free demo and see how click-to-call, call tracking, and WhatsApp work together in GreenCRM.",
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}
