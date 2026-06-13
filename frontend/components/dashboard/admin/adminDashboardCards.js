import { buildLeadDrilldownHref, buildDateHref } from "./adminDashboardUtils";

export function buildMetricCards(kpis, todayKey, firstTrendKey, filterMeta, bookedDemoCardMeta) {

  return [
    {
      label: "Today Leads",
      value: kpis.today_leads,
      accent: "#5eead4",
      note: "Fresh inflow created today. Click to inspect today's lead list.",
      href: buildDateHref(todayKey, todayKey, filterMeta),
    },
    {
      label: "Last 7 Days",
      value: kpis.last_7_days_leads,
      accent: "#60a5fa",
      note: "Recent lead velocity across the last 7 India business days.",
      href: buildDateHref(firstTrendKey, todayKey, filterMeta),
    },
    {
      label: "Working Leads",
      value: kpis.open_pipeline,
      accent: "#f59e0b",
      note: "All leads currently being worked on and pending closure.",
      href: buildLeadDrilldownHref({ quick_filter: "active", ...filterMeta }),
    },
    {
      label: "Closed Won",
      value: kpis.closed_won,
      accent: "#34d399",
      note: "Deals that have already converted to revenue-ready wins.",
      href: buildLeadDrilldownHref({ status: "closed-won", ...filterMeta }),
    },
    {
      label: "Booked Demo",
      value: kpis.booked_demo_total,
      accent: "#a78bfa",
      note: "Demo-ready leads waiting in booked stage. Click for the full list.",
      meta: bookedDemoCardMeta,
      href: buildLeadDrilldownHref({ status: "booked-demo", ...filterMeta }),
    },
  ];
}

export function buildInsightCards(insights, filterMeta) {
  return [
    {
      label: "High Priority Leads",
      value: insights.high_priority,
      copy: "Fast-touch deals with higher urgency or revenue pressure.",
      accent: "#f97316",
      href: buildLeadDrilldownHref({ priority: "high", quick_filter: "active", ...filterMeta }),
    },
    {
      label: "No Follow-up Leads",
      value: insights.no_follow_up,
      copy: "Open leads without the next action date locked in.",
      accent: "#38bdf8",
      href: buildLeadDrilldownHref({ quick_filter: "active", ...filterMeta }),
    },
    {
      label: "Unassigned Leads",
      value: insights.unassigned,
      copy: "Pipeline entries still missing a clear owner.",
      accent: "#facc15",
      href: buildLeadDrilldownHref({ quick_filter: "unassigned", ...filterMeta }),
    },
    {
      label: "Pending Demo",
      value: insights.pending_demo,
      copy: "Booked demos that are not marked demo done yet.",
      accent: "#8b5cf6",
      href: buildLeadDrilldownHref({ status: "booked-demo", ...filterMeta }),
    },
  ];
}
