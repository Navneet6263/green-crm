"use client";

import { Avatar, RolePill, credentialState, emailState, when } from "./users-tokens";

const FIELD = "h-9 rounded-[10px] border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 outline-none focus:border-brand-400";

/** Everyone in the company as a table; click a row to open them. */
export function UserRoster({ users, filteredUsers, selectedUserId, search, roleFilter, statusFilter, roles, loading, onSelect, onSearch, onRoleFilter, onStatusFilter }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[14px] bg-white ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
        <label className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-[10px] border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-brand-300 focus-within:bg-white">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search name, email or role" aria-label="Search users" className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-800 outline-none" />
        </label>
        <select aria-label="Role" className={FIELD} value={roleFilter} onChange={(e) => onRoleFilter(e.target.value)}>
          <option value="all">All roles</option>
          {roles.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select aria-label="Status" className={FIELD} value={statusFilter} onChange={(e) => onStatusFilter(e.target.value)}>
          <option value="all">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="ml-auto text-[12px] text-slate-400">{filteredUsers.length} of {users.length}</span>
      </div>
      {loading ? (
        <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-[10px] bg-slate-100" />)}</div>
      ) : filteredUsers.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5">Person</th><th className="px-3 py-2.5">Role</th><th className="px-3 py-2.5">Department</th><th className="px-3 py-2.5">Access</th><th className="px-4 py-2.5 text-right">Last login</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const cred = credentialState(user);
                const mail = emailState(user);
                const on = selectedUserId === user.user_id;
                return (
                  <tr key={user.user_id} onClick={() => onSelect(user.user_id)} className={`cursor-pointer border-b border-slate-100 last:border-0 ${on ? "bg-brand-50/50" : "hover:bg-slate-50/70"}`}>
                    <td className="px-4 py-2.5">
                      <button type="button" onClick={() => onSelect(user.user_id)} className="flex items-center gap-3 text-left">
                        <Avatar name={user.name} role={user.role} size="h-9 w-9" text="text-[12px]" />
                        <span className="min-w-0">
                          <span className={`block truncate text-[13.5px] font-semibold ${user.is_active ? "text-slate-900" : "text-slate-400 line-through"}`}>{user.name}</span>
                          <span className="block truncate text-[11.5px] text-slate-500">{user.email}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-2.5"><RolePill role={user.role} /></td>
                    <td className="px-3 py-2.5 text-[12.5px] text-slate-600">{user.department || "–"}</td>
                    <td className="px-3 py-2.5">
                      <span className="flex flex-wrap gap-1">
                        {user.is_active ? <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cred.tone}`}>{cred.label}</span>
                          : <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">Inactive</span>}
                        {user.is_active ? <span title={mail.hint} className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${mail.tone}`}>{mail.label}</span> : null}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-[12.5px] text-slate-500">{when(user.last_login_at, false) || "Never"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <p className="px-6 py-14 text-center text-[13px] text-slate-400">No one matches these filters.</p>}
    </section>
  );
}
