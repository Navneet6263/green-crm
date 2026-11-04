"use client";

import { Avatar, RolePill, T, credentialState, emailState, when } from "./users-tokens";

/** Body of the side panel for one person: who they are, edit details and role, reset password, deactivate or remove. */
export function UserDetail({ selectedUser, memberForm, saving, workingId, roles, company, onFormChange, onSave, onToggle, onRemove }) {
  if (!selectedUser) return null;
  const cred = credentialState(selectedUser);
  const mail = emailState(selectedUser);
  const busy = workingId === selectedUser.user_id;
  const label = "block space-y-1 text-[12px] font-semibold text-slate-600";

  return (
    <div className="space-y-4">
      <section className="flex items-start gap-3 rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
        <Avatar name={selectedUser.name} role={selectedUser.role} size="h-12 w-12" text="text-base" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-bold text-slate-900">{selectedUser.name}</p>
          <p className="truncate text-[12.5px] text-slate-500">{selectedUser.email}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <RolePill role={selectedUser.role} />
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cred.tone}`}>{cred.label}</span>
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${selectedUser.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-600"}`}>{selectedUser.is_active ? "Active" : "Inactive"}</span>
          </div>
        </div>
      </section>

      <dl className="grid grid-cols-2 gap-2">
        {[["Company", selectedUser.company_name || company?.name || "Workspace"], ["Department", selectedUser.department || "Not set"], ["Last login", when(selectedUser.last_login_at, true) || "Never"], ["Joined", when(selectedUser.created_at) || "–"],
          ["Email", mail.ok ? `Verified ${when(selectedUser.email_verified_at) || ""}` : mail.label], ["Reminder emails", mail.ok ? "Yes" : "No, until they verify"]].map(([l, v]) => (
          <div key={l} className="rounded-[10px] bg-white px-3 py-2 ring-1 ring-slate-200">
            <dt className="text-[11px] font-semibold text-slate-400">{l}</dt>
            <dd className="mt-0.5 break-words text-[12.5px] font-semibold text-slate-800">{v}</dd>
          </div>
        ))}
      </dl>

      <form className="space-y-3 rounded-[14px] bg-white p-4 ring-1 ring-slate-200" onSubmit={onSave}>
        <p className="text-[14px] font-bold text-slate-900">Details and role</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>Full name<input className={T.input} value={memberForm.name} onChange={(e) => onFormChange("name", e.target.value)} required /></label>
          <label className={label}>Email<input className={T.input} type="email" value={memberForm.email} onChange={(e) => onFormChange("email", e.target.value)} required /></label>
          <label className={label}>Role<select className={T.input} value={memberForm.role} onChange={(e) => onFormChange("role", e.target.value)}>{roles.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className={label}>Department<input className={T.input} value={memberForm.department} onChange={(e) => onFormChange("department", e.target.value)} placeholder="e.g. Sales" /></label>
          <label className={label}>Phone<input className={T.input} value={memberForm.phone} onChange={(e) => onFormChange("phone", e.target.value)} placeholder="+91 98765 43210" /></label>
          <label className={label}>New password<input className={T.input} type="password" autoComplete="new-password" value={memberForm.password} onChange={(e) => onFormChange("password", e.target.value)} placeholder="Leave blank to keep" /></label>
        </div>
        <div className="flex justify-end"><button className={T.gold} type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button></div>
      </form>

      <section className="space-y-2 rounded-[14px] bg-white p-4 ring-1 ring-rose-100">
        <p className="text-[14px] font-bold text-slate-900">Access</p>
        <p className="text-[12.5px] text-slate-500">{selectedUser.is_active ? "Deactivating stops them logging in. Their leads and history stay." : "They cannot log in right now."}</p>
        <div className="flex flex-wrap gap-2">
          <button className={T.ghost} type="button" disabled={busy} onClick={onToggle}>{busy ? "Updating…" : selectedUser.is_active ? "Deactivate" : "Activate again"}</button>
          <button className={T.danger} type="button" disabled={busy} onClick={onRemove}>{busy ? "Removing…" : "Remove user"}</button>
        </div>
      </section>
    </div>
  );
}

/** How many people each role has, against the plan's limit. */
export function SeatUsage({ usage }) {
  if (!usage?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {usage.map((item) => {
        const over = item.limit !== null && item.used >= item.limit;
        const pct = item.limit ? Math.min(100, Math.round((item.used / item.limit) * 100)) : 0;
        return (
          <div key={item.key} className="min-w-[130px] flex-1 rounded-[10px] bg-white px-3 py-2 ring-1 ring-slate-200">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[12px] font-semibold text-slate-600">{item.label}</span>
              <span className={`text-[12px] font-bold tabular-nums ${over ? "text-rose-600" : "text-slate-800"}`}>{item.limit === null ? `${item.used}` : `${item.used}/${item.limit}`}</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">{item.limit !== null ? <div className={`h-full rounded-full ${over ? "bg-rose-500" : "bg-brand-600"}`} style={{ width: `${pct}%` }} /> : <div className="h-full w-full bg-slate-200" />}</div>
          </div>
        );
      })}
    </div>
  );
}
