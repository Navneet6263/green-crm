import { ROLE_HOME_ROUTE, ROLE_LABEL } from "../../lib/roles";

export const ROLE_COLOR = {
  "super-admin": "#9a7cff",
  "platform-admin": "#2784ff",
  "platform-manager": "#0ea5a4",
  admin: "#4f8cff",
  manager: "#23b5d3",
  sales: "#1fc778",
  marketing: "#ff6c9c",
  "legal-team": "#f4a42d",
  "finance-team": "#ff8b4d",
  support: "#ff6b5e",
  viewer: "#94a3b8",
};

export const ROLE_DESCRIPTIONS = {
  "super-admin": "Cross-tenant control for access, company setup, and platform safety.",
  "platform-admin": "Delegated platform operator for assigned companies, tenant settings, and tenant users.",
  "platform-manager": "Assigned-company operator focused on delivery, review, and daily platform oversight.",
  admin: "Tenant control across pipeline, users, settings, and analytics.",
  manager: "Team execution view for workload, follow-through, and pipeline movement.",
  sales: "Daily follow-up workspace focused on deal movement and conversions.",
  marketing: "Channel and demand workspace for campaign quality and qualified flow.",
  "legal-team": "Legal review surface for approval, document movement, and completion.",
  "finance-team": "Finance control surface for invoicing, payout, and revenue completion.",
  support: "Support queue for tickets, escalations, and customer issues.",
  viewer: "Read-only summary across the visible company funnel.",
};

export const PAGE_SUMMARY = {
  "Super Admin Dashboard": "Track company growth, user access, and platform activity from one cleaner overview.",
  "Admin Dashboard": "Coordinate the tenant funnel, team capacity, and workflow delivery from one control view.",
  "Manager Dashboard": "Track team execution, rebalance workload, and keep pipeline movement visible at a glance.",
  "Sales Dashboard": "Prioritize follow-ups, protect deal momentum, and keep your daily target path clean.",
  "Marketing Dashboard": "Review channel mix, qualified inflow, and campaign-ready follow-through without clutter.",
  "Legal Dashboard": "Move won deals through approvals with clean status visibility and document readiness.",
  "Finance Dashboard": "Clear invoice bottlenecks, monitor collection readiness, and finish the workflow with confidence.",
  "Support Dashboard": "Resolve open issues fast with a sharper queue, alert visibility, and workload summary.",
  "Viewer Dashboard": "Consume the pipeline in read-only mode with the same premium context and navigation.",
  "Lead Workspace": "Monitor funnel quality, assignment hygiene, product mix, and close-risk signals in one place.",
  "Lead History": "Review timeline movement across leads to catch slip points and workflow churn early.",
  "Create Lead": "Capture a clean lead record with the right company, product, and follow-up context from the start.",
  "Edit Lead": "Update the record without losing pipeline discipline, ownership, or workflow clarity.",
  "Workflow Tracker": "See how revenue moves from sales to legal to finance and where the queue is building up.",
  "Legal Queue": "Review assigned legal-stage opportunities and keep document movement predictable.",
  "Finance Queue": "Review assigned finance-stage opportunities and close invoice readiness gaps quickly.",
  Analytics: "Read source mix and product contribution with a cleaner information hierarchy built for decision-making.",
  Tasks: "Keep execution visible with a lighter task workspace designed around urgency and completion.",
  Calendar: "Stay on top of the schedule with a focused view of upcoming actions and workload timing.",
  Communications: "Review alerts and recent activity without burying the important signals.",
  Customers: "Track active customer records and move between accounts with a cleaner directory experience.",
  Documents: "Access legal and finance documents from a dedicated, simpler review surface.",
  "Team Performance": "Compare team load, member visibility, and upcoming work without dashboard noise.",
  Companies: "Browse tenant accounts, health indicators, and company-level context from a cleaner platform list.",
  "Platform Users": "Review access across tenants with stronger hierarchy and less scanning friction.",
  "Demo Requests": "Triage incoming requests quickly with clearer status and ownership context.",
  "Audit Logs": "Read platform history in a tighter, easier-to-scan stream built for trust and review.",
  Security: "Keep platform safety signals visible with a surface built for rapid executive checking.",
  "System Settings": "Review platform defaults and system-wide controls inside the same shared shell.",
  "Super Admin Panel": "Summarize platform posture with cleaner safety and growth signals.",
  "Company Settings": "Manage tenant profile data with a more focused configuration surface.",
  "User Settings": "Create teammates, review access, and manage activation from a cleaner control view.",
  "Product Settings": "Publish and organize tenant products with a sharper catalog layout.",
  "Profile Settings": "Update personal identity and account details without leaving the shared shell.",
  "Create Customer": "Create customer records through a compact form flow with clearer field rhythm.",
};

