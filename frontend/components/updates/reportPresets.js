// Ready-made report layouts for Recent Updates. Keys match the backend catalog.
export const UPDATE_PRESETS = [
  {
    key: "standard", label: "Full report", description: "Every sheet with the usual columns",
    layout: { sheets: ["summary", "log", "people", "teams", "daily", "records"] },
  },
  {
    key: "daily", label: "Daily work report", description: "What each person did, grouped by person",
    layout: {
      sheets: ["summary", "log"],
      columns: { log: ["date", "time", "by", "company", "contact", "phone", "kind", "to", "response", "next", "note"] },
      options: { log: { group: "person" } },
    },
  },
  {
    key: "calls", label: "Call log", description: "Calls and responses, day by day",
    layout: {
      sheets: ["log"],
      columns: { log: ["date", "time", "by", "company", "phone", "callStatus", "response", "next", "note"] },
      options: { log: { group: "day" } },
    },
  },
  {
    key: "review", label: "Manager review", description: "People, teams and the day-wise grid",
    layout: { sheets: ["summary", "people", "teams", "daily"] },
  },
  {
    key: "followup", label: "Lead follow-up sheet", description: "One row per lead with Update 1, 2, 3…",
    layout: { sheets: ["records"], options: { records: { history: "15" } } },
  },
  {
    key: "status", label: "Status changes", description: "Who moved which lead to which status",
    layout: {
      sheets: ["log"],
      columns: { log: ["date", "time", "by", "team", "company", "product", "from", "to", "response", "note"] },
      options: { log: { group: "none" } },
    },
  },
];
