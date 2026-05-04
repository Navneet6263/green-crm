"use client";

import { getLeadStatusLabel } from "../../lib/leadStatus";

function ownerName(users = [], userId, fallback = "Unassigned") {
  return users.find((user) => user.user_id === userId)?.name || fallback;
}

export function buildStatusActivityDescription({
  assigneeOptions = [],
  currentStatus,
  demo = {},
  followUp = {},
  lead = {},
  nextStatus,
  note = "",
}) {
  if (nextStatus === "booked-demo") {
    return [
      `Status changed from ${getLeadStatusLabel(currentStatus)} to ${getLeadStatusLabel(nextStatus)}`,
      `Requirement: ${demo.requirement.trim()}`,
      `Demo scheduled: ${demo.date} ${demo.time}`,
      `Assigned from ${lead.assigned_to_name || lead.assigned_to || "Unassigned"} to ${ownerName(assigneeOptions, demo.assignee, demo.assignee)}`,
      demo.note?.trim() ? `Note: ${demo.note.trim()}` : "",
    ].filter(Boolean).join("\n");
  }

  const lines = [
    `Status changed: ${getLeadStatusLabel(currentStatus)} -> ${getLeadStatusLabel(nextStatus)}`,
    note,
  ];

  if (followUp.required) {
    lines.push(`Next follow-up: ${followUp.date} ${followUp.time} (${followUp.mode})`);
  }

  return lines.join("\n");
}
