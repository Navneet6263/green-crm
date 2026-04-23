import { getSiteUrl } from "../lib/seo";

export default function robots() {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/book-demo",
          "/icon.svg",
          "/crm-software-india",
          "/crm-in-noida",
          "/crm-for-small-business",
          "/crm-with-calling",
          "/crm-with-whatsapp",
          "/crm-for-sales-team",
          "/crm-for-startups",
          "/crm-with-attendance",
          "/blog",
          "/blog/",
          "/blog/what-is-crm-software",
          "/blog/best-crm-tools-india",
          "/blog/how-crm-helps-small-business",
          "/blog/crm-vs-excel-for-sales",
          "/blog/why-sales-team-needs-crm",
          "/blog/benefits-of-crm-for-startups",
        ],
        disallow: [
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/dashboard",
          "/analytics",
          "/calendar",
          "/communications",
          "/customers",
          "/documents",
          "/leads",
          "/performance",
          "/settings",
          "/support",
          "/super-admin",
          "/tasks",
          "/workflow",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
