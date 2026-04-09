"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "../../lib/api";
import { ROLE_HOME_ROUTE } from "../../lib/roles";
import { loadSession } from "../../lib/session";
import DashboardShell from "./DashboardShell";

export default function WorkspacePage({
  title,
  eyebrow,
  allowedRoles = [],
  requestBuilder = () => [],
  heroStats = () => [],
  hideTitle = false,
  children,
}) {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData(activeSession) {
    const requests = requestBuilder(activeSession) || [];

    if (!requests.length) {
      setData({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const results = await Promise.all(
        requests.map((request) =>
          apiRequest(request.path, {
            token: activeSession.token,
            method: request.method,
            body: request.body,
          })
        )
      );

      const nextData = {};
      requests.forEach((request, index) => {
        nextData[request.key] = results[index];
      });
      setData(nextData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) {
      router.replace("/login");
      return;
    }

    if (allowedRoles.length && !allowedRoles.includes(activeSession.user?.role)) {
      router.replace(ROLE_HOME_ROUTE[activeSession.user?.role] || "/dashboard");
      return;
    }

    setSession(activeSession);
    loadData(activeSession);
  }, [router]);

  return (
    <DashboardShell
      session={session}
      title={title}
      hideTitle={hideTitle}
      eyebrow={eyebrow}
      heroStats={heroStats({ session, data, loading })}
    >
      {children({
        session,
        data,
        error,
        loading,
        refresh: () => session ? loadData(session) : undefined,
      })}
    </DashboardShell>
  );
}
