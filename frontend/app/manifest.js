import { BRAND_LOGO, BRAND_NAME } from "../components/branding/brandConfig";

export default function manifest() {
  return {
    name: BRAND_NAME,
    short_name: BRAND_NAME,
    description:
      "GreenCRM is a role-based CRM platform for leads, customers, workflow, reminders, and team operations.",
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
