"use client";

import DashboardIcon from "../../../components/dashboard/icons";
import { T, Avatar, RolePill, credentialState, when } from "./users-tokens";

export function UserDetail({ selectedUser, memberForm, saving, workingId, roles, company, onFormChange, onSave, onToggle, onRemove }) {
  if (!selectedUser) {
    return (
      <div className={`${T.panel} flex min-h-[280px] flex-col items-center justify-center gap-3 px-5 py-8 text-center`}>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-400">
          <DashboardIcon name="users" className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700">Select a member to edit</p>
        <p className="max-w-xs text-xs text-slate-400">Click any member card to update their role, department, phone, or reset their password.</p>
      </div>
    );
  }

  const cred = credentialState(selectedUser);

  return (
    <div className={`${T.panel} space-y-5 px-5 py-5`}>
      {/* Identity strip */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Avatar name={selectedUser.name} role={selectedUser.role} size="h-12 w-12" text="text-base" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{selectedUser.name}</h2>
              <RolePill role={selectedUser.role} />
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cred.tone}`}>{cred.label}</span>
            </div>
            <p className="mt-0.5 text-sm text-slate-400">{selectedUser.email}</p>
          </div>
        </div>
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${selectedUser.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-600"}`}>
          {selectedUser.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Quick info row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-50 pt-4">
        {[
          ["Company", selectedUser.company_name || company?.name || "Workspace"],
          ["Department", selectedUser.department || "Not set"],
          ["Last Login", when(selectedUser.last_login_at, true) || "Never"],
          ["Joined", when(selectedUser.created_at)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3">
            <p className={T.kicker}>{l}</p>
            <p className="mt-1 text-xs font-semibold text-slate-800 break-words">{v}</p>
          </div>
        ))}
      </div>

      {/* Edit form */}
      <form className="space-y-4 border-t border-slate-50 pt-4" onSubmit={onSave}>
        <p className={T.kicker}>Edit Member</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className={T.kicker}>Full Name</span>
            <input className={T.input} value={memberForm.name} onChange={e => onFormChange("name", e.target.value)} required />
          </label>
          <label className="block space-y-1.5">
            <span className={T.kicker}>Email</span>
            <input className={T.input} type="email" value={memberForm.email} onChange={e => onFormChange("email", e.target.value)} required />
          </label>
          <label className="block space-y-1.5">
            <span className={T.kicker}>Role</span>
            <select className={T.input} value={memberForm.role} onChange={e => onFormChange("role", e.target.value)}>
              {roles.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className={T.kicker}>Department</span>
            <input className={T.input} value={memberForm.department} onChange={e => onFormChange("department", e.target.value)} placeholder="Sales Desk" />
          </label>
          <label className="block space-y-1.5">
            <span className={T.kicker}>Phone</span>
            <input className={T.input} value={memberForm.phone} onChange={e => onFormChange("phone", e.target.value)} placeholder="+91 98765 43210" />
          </label>
          <label className="block space-y-1.5">
            <span className={T.kicker}>Reset Password</span>
            <input className={T.input} type="password" value={memberForm.password} onChange={e => onFormChange("password", e.target.value)} placeholder="Leave blank to keep current" />
          </label>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button className={T.gold} type="submit" disabled={saving}>
            <DashboardIcon name="settings" className="h-4 w-4" />
            {saving ? "Saving…" : "Save Member"}
          </button>
          <button className={T.ghost} type="button" disabled={workingId === selectedUser.user_id} onClick={onToggle}>
            {workingId === selectedUser.user_id ? "Updating…" : selectedUser.is_active ? "Deactivate" : "Activate"}
          </button>
          <button className={T.danger} type="button" disabled={workingId === selectedUser.user_id} onClick={onRemove}>
            <DashboardIcon name="audit" className="h-4 w-4" />
            {workingId === selectedUser.user_id ? "Removing…" : "Remove"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function SeatUsage({ usage }) {
  return (
    <div className={`${T.panel} px-5 py-5`}>
      <p className={T.kicker}>Seat Usage</p>
      <h3 className="mt-0.5 mb-4 text-base font-bold text-slate-900">Role capacity snapshot</h3>
      <div className="space-y-2">
        {usage.map(item => {
          const pct = item.limit ? Math.min(100, Math.round((item.used / item.limit) * 100)) : 0;
          const over = item.limit !== null && item.used >= item.limit;
          return (
            <div key={item.key} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                  <span className={`text-xs font-bold ${over ? "text-rose-600" : "text-slate-500"}`}>
                    {item.limit === null ? `${item.used} · unlimited` : `${item.used} / ${item.limit}`}
                  </span>
                </div>
                {item.limit !== null ? (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-full rounded-full transition-all ${over ? "bg-rose-400" : "bg-amber-400"}`} style={{ width: `${pct}%` }} />
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
