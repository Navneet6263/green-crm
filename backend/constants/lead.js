const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "closed-won",
  "closed-lost",
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
};