const SECTION = (title, items) => ({ title, items });
const ITEM = (label, href, icon, accessKey = null) => ({ label, href, icon, accessKey });

export const SIDEBAR_SECTIONS = {
  "super-admin": [
    SECTION("Platform", [
      ITEM("Dashboard", ROLE_HOME_ROUTE["super-admin"], "dashboard"),
      ITEM("Companies", "/super-admin/companies", "company"),
      ITEM("Platform Users", "/super-admin/users", "users"),
    ]),
    SECTION("Trust", [
      ITEM("Demo Requests", "/super-admin/demo-requests", "demo"),
      ITEM("Audit Logs", "/super-admin/audit-logs", "audit"),
      ITEM("Security", "/super-admin/security", "security"),
      ITEM("System Settings", "/super-admin/settings", "settings"),
    ]),
  ],
  "platform-admin": [
    SECTION("Platform", [
      ITEM("Dashboard", ROLE_HOME_ROUTE["platform-admin"], "dashboard"),
      ITEM("Companies", "/super-admin/companies", "company"),
      ITEM("Platform Users", "/super-admin/users", "users"),
    ]),
    SECTION("Review", [
      ITEM("Security", "/super-admin/security", "security"),
    ]),
  ],
  "platform-manager": [
    SECTION("Platform", [
      ITEM("Dashboard", ROLE_HOME_ROUTE["platform-manager"], "dashboard"),
      ITEM("Companies", "/super-admin/companies", "company"),
    ]),
  ],
  admin: [
    SECTION("Control Room", [
      ITEM("Dashboard", ROLE_HOME_ROUTE.admin, "dashboard"),
      ITEM("Leads", "/leads", "leads", "leads"),
      ITEM("Customers", "/customers", "customers", "customers"),
      ITEM("Workflow", "/workflow", "workflow", "workflow"),
    ]),
    SECTION("Operations", [
      ITEM("Products", "/settings/products", "products", "products"),
      ITEM("Team", "/settings/users", "users", "team_management"),
      ITEM("Tasks", "/tasks", "tasks", "tasks"),
      ITEM("Calendar", "/calendar", "calendar", "calendar"),
      ITEM("Communications", "/communications", "message", "communications"),
    ]),
    SECTION("Insights", [
      ITEM("Analytics", "/analytics", "analytics", "analytics"),
      ITEM("Support", "/support", "support", "support"),
      ITEM("Settings", "/settings/company", "settings"),
    ]),
  ],
  manager: [
    SECTION("Execution", [
      ITEM("Dashboard", ROLE_HOME_ROUTE.manager, "dashboard"),
      ITEM("Leads", "/leads", "leads", "leads"),
      ITEM("Tasks", "/tasks", "tasks", "tasks"),
      ITEM("Calendar", "/calendar", "calendar", "calendar"),
    ]),
    SECTION("Team", [
      ITEM("Customers", "/customers", "customers", "customers"),
      ITEM("Performance", "/performance", "performance", "performance"),
      ITEM("Analytics", "/analytics", "analytics", "analytics"),
      ITEM("Workflow", "/workflow", "workflow", "workflow"),
    ]),
  ],
  sales: [
    SECTION("Selling", [
      ITEM("Dashboard", ROLE_HOME_ROUTE.sales, "dashboard"),
      ITEM("My Leads", "/leads", "leads", "leads"),
      ITEM("Tasks", "/tasks", "tasks", "tasks"),
      ITEM("Calendar", "/calendar", "calendar", "calendar"),
    ]),
    SECTION("Activity", [
      ITEM("Customers", "/customers", "customers", "customers"),
      ITEM("Communications", "/communications", "message", "communications"),
      ITEM("Support", "/support", "support", "support"),
    ]),
  ],
  marketing: [
    SECTION("Growth", [
      ITEM("Dashboard", ROLE_HOME_ROUTE.marketing, "dashboard"),
      ITEM("Leads", "/leads", "leads", "leads"),
      ITEM("Analytics", "/analytics", "analytics", "analytics"),
      ITEM("Calendar", "/calendar", "calendar", "calendar"),
    ]),
    SECTION("Ops", [
      ITEM("Tasks", "/tasks", "tasks", "tasks"),
      ITEM("Communications", "/communications", "message", "communications"),
      ITEM("Customers", "/customers", "customers", "customers"),
    ]),
  ],
  "legal-team": [
    SECTION("Workflow", [
      ITEM("Dashboard", ROLE_HOME_ROUTE["legal-team"], "dashboard"),
      ITEM("Legal Queue", "/workflow/legal", "workflow", "workflow"),
      ITEM("Documents", "/documents", "documents", "documents"),
      ITEM("Tasks", "/tasks", "tasks", "tasks"),
    ]),
  ],
  "finance-team": [
    SECTION("Workflow", [
      ITEM("Dashboard", ROLE_HOME_ROUTE["finance-team"], "dashboard"),
      ITEM("Finance Queue", "/workflow/finance", "finance", "workflow"),
      ITEM("Documents", "/documents", "documents", "documents"),
      ITEM("Tasks", "/tasks", "tasks", "tasks"),
    ]),
  ],
  support: [
    SECTION("Support", [
      ITEM("Dashboard", ROLE_HOME_ROUTE.support, "dashboard"),
      ITEM("Support Center", "/support", "support", "support"),
      ITEM("Tasks", "/tasks", "tasks", "tasks"),
      ITEM("Communications", "/communications", "message", "communications"),
    ]),
  ],
  viewer: [
    SECTION("Overview", [
      ITEM("Dashboard", ROLE_HOME_ROUTE.viewer, "dashboard"),
      ITEM("Leads", "/leads", "leads", "leads"),
      ITEM("Customers", "/customers", "customers", "customers"),
    ]),
  ],
};

