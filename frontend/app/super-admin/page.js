"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../../components/dashboard/DashboardShell";
import SuperAdminDashboardContent from "../../components/superadmin/SuperAdminDashboardContent";
import { PLATFORM_CONSOLE_ROLES, ROLE_HOME_ROUTE } from "../../lib/roles";
import { loadSession } from "../../lib/session";

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);

  useEffect(() => {
    const active = loadSession();
    if (!active) return router.replace("/login");
    if (!PLATFORM_CONSOLE_ROLES.includes(active.user?.role)) return router.replace(ROLE_HOME_ROUTE[active.user?.role] || "/dashboard");
    setSession(active);
  }, [router]);

  if (!session) return null;
  return (
    <DashboardShell session={session} title="Super Admin Console" hideTitle heroStats={[]}>
      <SuperAdminDashboardContent session={session} />
    </DashboardShell>
  );
}
