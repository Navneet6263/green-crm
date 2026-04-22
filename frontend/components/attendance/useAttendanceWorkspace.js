"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "../../lib/api";
import { loadSession } from "../../lib/session";

function initialState() {
  return {
    session: null,
    attendance: null,
    history: [],
    loading: true,
    sending: false,
    error: "",
    message: "",
  };
}

export function useAttendanceWorkspace() {
  const router = useRouter();
  const [state, setState] = useState(initialState);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      router.replace("/login");
      return;
    }

    let active = true;

    async function loadWorkspace() {
      setState((current) => ({ ...current, session, loading: true, error: "", message: "" }));

      try {
        const [attendance, history] = await Promise.all([
          apiRequest("/attendance/status", { token: session.token }),
          apiRequest("/attendance/history?page_size=12", { token: session.token }),
        ]);

        if (!active) {
          return;
        }

        setState((current) => ({
          ...current,
          session,
          attendance,
          history: history.items || [],
          loading: false,
        }));
      } catch (error) {
        if (!active) {
          return;
        }

        setState((current) => ({ ...current, session, loading: false, error: error.message }));
      }
    }

    loadWorkspace();

    return () => {
      active = false;
    };
  }, [router]);

  async function punchAttendance(type) {
    setState((current) => ({ ...current, sending: true, error: "", message: "" }));

    try {
      const response = await apiRequest("/attendance/punch", {
        method: "POST",
        token: state.session.token,
        body: { type },
      });

      setState((current) => ({
        ...current,
        sending: false,
        attendance: response.status,
        history: response.event ? [response.event, ...current.history].slice(0, 12) : current.history,
        message: `Attendance ${type === "punch_in" ? "punch in" : "punch out"} recorded.`,
      }));
    } catch (error) {
      setState((current) => ({ ...current, sending: false, error: error.message }));
    }
  }

  return {
    ...state,
    punchAttendance,
  };
}