export const ROLE_SHORTCUTS = {
  "super-admin": [
    ITEM("Companies", "/super-admin/companies", "company"),
    ITEM("Users", "/super-admin/users", "users"),
    ITEM("Audit", "/super-admin/audit-logs", "audit"),
  ],
  "platform-admin": [
    ITEM("Companies", "/super-admin/companies", "company"),
    ITEM("Users", "/super-admin/users", "users"),
    ITEM("Security", "/super-admin/security", "security"),
  ],
  "platform-manager": [
    ITEM("Companies", "/super-admin/companies", "company"),
    ITEM("Dashboard", "/super-admin", "dashboard"),
  ],
  admin: [
    ITEM("New Lead", "/leads/new", "leads"),
    ITEM("Team", "/settings/users", "users"),
    ITEM("Analytics", "/analytics", "analytics"),
  ],
  manager: [
    ITEM("Leads", "/leads", "leads"),
    ITEM("Performance", "/performance", "performance"),
    ITEM("Tasks", "/tasks", "tasks"),
  ],
  sales: [
    ITEM("New Lead", "/leads/new", "leads"),
    ITEM("Calendar", "/calendar", "calendar"),
    ITEM("Tasks", "/tasks", "tasks"),
  ],
  marketing: [
    ITEM("Leads", "/leads", "leads"),
    ITEM("Analytics", "/analytics", "analytics"),
    ITEM("Calendar", "/calendar", "calendar"),
  ],
  "legal-team": [
    ITEM("Legal Queue", "/workflow/legal", "workflow"),
    ITEM("Documents", "/documents", "documents"),
    ITEM("Tasks", "/tasks", "tasks"),
  ],
  "finance-team": [
    ITEM("Finance Queue", "/workflow/finance", "finance"),
    ITEM("Documents", "/documents", "documents"),
    ITEM("Tasks", "/tasks", "tasks"),
  ],
  support: [
    ITEM("Support Center", "/support", "support"),
    ITEM("Communications", "/communications", "message"),
    ITEM("Tasks", "/tasks", "tasks"),
  ],
  viewer: [
    ITEM("Leads", "/leads", "leads"),
    ITEM("Customers", "/customers", "customers"),
  ],
};

export function getRoleMeta(role) {
  return {
    color: ROLE_COLOR[role] || "#94a3b8",
    label: ROLE_LABEL[role] || role || "Workspace",
    description: ROLE_DESCRIPTIONS[role] || "Role-aware workspace for multi-tenant CRM operations.",
    sections: SIDEBAR_SECTIONS[role] || SIDEBAR_SECTIONS.viewer,
    shortcuts: ROLE_SHORTCUTS[role] || ROLE_SHORTCUTS.viewer,
  };
}
