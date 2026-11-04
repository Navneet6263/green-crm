export const PLATFORM_CONSOLE_ROLES = ["super-admin", "platform-admin", "platform-manager"];

export const ROLE_HOME_ROUTE = {
  "super-admin": "/super-admin",
  "platform-admin": "/super-admin",
  "platform-manager": "/super-admin",
  // One dashboard for every company role; its widgets follow the role.
  admin: "/dashboard",
  manager: "/dashboard",
  sales: "/dashboard",
  marketing: "/dashboard",
  "legal-team": "/dashboard",
  "finance-team": "/dashboard",
  support: "/dashboard",
  viewer: "/dashboard",
  expert: "/dashboard/expert",
};

export const ROLE_LABEL = {
  "super-admin": "Super Admin",
  "platform-admin": "Platform Admin",
  "platform-manager": "Platform Manager",
  admin: "Admin",
  manager: "Manager",
  sales: "Sales",
  marketing: "Marketing",
  "legal-team": "Legal Team",
  "finance-team": "Finance Team",
  support: "Support",
  viewer: "Viewer",
  expert: "Expert",
};
