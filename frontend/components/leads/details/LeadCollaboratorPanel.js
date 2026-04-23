"use client";

import {
  LEAD_GHOST_BUTTON_CLASS,
  LEAD_INPUT_CLASS,
  LEAD_KICKER_CLASS,
  LEAD_PRIMARY_BUTTON_CLASS,
} from "../shared/leadPageConstants";

function buildPrimaryAssignee(lead) {
  if (lead?.primary_assignee) {
    return lead.primary_assignee;
  }

  if (!lead?.assigned_to) {
    return null;
  }

  return {
    user_id: lead.assigned_to,
    name: lead.assigned_to_name || "Unassigned",
    role: lead.assigned_to_role || null,
    email: lead.assigned_to_email || null,
    department: lead.assigned_to_department || null,
    is_primary: true,
  };
}

export default function LeadCollaboratorPanel({
  canManage,
  collaboratorUsersMessage,
  lead,
  addCollaborator,
  pendingCollaborator,
  removeCollaborator,
  removingCollaboratorId,
  savingCollaborators,
  setPendingCollaborator,
  teamUsers,
}) {
  const primaryAssignee = buildPrimaryAssignee(lead);
  const sharedUsers = Array.isArray(lead?.shared_users) ? lead.shared_users : [];
  const sharedUserIds = new Set(sharedUsers.map((user) => user.user_id));
  const availableUsers = teamUsers.filter(
    (user) => user.user_id !== lead?.assigned_to && !sharedUserIds.has(user.user_id)
  );

  return (
    <div className="rounded-[24px] border border-[#eadfcd] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={LEAD_KICKER_CLASS}>Access</p>
          <h4 className="mt-2 text-lg font-semibold text-[#060710]">Lead collaborators</h4>
        </div>
        <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fffaf1] px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
          {sharedUsers.length} shared
        </span>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[20px] border border-[#efe2c8] bg-[#fffaf1] px-4 py-4">
          <span className={LEAD_KICKER_CLASS}>Primary Assignee</span>
          <strong className="mt-3 block text-sm text-[#060710]">
            {primaryAssignee?.name || "Unassigned"}
          </strong>
          <p className="mt-2 text-sm leading-6 text-[#6f614c]">
            {[primaryAssignee?.role, primaryAssignee?.email].filter(Boolean).join(" | ") || "No primary assignee selected yet."}
          </p>
        </div>

        <div className="rounded-[20px] border border-[#efe2c8] bg-[#fffaf1] px-4 py-4">
          <span className={LEAD_KICKER_CLASS}>Shared Users</span>
          {sharedUsers.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {sharedUsers.map((user) => (
                <div key={user.user_id} className="flex items-center gap-2 rounded-full border border-[#eadfcd] bg-white px-3 py-2 text-xs font-semibold text-[#5d503c]">
                  <span>{user.name || user.user_id}</span>
                  {user.role ? <span className="text-[#9a886d]">{user.role}</span> : null}
                  {canManage ? (
                    <button
                      className="rounded-full border border-[#eadfcd] px-2 py-0.5 text-[11px] font-bold text-[#7a6230] transition hover:border-[#d7b258] hover:text-[#060710] disabled:opacity-60"
                      type="button"
                      disabled={savingCollaborators || removingCollaboratorId === user.user_id}
                      onClick={() => removeCollaborator(user.user_id)}
                    >
                      {removingCollaboratorId === user.user_id ? "Removing..." : "Remove"}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[#6f614c]">
              Only the primary assignee can see this lead right now.
            </p>
          )}
        </div>
      </div>

      {canManage ? (
        availableUsers.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <label className="space-y-2">
              <span className={LEAD_KICKER_CLASS}>Add More People</span>
              <select
                className={LEAD_INPUT_CLASS}
                value={pendingCollaborator}
                onChange={(event) => setPendingCollaborator(event.target.value)}
              >
                <option value="">Select a user</option>
                {availableUsers.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.name} | {user.role}
                  </option>
                ))}
              </select>
            </label>
            <button
              className={LEAD_PRIMARY_BUTTON_CLASS}
              type="button"
              disabled={savingCollaborators || !pendingCollaborator}
              onClick={addCollaborator}
            >
              {savingCollaborators ? "Saving..." : "Add User"}
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-4 py-4">
            <p className="text-sm text-[#6f614c]">
              {teamUsers.length ? "All eligible users already have access to this lead." : collaboratorUsersMessage}
            </p>
            <button className={LEAD_GHOST_BUTTON_CLASS} type="button" disabled>
              No More Users
            </button>
          </div>
        )
      ) : null}
    </div>
  );
}
