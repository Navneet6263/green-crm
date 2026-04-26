export const LEAD_STATUS_ORDER = [
  "new",
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

export const LEAD_OPEN_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "booked-demo",
  "demo-done",
  "trial-started",
];

export const LEAD_STATUS_LABELS = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  "booked-demo": "Booked Demo",
  "demo-done": "Demo Done",
  "trial-started": "Trial Started",
  "closed-won": "Closed Won",
  "closed-lost": "Closed Lost",
};

export const LEAD_STATUS_BADGES = {
  new: "bg-[#eef5ff] text-[#2563eb] ring-[#cfe0ff]",
  contacted: "bg-[#ecfbff] text-[#0f8da8] ring-[#c8eef4]",
  qualified: "bg-[#f5efff] text-[#7c3aed] ring-[#e4d8ff]",
  proposal: "bg-[#fff4d9] text-[#8d6e27] ring-[#ecdcae]",
  negotiation: "bg-[#fff0e2] text-[#c56b1c] ring-[#f0d3bc]",
  "booked-demo": "bg-[#f3ebff] text-[#7a3ef0] ring-[#dfd0ff]",
  "demo-done": "bg-[#e5fff4] text-[#067647] ring-[#c1f2dd]",
  "trial-started": "bg-[#edf3ff] text-[#2d64dd] ring-[#d6e3ff]",
  "closed-won": "bg-[#ebf8ee] text-[#217346] ring-[#ccead5]",
  "closed-lost": "bg-[#fff0f0] text-[#b63b3b] ring-[#f3caca]",
};

export const LEAD_STATUS_ACCENTS = {
  new: ["rgba(79,140,255,.12)", "#2f6fdd"],
  contacted: ["rgba(56,189,248,.14)", "#0077b8"],
  qualified: ["rgba(167,139,250,.14)", "#6d46d6"],
  proposal: ["rgba(245,164,45,.14)", "#b96a00"],
  negotiation: ["rgba(251,146,60,.14)", "#c96200"],
  "booked-demo": ["rgba(137,92,246,.14)", "#7a3ef0"],
  "demo-done": ["rgba(16,185,129,.14)", "#0f8c53"],
  "trial-started": ["rgba(59,130,246,.14)", "#2d64dd"],
  "closed-won": ["rgba(31,199,120,.16)", "#0f8c53"],
  "closed-lost": ["rgba(224,82,82,.14)", "#b63b3b"],
  pending: ["rgba(245,164,45,.14)", "#b96a00"],
};

export const LEAD_STATUS_COLORS = {
  new: "#4f8cff",
  contacted: "#33c5dc",
  qualified: "#9b7df4",
  proposal: "#d7a13d",
  negotiation: "#f08441",
  "booked-demo": "#8b5cf6",
  "demo-done": "#10b981",
  "trial-started": "#3b82f6",
  "closed-won": "#22c55e",
  "closed-lost": "#ef4444",
};

export function getLeadStatusLabel(status) {
  return LEAD_STATUS_LABELS[String(status || "").toLowerCase()] || titleizeLeadStatus(status);
}

export function titleizeLeadStatus(value = "") {
  return String(value || "")
    .replaceAll("_", "-")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function isClosedLeadStatus(status) {
  return ["closed-won", "closed-lost"].includes(String(status || "").toLowerCase());
}
