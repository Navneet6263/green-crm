// Helper to get enabled lead statuses from customization
export function getEnabledStatuses(customization) {
  if (!customization || !customization.lead_statuses) {
    return getDefaultStatuses();
  }
  
  const statuses = [...customization.lead_statuses];
  if (!statuses.includes("onboarded")) {
    const closedWonIndex = statuses.indexOf("closed-won");
    if (closedWonIndex !== -1) {
      statuses.splice(closedWonIndex + 1, 0, "onboarded");
    } else {
      const closedLostIndex = statuses.indexOf("closed-lost");
      if (closedLostIndex !== -1) {
        statuses.splice(closedLostIndex, 0, "onboarded");
      } else {
        statuses.push("onboarded");
      }
    }
  }
  return statuses;
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
    "onboarded",
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
    "onboarded": "Onboarded",
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
    "onboarded": "green",
    "closed-lost": "red",
  };
  return colors[status] || "gray";
}
