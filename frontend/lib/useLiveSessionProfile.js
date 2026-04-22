"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "./api";
import { saveSession } from "./session";

const REFRESH_INTERVAL_MS = 30000;

export function useLiveSessionProfile(seedSession) {
  const [session, setSession] = useState(seedSession);

  useEffect(() => {
    setSession(seedSession);
  }, [seedSession]);

  useEffect(() => {
    if (!seedSession?.token) {
      return undefined;
    }

    let active = true;
    let intervalId;

    async function refreshProfile() {
      try {
        const profile = await apiRequest("/auth/profile", { token: seedSession.token });
        if (!active) {
          return;
        }

        const nextSession = {
          ...seedSession,
          user: profile.user || seedSession.user,
          company: profile.company || seedSession.company,
        };

        setSession(nextSession);
        saveSession(nextSession);
      } catch (_error) {
        // Keep existing session if the refresh fails.
      }
    }

    function handleVisibilityRefresh() {
      if (document.visibilityState === "visible") {
        void refreshProfile();
      }
    }

    void refreshProfile();
    intervalId = window.setInterval(() => {
      void refreshProfile();
    }, REFRESH_INTERVAL_MS);
    window.addEventListener("focus", handleVisibilityRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleVisibilityRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [seedSession?.token]);

  return session;
}
