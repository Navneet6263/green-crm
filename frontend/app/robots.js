import { getSiteUrl } from "../lib/seo";

export default function robots() {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/book-demo", "/icon.svg"],
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
