import { buildMetadata } from "../../lib/seo";

export const metadata = buildMetadata({
  title: "Book Free CRM Demo | GreenCRM India",
  description:
    "Book a free GreenCRM demo for lead management, calling, WhatsApp, SMS, attendance, and dashboards for your business in India.",
  path: "/book-demo",
});

export default function BookDemoLayout({ children }) {
  return children;
}
