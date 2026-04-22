"use client";

import { useEffect, useState } from "react";

import { titleize } from "../format";
import { Badge, PRIMARY_BUTTON_CLASS, SUB_PANEL_CLASS } from "../ui";
import { TENANT_ROLE_OPTIONS } from "./useCompanyRoleControl";

function formatLastLogin(value) {
  return value ? new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "No login yet";
}

export default function CompanyRoleRow({ user, savingUserId, onSave }) {
  const [draftRole, setDraftRole] = useState(user.role);

  useEffect(() => {
    setDraftRole(user.role);
  }, [user.role]);

  const saving = savingUserId === user.user_id;

  return (
    <div className={SUB_PANEL_CLASS}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm text-slate-900">{user.name || user.email}</strong>
            <Badge tone={user.is_active ? "emerald" : "rose"}>{user.is_active ? "Active" : "Inactive"}</Badge>
            <Badge tone="blue">{titleize(user.role)}</Badge>
          </div>
          <p className="mt-2 text-sm text-slate-500">{user.email}</p>
          <p className="mt-1 text-xs text-slate-400">Last login: {formatLastLogin(user.last_login_at)}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select className="w-full rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100 sm:min-w-[190px]" value={draftRole} onChange={(event) => setDraftRole(event.target.value)} disabled={saving}>
            {TENANT_ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>{titleize(role)}</option>
            ))}
          </select>
          <button className={PRIMARY_BUTTON_CLASS} type="button" onClick={() => onSave(user.user_id, draftRole)} disabled={saving || draftRole === user.role}>
            {saving ? "Updating..." : "Apply Role"}
          </button>
        </div>
      </div>
    </div>
  );
}
