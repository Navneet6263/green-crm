import { BRAND_LOGO, BRAND_NAME } from "../components/branding/brandConfig";

export default function manifest() {
  return {
    name: BRAND_NAME,
    short_name: BRAND_NAME,
    description:
      "GreenCRM is the best CRM software in India for small businesses and sales teams. Manage leads, calls, WhatsApp, SMS, attendance, and dashboards in one affordable CRM. Based in Noida, serving all of India.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fbff",
    theme_color: "#10111d",
    icons: [
      {
        src: BRAND_LOGO.src,
        sizes: "any",
      },
    ],
  };
}
