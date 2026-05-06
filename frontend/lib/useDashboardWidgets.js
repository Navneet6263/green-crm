"use client";

/**
 * useDashboardWidgets
 *
 * Loads each dashboard widget independently and in parallel.
 * This means the page renders progressively — KPIs show up first,
 * then charts, then recent leads — instead of waiting for everything.
 *
 * Usage:
 *   const { kpis, leads, tasks, charts, refresh } = useDashboardWidgets(token);
 *
 * Each widget has its own { data, loading, error } state.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "./api";

function makeWidget() {
  return { data: null, loading: true, error: "" };
}

function buildWidgetUrl(name, query = "") {
  return `/dashboard/widgets/${name}${query ? `?${query}` : ""}`;
}

export function useDashboardWidgets(token, queryString = "") {
  const [kpis, setKpis] = useState(makeWidget());
  const [leads, setLeads] = useState(makeWidget());
  const [tasks, setTasks] = useState(makeWidget());
  const [charts, setCharts] = useState(makeWidget());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadWidgets = useCallback(
    async (activeToken) => {
      if (!activeToken) return;

      // Reset all to loading
      setKpis(makeWidget());
      setLeads(makeWidget());
      setTasks(makeWidget());
      setCharts(makeWidget());

      const opts = { token: activeToken };

      // Fire all 4 widget requests in parallel — each updates independently
      const fetchWidget = async (name, setter) => {
        try {
          const data = await apiRequest(buildWidgetUrl(name, queryString), opts);
          if (mountedRef.current) {
            setter({ data, loading: false, error: "" });
          }
        } catch (err) {
          if (mountedRef.current) {
            setter({ data: null, loading: false, error: err.message || "Failed to load." });
          }
        }
      };

      // All 4 fire simultaneously — no waiting for each other
      await Promise.allSettled([
        fetchWidget("kpis", setKpis),
        fetchWidget("leads", setLeads),
        fetchWidget("tasks", setTasks),
        fetchWidget("charts", setCharts),
      ]);
    },
    [queryString]
  );

  useEffect(() => {
    loadWidgets(token);
  }, [token, loadWidgets]);

  const refresh = useCallback(() => loadWidgets(token), [token, loadWidgets]);

  return { kpis, leads, tasks, charts, refresh };
}
