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
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

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
        const queryParams = new URLSearchParams({ page_size: "12" });
        if (debouncedSearch.trim()) {
          queryParams.set("search", debouncedSearch.trim());
        }

        const [attendance, history] = await Promise.all([
          apiRequest("/attendance/status", { token: session.token }),
          apiRequest(`/attendance/history?${queryParams.toString()}`, { token: session.token }),
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
  }, [router, debouncedSearch]);

  async function punchAttendance(type) {
    setState((current) => ({ ...current, sending: true, error: "", message: "" }));

    let locationStr = "";
    try {
      if (navigator.geolocation) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
        });
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            locationStr = data.display_name || `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
          } else {
            locationStr = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
          }
        } catch (e) {
          locationStr = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
        }
      }
    } catch (e) {
      console.warn("Geolocation skipped/failed:", e);
    }

    try {
      const response = await apiRequest("/attendance/punch", {
        method: "POST",
        token: state.session.token,
        body: { type, location: locationStr },
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
    search,
    setSearch,
    punchAttendance,
  };
}
