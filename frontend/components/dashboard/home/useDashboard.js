"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../../lib/api";
import { defaultLayout, periodQuery, rangeFor, widgetsFor } from "./widgetCatalog";

// v2: new default layout, compact team card and charts people build themselves.
const prefsKey = (userId) => `greencrm:dashboard:v2:${userId || "me"}`;
function readPrefs(userId) {
  try { return JSON.parse(window.localStorage.getItem(prefsKey(userId)) || "{}") || {}; } catch (_error) { return {}; }
}
const isCustom = (item) => String(item.key).startsWith("custom-") && item.custom;

/** Each person's widget layout (kept on this device), the filters, and the data for the widgets on screen. */
export function useDashboard(session) {
  const role = session?.user?.role || "";
  const userId = session?.user?.user_id;
  const available = useMemo(() => widgetsFor(role), [role]);
  const [layout, setLayoutState] = useState([]);
  // The dashboard always opens on "All time", so the totals on top are the real totals.
  const [preset, setPreset] = useState("all");
  const [custom, setCustom] = useState(null);
  const [filters, setFilters] = useState({ team_ids: "", assigned_to: "", product_id: "" });
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [seed, setSeed] = useState(0);

  useEffect(() => {
    if (!role) return;
    const saved = readPrefs(userId);
    const allowed = new Set(available.map((w) => w.key));
    const cleaned = Array.isArray(saved.layout) ? saved.layout.filter((item) => allowed.has(item.key) || isCustom(item)) : [];
    setLayoutState(saved.layout ? cleaned : defaultLayout(role).filter((item) => allowed.has(item.key)));
  }, [role, userId, available]);

  const setLayout = useCallback((next) => {
    setLayoutState(next);
    try { window.localStorage.setItem(prefsKey(userId), JSON.stringify({ ...readPrefs(userId), layout: next })); } catch (_error) { /* storage unavailable */ }
  }, [userId]);

  const range = useMemo(() => rangeFor(preset, custom), [preset, custom]);
  const query = useMemo(() => Object.fromEntries(Object.entries({ ...periodQuery(range), ...filters }).filter(([, v]) => v)), [range, filters]);
  const serverWidgets = useMemo(() => layout.map((item) => item.key).filter((key) => key !== "recent" && !key.startsWith("custom-")).join(","), [layout]);

  useEffect(() => {
    if (!session?.token || !serverWidgets) return undefined;
    let cancelled = false;
    setLoading(true);
    apiRequest(`/dashboard/insights?${new URLSearchParams({ ...query, widgets: serverWidgets })}`, { token: session.token, fresh: true })
      .then((res) => { if (!cancelled) setData(res?.widgets || {}); })
      .catch((err) => { if (!cancelled) setData(Object.fromEntries(serverWidgets.split(",").map((key) => [key, { error: err.message || "The dashboard could not load." }]))); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session?.token, query, serverWidgets, seed]);

  return {
    role, available, layout, data, loading, range, query, filters, preset, custom, seed,
    setLayout,
    resetLayout: () => setLayout(defaultLayout(role).filter((item) => available.some((w) => w.key === item.key))),
    removeWidget: (key) => setLayout(layout.filter((item) => item.key !== key)),
    resizeWidget: (key) => setLayout(layout.map((item) => (item.key === key ? { ...item, size: item.size === "full" ? "half" : "full" } : item))),
    addChart: (chart) => setLayout([...layout, { key: `custom-${Date.now().toString(36)}`, size: chart.chart === "columns" && chart.dimension === "month" ? "full" : "half", custom: chart }]),
    updateChart: (key, chart) => setLayout(layout.map((item) => (item.key === key ? { ...item, custom: chart } : item))),
    setPreset,
    setCustom: (next) => { setCustom(next); setPreset("custom"); },
    setFilter: (key, value) => setFilters((current) => ({ ...current, [key]: value, ...(key === "team_ids" ? { assigned_to: "" } : {}) })),
    clearFilters: () => setFilters({ team_ids: "", assigned_to: "", product_id: "" }),
    refresh: () => setSeed((s) => s + 1),
  };
}
