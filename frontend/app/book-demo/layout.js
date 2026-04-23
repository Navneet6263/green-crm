import { buildMetadata } from "../../lib/seo";

export const metadata = buildMetadata({
  title: "Book Free CRM Demo | Best CRM Software India | GreenCRM Noida",
  description:
    "Book a free GreenCRM demo today. See how our affordable CRM software in India handles lead management, calling, WhatsApp, SMS, attendance, and dashboards for small businesses, startups, and sales teams.",
  path: "/book-demo",
  keywords: [
    "CRM with free demo",
    "book CRM demo India",
    "free CRM demo Noida",
    "GreenCRM demo",
    "affordable CRM software India",
    "CRM software pricing India",
    "best CRM for small business India",
    "CRM for startups India",
    "sales CRM demo",
  ],
});

export default function BookDemoLayout({ children }) {
  return children;
}
