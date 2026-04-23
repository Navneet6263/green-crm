import BlogPostShell from "../../../components/landing/BlogPostShell";
import { buildMetadata } from "../../../lib/seo";

export const metadata = buildMetadata({
  title: "CRM vs Excel for Sales: Why Indian Teams Need to Switch | GreenCRM",
  description:
    "Still managing leads in Excel? See why CRM beats Excel for sales teams in India. Compare CRM vs Excel for lead management, follow-ups, and team visibility.",
  path: "/blog/crm-vs-excel-for-sales",
  keywords: [
    "CRM vs Excel for sales",
    "CRM vs Excel India",
    "why use CRM instead of Excel",
    "CRM better than Excel India",
    "sales CRM vs spreadsheet India",
    "replace Excel with CRM India",
    "CRM for sales team India",
  ],
});

const meta = {
  tag: "Sales",
  title: "CRM vs Excel for Sales: Why Your Team Needs to Switch",
  description:
    "Still managing leads in Excel? See why a CRM beats Excel for sales teams in India and how GreenCRM makes the switch easy.",
};

const sections = [
  {
    heading: "Why Indian Sales Teams Still Use Excel",
    body: "Excel is free, familiar, and flexible. Most Indian small businesses start managing leads in Excel because it is easy to set up. But as the team grows and lead volume increases, Excel starts to break down. Leads get missed, follow-ups are forgotten, and managers have no real-time visibility.",
  },
  {
    heading: "CRM vs Excel: Lead Management",
    body: "In Excel, leads are rows in a spreadsheet. There is no automatic follow-up reminder, no owner assignment, and no pipeline view. In a CRM like GreenCRM, every lead has an owner, a follow-up date, and a stage in the pipeline. The CRM reminds your team when to follow up so no lead is ever forgotten.",
  },
  {
    heading: "CRM vs Excel: Calling & WhatsApp",
    body: "Excel cannot make calls or send WhatsApp messages. Your team has to switch between Excel, their phone, and WhatsApp — and then manually update the spreadsheet. GreenCRM lets your team click-to-call and send WhatsApp from the same lead record. Every call and message is logged automatically.",
  },
  {
    heading: "CRM vs Excel: Manager Visibility",
    body: "With Excel, managers have to ask each rep for updates or wait for a weekly report. With GreenCRM, managers get a real-time dashboard showing leads, follow-ups, calls made, and conversions for every rep. No more chasing status updates.",
  },
  {
    heading: "CRM vs Excel: Team Collaboration",
    body: "Excel files get emailed around, overwritten, and duplicated. Multiple people cannot work on the same Excel file at the same time without conflicts. GreenCRM is a shared workspace where the whole team sees the same data in real time.",
  },
  {
    heading: "How to Switch from Excel to CRM in India",
    body: "Switching from Excel to a CRM is easier than most teams think. GreenCRM lets you import your existing leads from Excel in minutes. Your team can start using the CRM the same day. Book a free demo to see how GreenCRM can replace your Excel-based lead tracking.",
  },
];

export default function CrmVsExcelPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.description,
    author: { "@type": "Organization", name: "GreenCRM" },
    publisher: { "@type": "Organization", name: "GreenCRM" },
    inLanguage: "en-IN",
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
