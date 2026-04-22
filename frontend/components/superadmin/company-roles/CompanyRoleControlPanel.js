"use client";

import { EmptyState, Notice, Panel } from "../ui";
import CompanyRoleRow from "./CompanyRoleRow";
import { useCompanyRoleControl } from "./useCompanyRoleControl";

export default function CompanyRoleControlPanel({ companyId, companyName, token, canManage }) {
  const control = useCompanyRoleControl({ companyId, token, enabled: canManage && companyId !== "platform-root" });

  if (!canManage || companyId === "platform-root") {
    return null;
  }

  return (
    <Panel
      eyebrow="Role Control"
      title="Tenant role elevation"
      description={`Super Admin can promote or demote ${companyName || "this company"} users without opening the tenant workspace.`}
    >
      {control.error ? <Notice tone="error" text={control.error} className="mb-4" /> : null}
      {control.message ? <Notice tone="success" text={control.message} className="mb-4" /> : null}

      {control.loading ? (
        <Notice tone="info" text="Loading tenant users..." />
      ) : control.users.length ? (
        <div className="space-y-3">
          {control.users.map((user) => <CompanyRoleRow key={user.user_id} user={user} savingUserId={control.savingUserId} onSave={control.updateRole} />)}
        </div>
      ) : (
        <EmptyState icon="users" title="No tenant users loaded" description="Create or activate workspace users first, then role promotion and demotion will appear here." />
      )}
    </Panel>
  );
}
