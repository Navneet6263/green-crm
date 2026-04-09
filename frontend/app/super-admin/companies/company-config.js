export const STATUS_OPTIONS = [
  { value: "trial", label: "trial" },
  { value: "active", label: "active" },
  { value: "suspended", label: "suspended" },
];

export const ACCESS_FEATURES = [
  { key: "dashboard", label: "Dashboard", group: "Core", mandatory: true, description: "Main cockpit, KPIs, and top-level daily view." },
  { key: "leads", label: "Leads", group: "Growth", description: "Lead capture, list views, detail pages, and follow-up flow." },
  { key: "customers", label: "Customers", group: "Growth", description: "Customer directory and account-level visibility." },
  { key: "workflow", label: "Workflow", group: "Ops", description: "Legal and finance stage movement for revenue completion." },
  { key: "products", label: "Products", group: "Ops", description: "Tenant product catalog and internal offer setup." },
  { key: "team_management", label: "Team Management", group: "Ops", description: "Create employees, manage roles, and control activation." },
  { key: "tasks", label: "Tasks", group: "Execution", description: "Task queue and daily workload coordination." },
  { key: "calendar", label: "Calendar", group: "Execution", description: "Follow-up schedule, meetings, and date visibility." },
  { key: "communications", label: "Communications", group: "Service", description: "Alerts, activity feed, and message-focused surfaces." },
  { key: "analytics", label: "Analytics", group: "Insights", description: "Performance dashboards, source mix, and conversion insight." },
  { key: "support", label: "Support", group: "Service", description: "Support inbox, escalations, and ticket visibility." },
  { key: "documents", label: "Documents", group: "Compliance", description: "Document review surfaces for legal and finance teams." },
  { key: "performance", label: "Performance", group: "Insights", description: "Team comparison and manager performance reporting." },
];

export const ROLE_LIMIT_FIELDS = [
  { key: "admin", label: "Admins" },
  { key: "manager", label: "Managers" },
  { key: "sales", label: "Sales" },
  { key: "marketing", label: "Marketing" },
  { key: "support", label: "Support" },
  { key: "legal-team", label: "Legal Team" },
  { key: "finance-team", label: "Finance Team" },
  { key: "viewer", label: "Viewer" },
];

const CORE_ACCESS_KEYS = ["dashboard", "leads", "customers", "workflow", "team_management", "communications", "support"];
const LITE_ACCESS_KEYS = ["dashboard", "team_management", "communications"];

export const ACCESS_PRESETS = {
  full: ACCESS_FEATURES.reduce((acc, feature) => ({ ...acc, [feature.key]: true }), {}),
  core: ACCESS_FEATURES.reduce((acc, feature) => ({ ...acc, [feature.key]: CORE_ACCESS_KEYS.includes(feature.key) }), {}),
  lite: ACCESS_FEATURES.reduce((acc, feature) => ({ ...acc, [feature.key]: LITE_ACCESS_KEYS.includes(feature.key) }), {}),
};

export const FEATURE_ICON_MAP = {
  dashboard: "dashboard",
  leads: "leads",
  customers: "customers",
  workflow: "workflow",
  products: "products",
  team_management: "users",
  tasks: "tasks",
  calendar: "calendar",
  communications: "message",
  analytics: "analytics",
  support: "support",
  documents: "documents",
  performance: "performance",
};

export const FEATURE_GROUP_STYLES = {
  Core: {
    icon: "dashboard",
    chip: "bg-slate-100 text-slate-700",
    cardOn: "border-emerald-200 bg-emerald-50",
    cardOff: "border-slate-200 bg-white",
  },
  Growth: {
    icon: "leads",
    chip: "bg-blue-100 text-blue-700",
    cardOn: "border-blue-200 bg-blue-50",
    cardOff: "border-slate-200 bg-white",
  },
  Ops: {
    icon: "workflow",
    chip: "bg-cyan-100 text-cyan-700",
    cardOn: "border-cyan-200 bg-cyan-50",
    cardOff: "border-slate-200 bg-white",
  },
  Execution: {
    icon: "tasks",
    chip: "bg-amber-100 text-amber-700",
    cardOn: "border-amber-200 bg-amber-50",
    cardOff: "border-slate-200 bg-white",
  },
  Service: {
    icon: "message",
    chip: "bg-violet-100 text-violet-700",
    cardOn: "border-violet-200 bg-violet-50",
    cardOff: "border-slate-200 bg-white",
  },
  Insights: {
    icon: "analytics",
    chip: "bg-fuchsia-100 text-fuchsia-700",
    cardOn: "border-fuchsia-200 bg-fuchsia-50",
    cardOff: "border-slate-200 bg-white",
  },
  Compliance: {
    icon: "documents",
    chip: "bg-rose-100 text-rose-700",
    cardOn: "border-rose-200 bg-rose-50",
    cardOff: "border-slate-200 bg-white",
  },
};

export const STATUS_STYLES = {
  active: {
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    dot: "bg-emerald-500",
    card: "from-emerald-500 to-teal-500",
  },
  trial: {
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    dot: "bg-amber-400",
    card: "from-amber-400 to-orange-500",
  },
  suspended: {
    badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    dot: "bg-rose-500",
    card: "from-rose-500 to-pink-500",
  },
};

