import { BRAND_ICONS, BRAND_NAME } from "../components/branding/brandConfig";

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
        src: BRAND_ICONS.icon192.src,
        sizes: `${BRAND_ICONS.icon192.width}x${BRAND_ICONS.icon192.height}`,
        type: BRAND_ICONS.icon192.type,
        purpose: "any",
      },
      {
        src: BRAND_ICONS.icon512.src,
        sizes: `${BRAND_ICONS.icon512.width}x${BRAND_ICONS.icon512.height}`,
        type: BRAND_ICONS.icon512.type,
        purpose: "any maskable",
      },
    ],
  };
}
