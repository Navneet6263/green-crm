const ROLES = {
  SUPER_ADMIN:  "super-admin",
  PLATFORM_ADMIN: "platform-admin",
  PLATFORM_MANAGER: "platform-manager",
  ADMIN:        "admin",
  MANAGER:      "manager",
  SALES:        "sales",
  LEGAL_TEAM:   "legal-team",
  FINANCE_TEAM: "finance-team",
  SUPPORT:      "support",
  MARKETING:    "marketing",
  VIEWER:       "viewer",
};

const ROLE_VALUES = Object.values(ROLES);
const PLATFORM_OPERATOR_ROLES = [ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_MANAGER];
const PLATFORM_CONSOLE_ROLES = [ROLES.SUPER_ADMIN, ...PLATFORM_OPERATOR_ROLES];

// Can manage teams and assign leads
const MANAGER_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.PLATFORM_ADMIN,
  ROLES.PLATFORM_MANAGER,
  ROLES.ADMIN,
  ROLES.MANAGER,
];

// Can create leads
const LEAD_CREATOR_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.PLATFORM_ADMIN,
  ROLES.PLATFORM_MANAGER,
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.SALES,
  ROLES.MARKETING,
];

// Can see all company leads
const COMPANY_WIDE_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.PLATFORM_ADMIN,
  ROLES.PLATFORM_MANAGER,
  ROLES.ADMIN,
  ROLES.MANAGER,
];

// Workflow stage → which role handles it
const WORKFLOW_ROLE_MAP = {
  sales:     [ROLES.SALES, ROLES.MANAGER, ROLES.ADMIN],
  legal:     [ROLES.LEGAL_TEAM, ROLES.ADMIN],
  finance:   [ROLES.FINANCE_TEAM, ROLES.ADMIN],
  completed: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
};

// Sidebar items per role (used in frontend)
const SIDEBAR_MAP = {
  [ROLES.SUPER_ADMIN]: [
    "platform-dashboard", "companies", "all-users",
    "demo-requests", "audit-logs", "security", "system-settings",
  ],
  [ROLES.ADMIN]: [
    "dashboard", "leads", "customers", "products", "team",
    "analytics", "tasks", "calendar", "communications",
    "workflow", "support", "settings",
  ],
  [ROLES.MANAGER]: [
    "dashboard", "leads", "customers", "team-performance",
    "analytics", "tasks", "calendar",
  ],
  [ROLES.SALES]: [
    "dashboard", "my-leads", "customers", "tasks", "calendar", "communications",
  ],
  [ROLES.LEGAL_TEAM]: [
    "dashboard", "legal-queue", "documents", "tasks",
  ],
  [ROLES.FINANCE_TEAM]: [
    "dashboard", "finance-queue", "documents", "tasks",
  ],
  [ROLES.SUPPORT]: [
    "dashboard", "support-tickets", "tasks",
  ],
  [ROLES.MARKETING]: [
    "dashboard", "leads", "tasks", "calendar",
  ],
  [ROLES.VIEWER]: [
    "dashboard", "leads",
  ],
};

const MAX_SUPER_ADMINS = 4;

module.exports = {
  ROLES,
  ROLE_VALUES,
  PLATFORM_CONSOLE_ROLES,
  PLATFORM_OPERATOR_ROLES,
  MANAGER_ROLES,
  LEAD_CREATOR_ROLES,
  COMPANY_WIDE_ROLES,
  WORKFLOW_ROLE_MAP,
  SIDEBAR_MAP,
  MAX_SUPER_ADMINS,
};
