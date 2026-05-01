export function compact(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    notation: num >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(num);
}

export function money(value) {
  return `INR ${Number(value || 0).toLocaleString("en-IN")}`;
}

export function when(value, withTime = false) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function titleize(value = "") {
  return String(value)
    .replaceAll("_", "-")
    .split("-")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function initials(value = "?") {
  return (
    String(value)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("") || "?"
  );
}

export function countByStatus(leadCounts, status) {
  return Number(
    leadCounts.find(
      (item) =>
        item.status === status ||
        (status === "closed-won" && item.status === "won")
    )?.total || 0
  );
}

export function isToday(value) {
  if (!value) return false;
  const d = new Date(value);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

export const STATUS_ORDER = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "booked-demo",
  "demo-done",
  "trial-started",
  "closed-won",
];

export const STATUS_TONE = {
  new: "bg-slate-100 text-slate-600",
  contacted: "bg-amber-50 text-amber-600 border border-amber-300",
  qualified: "bg-blue-50 text-blue-600 border border-blue-300",
  proposal: "bg-emerald-50 text-emerald-600 border border-emerald-300",
  negotiation: "bg-amber-50 text-amber-600 border border-amber-200",
  "booked-demo": "bg-purple-50 text-purple-600 border border-purple-200",
  "demo-done": "bg-emerald-50 text-emerald-600 border border-emerald-200",
  "trial-started": "bg-teal-50 text-teal-600 border border-teal-200",
  "closed-won": "bg-green-50 text-green-600 border border-green-300",
  "closed-lost": "bg-red-50 text-red-600 border border-red-200",
};

export const ROLE_TONE = {
  manager: "bg-slate-100 text-slate-600",
  sales: "bg-emerald-50 text-emerald-700",
  marketing: "bg-orange-50 text-orange-600",
  support: "bg-blue-50 text-blue-600",
  "legal-team": "bg-amber-50 text-amber-700",
  "finance-team": "bg-yellow-50 text-yellow-700",
};