export const CREATE_COMPANY_INITIAL_STATE = {
  name: "",
  slug: "",
  admin_name: "",
  admin_email: "",
  admin_password: "",
  industry: "",
  website: "",
  status: "trial",
  country: "India",
  smtp_host: "",
  smtp_port: "587",
  smtp_user: "",
  smtp_password: "",
  smtp_from_email: "",
  smtp_from_name: "",
  login_url: "",
};

export const CONTROL_NOTES = [
  {
    icon: "security",
    title: "Delegated control",
    copy: "Platform-admin can manage assigned tenants while platform-manager stays review-only for locked settings.",
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    icon: "message",
    title: "DB-first delivery",
    copy: "Login URL, credential copy, and tenant SMTP keep working from saved company settings.",
    tone: "bg-blue-50 text-blue-700",
  },
  {
    icon: "users",
    title: "Seat enforcement",
    copy: "Role limits stay blank for unlimited, or set exact caps for admin, sales, support, and more.",
    tone: "bg-slate-100 text-slate-700",
  },
];

export const CREATE_FORM_GROUPS = [
  {
    key: "basics",
    eyebrow: "Launch Basics",
    title: "Start with company and admin.",
    description: "Keep the first block focused on identity, owner, and default workspace status.",
    fields: [
      { key: "name", label: "Company Name", required: true },
      { key: "slug", label: "Slug", required: true },
      { key: "admin_name", label: "Admin Name", required: true },
      { key: "admin_email", label: "Admin Email", type: "email", required: true },
      { key: "admin_password", label: "Admin Password", type: "password", hint: "Leave blank to auto-generate a temporary password." },
      { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
      { key: "industry", label: "Industry" },
      { key: "website", label: "Website" },
      { key: "country", label: "Country" },
    ],
  },
  {
    key: "delivery",
    eyebrow: "Login And SMTP",
    title: "Attach delivery details up front.",
    description: "Optional SMTP and login URL settings can be saved when the tenant is created.",
    fields: [
      { key: "login_url", label: "Login URL", placeholder: "https://crm.greencall.in/login", full: true },
      { key: "smtp_host", label: "SMTP Host", placeholder: "smtp.gmail.com" },
      { key: "smtp_port", label: "SMTP Port", placeholder: "587" },
      { key: "smtp_user", label: "SMTP User", placeholder: "crm@company.com" },
      { key: "smtp_password", label: "SMTP Password", type: "password", placeholder: "App password" },
      { key: "smtp_from_email", label: "From Email", placeholder: "crm@company.com" },
      { key: "smtp_from_name", label: "From Name", placeholder: "Company CRM" },
    ],
  },
];

export const SETTINGS_FORM_GROUPS = [
  {
    key: "profile",
    eyebrow: "Company Profile",
    title: "Keep tenant identity clean.",
    description: "Basic contact, timezone, currency, and workspace profile details.",
    fields: [
      { key: "name", label: "Company Name" },
      { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
      { key: "contact_email", label: "Contact Email" },
      { key: "admin_email", label: "Admin Email" },
      { key: "contact_phone", label: "Contact Phone" },
      { key: "industry", label: "Industry" },
      { key: "website", label: "Website" },
      { key: "country", label: "Country" },
      { key: "settings_currency", label: "Currency" },
      { key: "settings_timezone", label: "Timezone" },
    ],
  },
  {
    key: "smtp",
    eyebrow: "SMTP Delivery",
    title: "Use CRM mail or company mail.",
    description: "Leave blank to keep platform SMTP. Fill these to send from the tenant mailbox.",
    fields: [
      { key: "smtp_host", label: "SMTP Host", placeholder: "smtp.gmail.com" },
      { key: "smtp_port", label: "SMTP Port", placeholder: "587" },
      { key: "smtp_user", label: "SMTP User", placeholder: "crm@company.com" },
      { key: "smtp_password", label: "SMTP Password", type: "password", hint: "Leave blank to keep the current saved SMTP password." },
      { key: "smtp_from_email", label: "From Email", placeholder: "crm@company.com" },
      { key: "smtp_from_name", label: "From Name", placeholder: "Company CRM" },
      { key: "smtp_reply_to", label: "Reply To", placeholder: "ops@company.com", full: true },
      { key: "test_email_to", label: "Test Email To", placeholder: "ops@company.com", full: true },
    ],
  },
  {
    key: "auth",
    eyebrow: "Access Email Flow",
    title: "Control login URL and auth copy.",
    description: "Saved in the database and reused for future invite and reset emails.",
    fields: [
      { key: "login_url", label: "Login URL", placeholder: "https://crm.greencall.in/login", full: true },
      { key: "credentials_subject", label: "Credential Email Subject", placeholder: "Welcome to GreenCRM" },
      { key: "credentials_heading", label: "Credential Email Heading", placeholder: "Your account is ready" },
      { key: "reset_subject", label: "Password Reset Subject", placeholder: "Reset your workspace password", full: true },
      { key: "credentials_note", label: "Credential Email Note", type: "textarea", rows: 5, placeholder: "Please sign in and change this temporary password immediately.", full: true },
    ],
  },
];
