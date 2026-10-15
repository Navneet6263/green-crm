import { buildMetadata } from "../../lib/seo";
import SeoLandingShell from "../../components/landing/SeoLandingShell";

export const metadata = buildMetadata({
  title: "CRM with Attendance System | CRM with GPS Tracking India | GreenCRM",
  description:
    "GreenCRM is a CRM with attendance system and GPS route tracking for field sales teams in India. Record check-in, check-out, and field routes from the same CRM. Free demo available.",
  path: "/crm-with-attendance",
  keywords: [
    "CRM with attendance system",
    "CRM with GPS tracking",
    "CRM for field sales India",
    "attendance CRM India",
    "field tracking CRM India",
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
    title: "GPS Route Tracking for Field Teams",
    copy: "Field staff tap Start tracking in the Android app and their route is recorded with GPS, even without internet. Each client visit is marked with a check-in.",
    points: ["GPS route", "Visit check-ins", "Works offline"],
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
    copy: "Whether your team is in the office, in the field, or working remotely, GreenCRM records attendance with location for all scenarios.",
    points: ["Field employees", "Remote teams", "Office staff"],
  },
];

const faq = [
  {
    q: "What is a CRM with attendance system?",
    a: "A CRM with attendance system combines customer relationship management with employee attendance tracking. GreenCRM includes both in one platform so your team uses one app for leads, calls, and attendance.",
  },
  {
    q: "Does GreenCRM record location for attendance?",
    a: "Yes. When employees punch in or out, GreenCRM saves the time and location so managers can review it in the attendance history.",
  },
  {
    q: "Is GreenCRM good for field sales teams in India?",
    a: "Yes. GreenCRM is a CRM for field sales in India. Field reps use the Android app to update leads, add notes, record their route with GPS and mark each client visit.",
  },
  {
    q: "Can I track my field employees with GreenCRM?",
    a: "Yes. GreenCRM records field employee attendance with location. Managers can see check-in and check-out times and locations in the attendance history.",
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
          title: "CRM with Attendance System & GPS Tracking for Field Teams in India",
          description:
            "GreenCRM is a CRM with attendance tracking and GPS route tracking built in. Record field employee check-in, check-out, and location from the same CRM you use for leads and calls. Built for Indian field sales teams.",
        }}
        features={features}
        faq={faq}
        cta={{
          title: "See GreenCRM's attendance & field tracking in action",
          description:
            "Book a free demo and see how GreenCRM tracks field attendance, GPS routes, and lead management from one platform.",
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}
