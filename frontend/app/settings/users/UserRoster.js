"use client";

import { T, Avatar, RolePill, credentialState, when } from "./users-tokens";

const BASE_ROLES = [["manager","Manager"],["sales","Sales"],["marketing","Marketing"],["support","Support"],["legal-team","Legal Team"],["finance-team","Finance Team"],["viewer","Viewer"]];

export function UserRoster({ users, filteredUsers, selectedUserId, search, roleFilter, statusFilter, roles, loading, onSelect, onSearch, onRoleFilter, onStatusFilter }) {
  return (
    <div className={`${T.panel} flex flex-col gap-4 px-5 py-5`}>
      {/* Header + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={T.kicker}>Roster</p>
          <h2 className="mt-0.5 text-base font-bold text-slate-900">Team Members · {filteredUsers.length} of {users.length}</h2>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative sm:col-span-1">
          <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 3a6 6 0 100 12A6 6 0 009 3zM1 9a8 8 0 1114.32 4.906l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387A8 8 0 011 9z" clipRule="evenodd" /></svg>
          <input className={`${T.input} pl-10`} value={search} onChange={e => onSearch(e.target.value)} placeholder="Search name, email, role…" />
        </div>
        <select className={T.input} value={roleFilter} onChange={e => onRoleFilter(e.target.value)}>
          <option value="all">All roles</option>
          {roles.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className={T.input} value={statusFilter} onChange={e => onStatusFilter(e.target.value)}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-400">Loading roster…</div>
        ) : filteredUsers.length ? (
          filteredUsers.map(user => {
            const cred = credentialState(user);
            const active = selectedUserId === user.user_id;
            return (
              <button
                key={user.user_id}
                type="button"
                onClick={() => onSelect(user.user_id)}
                className={`w-full rounded-2xl border px-4 py-3.5 text-left transition ${
                  active
                    ? "border-amber-300 bg-amber-50 shadow-sm"
                    : "border-slate-100 bg-white hover:border-amber-200 hover:bg-amber-50/30"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar name={user.name} role={user.role} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-bold text-slate-900">{user.name}</p>
                      <RolePill role={user.role} />
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cred.tone}`}>{cred.label}</span>
                      {!user.is_active ? <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">Inactive</span> : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-400">{user.email}{user.department ? ` · ${user.department}` : ""}</p>
                  </div>
                  <div className="hidden shrink-0 text-right text-xs text-slate-400 sm:block">
                    <p>Last login</p>
                    <p className="font-semibold text-slate-600">{when(user.last_login_at, false) || "Never"}</p>
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="flex min-h-[160px] items-center justify-center text-center text-sm text-slate-400">
            No members matched the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
