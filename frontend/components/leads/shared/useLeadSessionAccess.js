"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";
import { formatScopedError, isPlatformConsoleRole } from "../../../lib/teamScope";
import { OK_ROLES } from "./leadPageConstants";

export function useLeadSessionAccess() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [booting, setBooting] = useState(true);
  const [accessError, setAccessError] = useState("");

  useEffect(() => {
    let ignore = false;

    (async () => {
      const currentSession = loadSession();
      if (!currentSession) {
        router.replace("/login");
        return;
      }

      if (!OK_ROLES.includes(currentSession.user?.role)) {
        router.replace("/dashboard");
        return;
      }

      try {
        if (isPlatformConsoleRole(currentSession.user?.role)) {
          const response = await apiRequest("/companies?page_size=50", { token: currentSession.token });
          if (!ignore) {
            setCompanies(response.items || []);
          }
        }

        if (!ignore) {
          setSession(currentSession);
        }
      } catch (requestError) {
        if (!ignore) {
          setAccessError(formatScopedError(requestError, "Could not load the leads workspace."));
        }
      } finally {
        if (!ignore) {
          setBooting(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [router]);

  return {
    accessError,
    booting,
    companies,
    session,
  };
}
