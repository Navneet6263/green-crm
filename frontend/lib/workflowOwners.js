function cleanValue(value) {
  return String(value || "").trim();
}

export function formatWorkflowOwnerIdentity(name, userId, fallback = "Not assigned") {
  const normalizedName = cleanValue(name);
  const normalizedId = cleanValue(userId);

  if (!normalizedName && !normalizedId) {
    return fallback;
  }

  return [normalizedName || "Assigned user", normalizedId].filter(Boolean).join(" | ");
}

export function withAssignedWorkflowUser(users = [], assignedUserId = "", assignedUserName = "", role = "") {
  const normalizedId = cleanValue(assignedUserId);
  const items = Array.isArray(users) ? users.filter(Boolean) : [];

  if (!normalizedId || items.some((user) => cleanValue(user?.user_id) === normalizedId)) {
    return items;
  }

  return [
    {
      user_id: normalizedId,
      name: cleanValue(assignedUserName) || "Assigned user",
      role,
      isFallback: true,
    },
    ...items,
  ];
}

export function workflowUsersEmptyMessage(teamName = "", roleLabel = "workflow") {
  const normalizedTeamName = cleanValue(teamName);
  const normalizedRole = cleanValue(roleLabel) || "workflow";

  if (normalizedTeamName) {
    return `No active ${normalizedRole} users are linked to ${normalizedTeamName} right now. Add them under Teams before assigning this record.`;
  }

  return `No active ${normalizedRole} users are linked to this workspace right now. Add them under Teams before assigning this record.`;
}
