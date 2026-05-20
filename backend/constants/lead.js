const LEAD_STATUSES = [
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

const OPEN_PIPELINE_STATUSES = [
  "new",
  "pending",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "booked-demo",
  "demo-done",
  "trial-started",
];

const LEAD_PRIORITIES = ["low", "medium", "high"];

const LEAD_ACTIVITY_TYPES = [
  "created",
  "updated",
  "assigned",
  "status_changed",
  "comment",
  "note",
  "call",
  "email",
  "meeting",
  "task",
  "workflow",
  "follow_up",
  "bulk_imported",
];

module.exports = {
  LEAD_ACTIVITY_TYPES,
  LEAD_PRIORITIES,
  LEAD_STATUSES,
  OPEN_PIPELINE_STATUSES,
};
