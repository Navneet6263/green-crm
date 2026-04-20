export default function manifest() {
  return {
    name: "GreenCRM",
    short_name: "GreenCRM",
    description:
      "GreenCRM is a role-based CRM platform for leads, customers, workflow, reminders, and team operations.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fbff",
    theme_color: "#10111d",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
