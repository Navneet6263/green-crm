import { buildMetadata } from "../../lib/seo";
import SeoLandingShell from "../../components/landing/SeoLandingShell";

export const metadata = buildMetadata({
  title: "CRM with Attendance System | CRM with Geo Fencing India | GreenCRM",
  description:
    "GreenCRM is a CRM with attendance system and geo fencing for field sales teams in India. Track check-in, check-out, and field movement from the same CRM. Free demo available.",
  path: "/crm-with-attendance",
  keywords: [
    "CRM with attendance system",
    "CRM with geo fencing",
    "CRM for field sales India",
    "attendance CRM India",
    "geo fencing CRM India",
    "field sales CRM India",
    "CRM with attendance tracking",
    "CRM for field employees India",
    "GreenCRM attendance",
  ],
});

const features = [
  {
    title: "Attendance Tracking in CRM",
    copy: "Field employees check in and check out directly from the CRM app. No separate attendance system needed — it is all in one place.",
    points: ["Check-in / check-out", "Mobile attendance", "No separate app"],
  },
  {
    title: "Geo Fencing for Field Teams",
    copy: "Set geo fencing zones so employees can only check in when they are at the right location. Managers see real-time location updates.",
    points: ["Geo fencing zones", "Location verification", "Real-time updates"],
  },
  {
    title: "Field Sales CRM India",
    copy: "Field sales reps can update lead status, log calls, and check in from their mobile. Managers see field activity without calling every rep.",
    points: ["Mobile CRM", "Lead updates on the go", "Manager visibility"],
  },
  {
    title: "Attendance Reports for Managers",
    copy: "Managers get daily attendance reports showing who checked in, when, and from where. No manual attendance registers needed.",
    points: ["Daily reports", "Check-in time", "Location data"],
  },
  {
    title: "CRM + Attendance in One Platform",
    copy: "Most businesses use separate tools for CRM and attendance. GreenCRM combines both so your team uses one app for everything.",
    points: ["One platform", "No app switching", "Unified data"],
  },
  {
    title: "Attendance for Remote & Field Employees",
    copy: "Whether your team is in the office, in the field, or working remotely, GreenCRM tracks attendance with geo fencing for all scenarios.",
    points: ["Field employees", "Remote teams", "Office staff"],
  },
];

const faq = [
  {
    q: "What is a CRM with attendance system?",
    a: "A CRM with attendance system combines customer relationship management with employee attendance tracking. GreenCRM includes both in one platform so your team uses one app for leads, calls, and attendance.",
  },
  {
    q: "Does GreenCRM have geo fencing for attendance?",
    a: "Yes. GreenCRM includes geo fencing for attendance. Employees can only check in when they are at the correct location, and managers see real-time location updates.",
  },
  {
    q: "Is GreenCRM good for field sales teams in India?",
    a: "Yes. GreenCRM is a CRM for field sales in India. Field reps can update leads, log calls, and check in with geo fencing from their mobile. Managers see field activity in real time.",
  },
  {
    q: "Can I track my field employees with GreenCRM?",
    a: "Yes. GreenCRM tracks field employee attendance with geo fencing. You can see check-in times, locations, and daily attendance reports from the manager dashboard.",
  },
];

export default function CrmWithAttendancePage() {
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
          eyebrow: "CRM with Attendance",
          title: "CRM with Attendance System & Geo Fencing for Field Teams in India",
          description:
            "GreenCRM is a CRM with attendance tracking and geo fencing built in. Track field employee check-in, check-out, and location from the same CRM you use for leads and calls. Built for Indian field sales teams.",
        }}
        features={features}
        faq={faq}
        cta={{
          title: "See GreenCRM's attendance & geo fencing in action",
          description:
            "Book a free demo and see how GreenCRM tracks field attendance, geo fencing, and lead management from one platform.",
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}
