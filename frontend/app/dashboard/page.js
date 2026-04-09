"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { ROLE_HOME_ROUTE } from "../../lib/roles";
import { loadSession } from "../../lib/session";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const session = loadSession();
    const role = session?.user?.role;
    const nextRoute = role ? ROLE_HOME_ROUTE[role] || "/login" : "/login";

    router.replace(nextRoute);
  }, [router]);

  return (
    <div className="dashboard-shell">
      <div className="alert">Opening your workspace...</div>
    </div>
  );
}
