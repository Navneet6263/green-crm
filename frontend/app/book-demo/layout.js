import { buildMetadata } from "../../lib/seo";

export const metadata = buildMetadata({
  title: "Book A CRM Demo",
  description:
    "Book a GreenCRM demo to review lead management, customer workflows, reminders, dashboards, and team operations for your business.",
  path: "/book-demo",
});

export default function BookDemoLayout({ children }) {
  return children;
}
