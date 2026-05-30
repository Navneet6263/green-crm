// Helper to get enabled lead statuses from customization
export function getEnabledStatuses(customization) {
  if (!customization || !customization.lead_statuses) {
    return getDefaultStatuses();
  }
  return customization.lead_statuses;
}

export function getDefaultStatuses() {
  return [
    "new",
    "pending",
    "contacted",
    "qualified",
    "proposal",
    "negotiation",
    "booked-demo",
    "demo-done",
    "trial-started",
    "closed-won",
    "closed-lost",
  ];
}

export function getStatusLabel(status) {
  const labels = {
    "new": "New",
    "pending": "Pending",
    "contacted": "Contacted",
    "qualified": "Qualified",
    "proposal": "Proposal",
    "negotiation": "Negotiation",
    "booked-demo": "Booked Demo",
    "demo-done": "Demo Done",
    "trial-started": "Trial Started",
    "closed-won": "Closed Won",
    "closed-lost": "Closed Lost",
  };
  return labels[status] || status;
}

export function getStatusColor(status) {
  const colors = {
    "new": "blue",
    "pending": "yellow",
    "contacted": "purple",
    "qualified": "cyan",
    "proposal": "indigo",
    "negotiation": "orange",
    "booked-demo": "pink",
    "demo-done": "teal",
    "trial-started": "violet",
    "closed-won": "green",
    "closed-lost": "red",
  };
  return colors[status] || "gray";
}
