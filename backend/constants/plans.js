// Ready-made plans for a new company: which modules are on and how many people of each role.
// A plan only fills module access and seat limits; the super admin can change both later
// (for example to upgrade a tracking client to the full CRM), and no data is lost.

const CRM_MODULES = ["leads", "customers", "workflow", "products", "tasks", "calendar", "communications", "discuss", "analytics", "support", "documents", "performance"];

const PLANS = {
  full: {
    label: "Full CRM",
    description: "Every CRM module, no seat limit.",
    access: null,
    limits: null,
  },
  tracking: {
    label: "Tracking only",
    description: "Live field tracking and attendance. No leads or other CRM screens. 1 admin, 1 manager, 1 sales.",
    access: {
      dashboard: true,
      field_tracking: true,
      attendance: true,
      team_management: true,
      ...Object.fromEntries(CRM_MODULES.map((key) => [key, false])),
    },
    limits: { admin: 1, manager: 1, sales: 1, marketing: 0, support: 0, "legal-team": 0, "finance-team": 0, viewer: 0 },
  },
};

function planFor(key) {
  return PLANS[String(key || "").trim()] || null;
}

module.exports = { CRM_MODULES, PLANS, planFor };
