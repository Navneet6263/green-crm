"use client";

import { useEffect, useRef, useState } from "react";
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
  requestDeps = [],
  heroStats = () => [],
  hideTitle = false,
  progressive = false,
  children,
}) {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resourceLoading, setResourceLoading] = useState({});
  const [resourceErrors, setResourceErrors] = useState({});
  const requestRef = useRef({ version: 0, controller: null });

  async function loadData(activeSession) {
    requestRef.current.controller?.abort();
    const controller = new AbortController();
    const version = ++requestRef.current.version;
    requestRef.current.controller = controller;
    const requests = requestBuilder(activeSession) || [];

    if (!requests.length) {
      setData({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setData({});
    setResourceErrors({});
    setResourceLoading(Object.fromEntries(requests.map(request => [request.key, true])));

    try {
      const results = await Promise.allSettled(
        requests.map(async (request) => {
          try {
            const result = await apiRequest(request.path, {
              token: activeSession.token,
              method: request.method,
              body: request.body,
              signal: controller.signal,
            });
            if (version === requestRef.current.version) {
              setData(current => ({ ...current, [request.key]: result }));
              if (progressive) setLoading(false);
            }
            return result;
          } catch (failure) {
            if (version === requestRef.current.version && !controller.signal.aborted) {
              setResourceErrors(current => ({ ...current, [request.key]: failure.message }));
            }
            throw failure;
          } finally {
            if (version === requestRef.current.version) setResourceLoading(current => ({ ...current, [request.key]: false }));
          }
        })
      );
      if (version !== requestRef.current.version) return;
      const failures = results.flatMap((result, index) => result.status === "rejected" ? [`${requests[index].key}: ${result.reason.message}`] : []);
      setError(failures.join(" · "));
    } catch (requestError) {
      if (version === requestRef.current.version) setError(requestError.message);
    } finally {
      if (version === requestRef.current.version) setLoading(false);
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
    return () => { requestRef.current.version += 1; requestRef.current.controller?.abort(); };
  }, [router, ...requestDeps]);

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
        resourceLoading,
        resourceErrors,
        refresh: () => session ? loadData(session) : undefined,
      })}
    </DashboardShell>
  );
}
