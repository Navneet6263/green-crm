"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { LEADS_PAGE_SIZE } from "./leadPageConstants";
import { buildQueryPath } from "./leadPageFormatters";
import {
  applyOwnerToLeadCollections,
  normalizeLeadMeta,
  removeLeadFromCollection,
  updateLeadCollections,
} from "./leadPageHelpers";
import {
  applyOwnerAcrossCaches,
  cacheLeadPage,
  getCachedLeadPage,
  mergeLeadAcrossCaches,
  prefetchLeadPage,
  removeLeadAcrossCaches,
  startBackgroundLeadSync,
} from "./leadListCacheUtils";

export function useLeadListData({ leadQueryBase, refreshSeed, session }) {
  const [backgroundSync, setBackgroundSync] = useState(false);
  const [leadMeta, setLeadMeta] = useState({ page: 1, page_size: LEADS_PAGE_SIZE, total: 0, total_pages: 1 });
  const [leads, setLeads] = useState([]);
  const [listError, setListError] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageRefreshing, setPageRefreshing] = useState(false);
  const leadPageCacheRef = useRef(new Map());
  const leadFullCacheRef = useRef(new Map());
  const leadPrefetchRef = useRef({ key: "", running: false, token: 0 });
  const leadCacheKey = useMemo(() => JSON.stringify(leadQueryBase), [leadQueryBase]);

  function applyLeadPage(items, meta) {
    setLeadMeta(meta);
    setLeads(items);
  }

  useEffect(() => {
    if (!session?.token) {
      return undefined;
    }

    let ignore = false;

    (async () => {
      const cachedLeadPage = getCachedLeadPage({ cacheKey: leadCacheKey, fullCacheRef: leadFullCacheRef, pageCacheRef: leadPageCacheRef, pageNumber: page });
      if (cachedLeadPage) {
        applyLeadPage(cachedLeadPage.items || [], cachedLeadPage.meta);
        setLoading(false);
        setPageRefreshing(false);
        prefetchLeadPage({ cacheKey: leadCacheKey, fullCacheRef: leadFullCacheRef, leadQueryBase, pageCacheRef: leadPageCacheRef, pageNumber: page + 1, token: session.token, totalPages: cachedLeadPage.meta.total_pages });
        startBackgroundLeadSync({ cacheKey: leadCacheKey, fullCacheRef: leadFullCacheRef, leadPrefetchRef, leadQueryBase, setBackgroundSync, token: session.token, total: cachedLeadPage.meta.total });
        return;
      }

      setPageRefreshing(true);
      if (!leads.length) {
        setLoading(true);
      }

      try {
        setListError("");
        const response = await apiRequest(
          buildQueryPath("/leads", { page, page_size: LEADS_PAGE_SIZE, ...leadQueryBase }),
          { token: session.token }
        );

        if (ignore) {
          return;
        }

        const nextMeta = normalizeLeadMeta(response.meta, page);
        if (nextMeta.total_pages && page > nextMeta.total_pages) {
          setLeadMeta(nextMeta);
          setPage(nextMeta.total_pages);
          return;
        }

        cacheLeadPage(leadPageCacheRef, leadCacheKey, page, response.items || [], nextMeta);
        applyLeadPage(response.items || [], nextMeta);
        prefetchLeadPage({ cacheKey: leadCacheKey, fullCacheRef: leadFullCacheRef, leadQueryBase, pageCacheRef: leadPageCacheRef, pageNumber: page + 1, token: session.token, totalPages: nextMeta.total_pages });
        startBackgroundLeadSync({ cacheKey: leadCacheKey, fullCacheRef: leadFullCacheRef, leadPrefetchRef, leadQueryBase, setBackgroundSync, token: session.token, total: nextMeta.total });
      } catch (requestError) {
        if (!ignore && !leads.length) {
          setLeads([]);
          setLeadMeta({ page: 1, page_size: LEADS_PAGE_SIZE, total: 0, total_pages: 1 });
        }
        if (!ignore) {
          setListError(requestError.message || "Could not load leads.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
          setPageRefreshing(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [leadCacheKey, leadQueryBase, page, refreshSeed, session]);

  useEffect(() => {
    leadPrefetchRef.current = { key: "", running: false, token: leadPrefetchRef.current.token + 1 };
    setBackgroundSync(false);
  }, [leadCacheKey]);

  useEffect(() => {
    leadPageCacheRef.current.clear();
    leadFullCacheRef.current.clear();
    leadPrefetchRef.current = { key: "", running: false, token: leadPrefetchRef.current.token + 1 };
    setBackgroundSync(false);
  }, [refreshSeed]);

  const allMatchedLeads = useMemo(
    () => leadFullCacheRef.current.get(leadCacheKey)?.items || [],
    [backgroundSync, leadCacheKey, leads]
  );

  function mergeUpdatedLead(updatedLead) {
    if (!updatedLead?.lead_id) {
      return;
    }
    mergeLeadAcrossCaches({ fullCacheRef: leadFullCacheRef, pageCacheRef: leadPageCacheRef, updatedLead });
    setLeads((current) => updateLeadCollections(current, updatedLead));
  }

  function removeLead(leadId) {
    removeLeadAcrossCaches({ fullCacheRef: leadFullCacheRef, leadId, pageCacheRef: leadPageCacheRef });
    setLeads((current) => removeLeadFromCollection(current, leadId));
  }

  function applyOwnerChanges(leadIds, nextOwner, label) {
    applyOwnerAcrossCaches({ fullCacheRef: leadFullCacheRef, label, leadIds, nextOwner, pageCacheRef: leadPageCacheRef });
    setLeads((current) => applyOwnerToLeadCollections(current, leadIds, nextOwner, label));
  }

  return {
    applyOwnerChanges,
    allMatchedLeads,
    backgroundSync,
    leadCacheKey,
    leadMeta,
    leads,
    listError,
    loading,
    mergeUpdatedLead,
    page,
    pageRefreshing,
    removeLead,
    setLeads,
    setPage,
    totalMatched: Number(leadMeta.total || 0),
    totalPages: Math.max(Number(leadMeta.total_pages || 1), 1),
  };
}
