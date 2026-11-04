// The Settings menu: one list for every settings page, filtered by role.
// Users, Teams and Products have their own pages in the sidebar, so they are not listed here.
const ADMINS = ["super-admin", "admin"];

export const SETTINGS_SECTIONS = [
  {
    title: "You",
    items: [
      { key: "profile", href: "/settings/profile", label: "My profile", icon: "user", description: "Your name, contact details and password" },
    ],
  },
  {
    title: "Company",
    items: [
      { key: "company", href: "/settings/company", label: "Company", icon: "company", roles: ADMINS, description: "Name, address, logo details and email sender" },
      { key: "integrations", href: "/settings/integrations", label: "Integrations", icon: "mail", roles: ADMINS, description: "Email, Microsoft 365 inbox, WhatsApp, SMS and calling" },
    ],
  },
  {
    title: "Sales setup",
    items: [
      { key: "customize", href: "/settings/customize", label: "Lead customization", icon: "edit", roles: ADMINS, description: "Lead statuses, form fields and your own fields" },
    ],
  },
];

export function settingsFor(role) {
  return SETTINGS_SECTIONS
    .map((section) => ({ ...section, items: section.items.filter((item) => !item.roles || item.roles.includes(role)) }))
    .filter((section) => section.items.length);
}

export const settingsItem = (key) => SETTINGS_SECTIONS.flatMap((s) => s.items).find((item) => item.key === key);
