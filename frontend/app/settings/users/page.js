"use client";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import { AlertBanner } from "./AlertBanner";
import { CompanySelector } from "./CompanySelector";
import { CreateUserForm } from "./CreateUserForm";
import { PageHeader } from "./PageHeader";
import { UserDetail, SeatUsage } from "./UserDetail";
import { UserRoster } from "./UserRoster";
import { UserStats } from "./UserStats";
import { useUserManagement } from "./useUserManagement";

export default function UserSettingsPage() {
  const {
    session,
    users,
    company,
    companies,
    selectedCompanyId,
    setSelectedCompanyId,
    selectedUserId,
    setSelectedUserId,
    createForm,
    setCreateForm,
    memberForm,
    setMemberForm,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    error,
    message,
    messageTone,
    loading,
    creating,
    saving,
    workingId,
    isSuperAdmin,
    roles,
    selectedUser,
    filteredUsers,
    stats,
    usage,
    createUser,
    saveUser,
    toggleUser,
    removeUser,
  } = useUserManagement();

  return (
    <DashboardShell session={session} title="Workspace Users" hideTitle heroStats={[]}>
      <div className="mx-auto max-w-[1320px] space-y-5 px-1">
        <AlertBanner error={error} message={message} messageTone={messageTone} />

        <PageHeader />

        <UserStats stats={stats} />

        {isSuperAdmin && (
          <CompanySelector
            companies={companies}
            selectedCompanyId={selectedCompanyId}
            onChange={setSelectedCompanyId}
          />
        )}

        <CreateUserForm
          createForm={createForm}
          setCreateForm={setCreateForm}
          roles={roles}
          creating={creating}
          onSubmit={createUser}
          isSuperAdmin={isSuperAdmin}
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          onCompanyChange={setSelectedCompanyId}
        />

        <div className="grid gap-5 xl:grid-cols-[1fr_400px] xl:items-start">
          <UserRoster
            users={users}
            filteredUsers={filteredUsers}
            selectedUserId={selectedUserId}
            search={search}
            roleFilter={roleFilter}
            statusFilter={statusFilter}
            roles={roles}
            loading={loading}
            onSelect={setSelectedUserId}
            onSearch={setSearch}
            onRoleFilter={setRoleFilter}
            onStatusFilter={setStatusFilter}
          />

          <div className="space-y-4">
            <UserDetail
              selectedUser={selectedUser}
              memberForm={memberForm}
              saving={saving}
              workingId={workingId}
              roles={roles}
              company={company}
              onFormChange={(k, v) => setMemberForm((f) => ({ ...f, [k]: v }))}
              onSave={saveUser}
              onToggle={toggleUser}
              onRemove={removeUser}
            />
            <SeatUsage usage={usage} />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
