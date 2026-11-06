"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

const asList = (r) => (Array.isArray(r) ? r : r?.items || r?.data || []);

/** Everything the Developer page shows, plus the actions that change it. */
export function useDeveloper(session) {
  const token = session?.token;
  const [overview, setOverview] = useState(null);
  const [keys, setKeys] = useState([]);
  const [links, setLinks] = useState([]);
  const [hooks, setHooks] = useState([]);
  const [products, setProducts] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setError("");
    try {
      const [o, k, l, w] = await Promise.all([
        apiRequest("/developer/overview", { token, fresh: true }),
        apiRequest("/developer/keys", { token, fresh: true }),
        apiRequest("/developer/links", { token, fresh: true }),
        apiRequest("/developer/webhooks", { token, fresh: true }),
      ]);
      setOverview(o);
      setKeys(asList(k));
      setLinks(asList(l));
      setHooks(asList(w));
      setLocked(false);
    } catch (err) {
      if (/not switched on|only the company admin/i.test(err.message)) setLocked(true);
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!token || locked) return;
    apiRequest("/products?page_size=100", { token }).then((r) => setProducts(asList(r).filter((p) => p.is_active !== false && p.is_active !== 0))).catch(() => setProducts([]));
    apiRequest("/users?page_size=100", { token }).then((r) => setPeople(asList(r).filter((u) => u.is_active !== false && u.is_active !== 0))).catch(() => setPeople([]));
  }, [token, locked]);

  const call = useCallback(async (path, method, body) => {
    const result = await apiRequest(path, { token, method, body });
    await load();
    return result;
  }, [token, load]);

  const loadLogs = useCallback(
    (query) => apiRequest(`/developer/logs?${new URLSearchParams(query)}`, { token, fresh: true }).then(asList),
    [token]
  );

  const loadDeliveries = useCallback(
    (query) => apiRequest(`/developer/deliveries?${new URLSearchParams(query)}`, { token, fresh: true }).then(asList),
    [token]
  );

  return {
    overview, keys, links, hooks, loadDeliveries,
    rollKey: (id) => call(`/developer/keys/${id}/roll`, "POST"),
    saveHook: (id, body) => (id ? call(`/developer/webhooks/${id}`, "PATCH", body) : call("/developer/webhooks", "POST", body)),
    rotateHookSecret: (id) => call(`/developer/webhooks/${id}/secret`, "POST"),
    pingHook: (id) => call(`/developer/webhooks/${id}/ping`, "POST"),
    deleteHook: (id) => call(`/developer/webhooks/${id}`, "DELETE"),
    resendDelivery: (id) => apiRequest(`/developer/deliveries/${id}/resend`, { token, method: "POST" }),
    products, people, loading, locked, error, reload: load,
    createKey: (body) => call("/developer/keys", "POST", body),
    revokeKey: (id) => call(`/developer/keys/${id}`, "DELETE"),
    saveLink: (id, body) => (id ? call(`/developer/links/${id}`, "PATCH", body) : call("/developer/links", "POST", body)),
    rotateLink: (id) => call(`/developer/links/${id}/new-link`, "POST"),
    deleteLink: (id) => call(`/developer/links/${id}`, "DELETE"),
    loadLogs,
  };
}
