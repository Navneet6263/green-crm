"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AdminPage from "../../../components/layout/AdminPage";
import SideDrawer from "../../../components/ui/SideDrawer";
import { AlertBanner } from "./AlertBanner";
import { CreateUserForm } from "./CreateUserForm";
import { SeatUsage, UserDetail } from "./UserDetail";
import { UserRoster } from "./UserRoster";
import { UserStats } from "./UserStats";
import { T } from "./users-tokens";
import { useUserManagement } from "./useUserManagement";

/** Users: everyone who can log in, their roles and access. Invite and edit in side panels. */
export default function UsersPage() {
  const u = useUserManagement();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const wasCreating = useRef(false);

  // Close the invite panel once a user has been created without an error.
  useEffect(() => {
    if (wasCreating.current && !u.creating && !u.error) setInviteOpen(false);
    wasCreating.current = u.creating;
  }, [u.creating, u.error]);

  const open = (id) => { u.setSelectedUserId(id); setDetailOpen(true); };
  const canTeams = ["super-admin", "admin", "manager"].includes(u.session?.user?.role);

  return (
    <AdminPage session={u.session} title="Users" description="Everyone who can log in to the CRM, their role and their access"
      actions={(
        <>
          {u.isSuperAdmin ? (
            <select aria-label="Company" value={u.selectedCompanyId} onChange={(e) => u.setSelectedCompanyId(e.target.value)} className="h-9 rounded-[10px] border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700">
              <option value="">Choose company</option>
              {u.companies.map((c) => <option key={c.company_id} value={c.company_id}>{c.name}</option>)}
            </select>
          ) : null}
          {canTeams ? <Link href="/settings/teams" prefetch className={T.ghost}>Teams</Link> : null}
          <button type="button" onClick={() => setInviteOpen(true)} className={T.gold}>+ Add user</button>
        </>
      )}>
      <AlertBanner error={u.error} message={u.message} messageTone={u.messageTone} />
      <UserStats stats={u.stats} />
      <SeatUsage usage={u.usage} />
      <UserRoster users={u.users} filteredUsers={u.filteredUsers} selectedUserId={detailOpen ? u.selectedUserId : ""} search={u.search} roleFilter={u.roleFilter}
        statusFilter={u.statusFilter} roles={u.roles} loading={u.loading} onSelect={open} onSearch={u.setSearch} onRoleFilter={u.setRoleFilter} onStatusFilter={u.setStatusFilter} />

      <SideDrawer open={inviteOpen} onClose={() => setInviteOpen(false)} title="Add a user" subtitle="They get an email with a link and a temporary password" width="max-w-[640px]">
        <CreateUserForm createForm={u.createForm} setCreateForm={u.setCreateForm} roles={u.roles} creating={u.creating} onSubmit={u.createUser}
          isSuperAdmin={u.isSuperAdmin} isManager={u.isManager} managedTeams={u.managedTeams} teamsLoading={u.teamsLoading} teamsError={u.teamsError}
          companies={u.companies} selectedCompanyId={u.selectedCompanyId} onCompanyChange={u.setSelectedCompanyId} />
      </SideDrawer>

      <SideDrawer open={detailOpen && Boolean(u.selectedUser)} onClose={() => setDetailOpen(false)} title={u.selectedUser?.name || "User"} subtitle="Edit their details, role and access">
        <UserDetail selectedUser={u.selectedUser} memberForm={u.memberForm} saving={u.saving} workingId={u.workingId} roles={u.roles} company={u.company}
          onFormChange={(k, v) => u.setMemberForm((f) => ({ ...f, [k]: v }))} onSave={u.saveUser} onToggle={u.toggleUser} onRemove={u.removeUser} />
      </SideDrawer>
    </AdminPage>
  );
}
