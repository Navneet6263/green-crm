"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROLE_HOME_ROUTE } from "../../lib/roles";
import { loadSession } from "../../lib/session";

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    const session = loadSession();
    if (!session) { router.replace("/login"); return; }
    const role = session.user?.role || "";
    router.replace(ROLE_HOME_ROUTE[role] || "/dashboard/viewer");
  }, []);

  return <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", fontFamily: "sans-serif", color: "#5d7571" }}>Redirecting...</div>;
}
