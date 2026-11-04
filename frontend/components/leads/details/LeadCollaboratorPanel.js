"use client";

import { colorFor } from "../../dashboard/home/widgetCatalog";

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

const initials = (name = "") => String(name).split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
const prettyRole = (role = "") => String(role).split("-").filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join(" ");

function Person({ user, tag, children }) {
  return (
    <li className="flex min-w-0 items-center gap-2.5 px-3 py-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: colorFor(user.user_id || user.name) }}>{initials(user.name)}</span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <b className="truncate text-[13px] font-semibold text-slate-900">{user.name || user.user_id}</b>
          {tag}
        </span>
        <span className="block truncate text-[11.5px] text-slate-500">{[prettyRole(user.role), user.email].filter(Boolean).join(" · ") || "No details"}</span>
      </span>
      {children}
    </li>
  );
}

/** Who can see this lead: the owner, the people it is shared with, and a picker to share it with more. */
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
    <section className="min-w-0 overflow-hidden rounded-[14px] bg-white ring-1 ring-slate-200">
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <h4 className="text-[14px] font-bold text-slate-900">People with access</h4>
          <p className="text-[12px] text-slate-500">The owner and anyone this lead is shared with</p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{sharedUsers.length + (primaryAssignee ? 1 : 0)}</span>
      </header>

      <ul className="divide-y divide-slate-100">
        {primaryAssignee ? (
          <Person user={primaryAssignee} tag={<span className="shrink-0 rounded-full bg-brand-50 px-1.5 py-px text-[10px] font-bold text-brand-700">Owner</span>} />
        ) : (
          <li className="px-3 py-2.5 text-[12.5px] text-slate-500">No owner yet.</li>
        )}
        {sharedUsers.map((user) => (
          <Person key={user.user_id} user={user}>
            {canManage ? (
              <button type="button" onClick={() => removeCollaborator(user.user_id)} disabled={savingCollaborators || removingCollaboratorId === user.user_id}
                aria-label={`Remove ${user.name || "user"}`} title="Remove access"
                className="shrink-0 rounded-[7px] px-2 py-1 text-[11.5px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50">
                {removingCollaboratorId === user.user_id ? "Removing…" : "Remove"}
              </button>
            ) : null}
          </Person>
        ))}
      </ul>
      {!sharedUsers.length ? <p className="border-t border-slate-100 px-4 py-2 text-[12px] text-slate-400">Not shared with anyone yet.</p> : null}

      {canManage ? (
        <div className="border-t border-slate-100 bg-slate-50/70 px-3 py-3">
          {availableUsers.length ? (
            <div className="flex min-w-0 gap-2">
              <select value={pendingCollaborator} onChange={(event) => setPendingCollaborator(event.target.value)} aria-label="Share with"
                className="h-9 min-w-0 flex-1 rounded-[9px] border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50">
                <option value="">Share with…</option>
                {availableUsers.map((user) => (
                  <option key={user.user_id} value={user.user_id}>{user.name}{user.role ? ` · ${prettyRole(user.role)}` : ""}</option>
                ))}
              </select>
              <button type="button" onClick={addCollaborator} disabled={savingCollaborators || !pendingCollaborator}
                className="h-9 shrink-0 rounded-[9px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50">
                {savingCollaborators ? "Adding…" : "Add"}
              </button>
            </div>
          ) : (
            <p className="text-[12px] text-slate-500">{teamUsers.length ? "Everyone in the team already has access." : collaboratorUsersMessage}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
