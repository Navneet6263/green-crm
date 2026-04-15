"use client";

import { apiRequest } from "../../../lib/api";
import {
  LEAD_BACKGROUND_BATCH_DELAY_MS,
  LEAD_BACKGROUND_BATCH_SIZE,
  LEADS_PAGE_SIZE,
} from "./leadPageConstants";
import { buildQueryPath } from "./leadPageFormatters";
import {
  applyOwnerToLeadCollections,
  normalizeLeadMeta,
  removeLeadFromCollection,
  updateLeadCollections,
} from "./leadPageHelpers";

export function cacheLeadPage(pageCacheRef, cacheKey, pageNumber, items, meta) {
  const pageCache = pageCacheRef.current.get(cacheKey) || new Map();
  pageCache.set(pageNumber, { items: items || [], meta });
  pageCacheRef.current.set(cacheKey, pageCache);
}

export function getCachedLeadPage({ cacheKey, fullCacheRef, pageCacheRef, pageNumber }) {
  const fullCache = fullCacheRef.current.get(cacheKey);
  if (fullCache) {
    const startIndex = (pageNumber - 1) * LEADS_PAGE_SIZE;
    return {
      items: fullCache.items.slice(startIndex, startIndex + LEADS_PAGE_SIZE),
      meta: { page: pageNumber, page_size: LEADS_PAGE_SIZE, total: fullCache.total, total_pages: fullCache.total_pages },
    };
  }

  return pageCacheRef.current.get(cacheKey)?.get(pageNumber) || null;
}

export async function prefetchLeadPage({ cacheKey, leadQueryBase, pageCacheRef, pageNumber, token, totalPages, fullCacheRef }) {
  if (!token || !pageNumber || pageNumber < 1 || pageNumber > totalPages || getCachedLeadPage({ cacheKey, fullCacheRef, pageCacheRef, pageNumber })) {
    return;
  }

  const response = await apiRequest(buildQueryPath("/leads", { page: pageNumber, page_size: LEADS_PAGE_SIZE, ...leadQueryBase }), { token });
  cacheLeadPage(pageCacheRef, cacheKey, pageNumber, response.items || [], normalizeLeadMeta(response.meta, pageNumber));
}

export function startBackgroundLeadSync({ cacheKey, fullCacheRef, leadPrefetchRef, leadQueryBase, setBackgroundSync, token, total }) {
  if (!token || !total || total <= LEADS_PAGE_SIZE || fullCacheRef.current.has(cacheKey)) {
    return;
  }

  if (leadPrefetchRef.current.running && leadPrefetchRef.current.key === cacheKey) {
    return;
  }

  leadPrefetchRef.current = { key: cacheKey, running: true, token: leadPrefetchRef.current.token + 1 };
  const syncToken = leadPrefetchRef.current.token;
  setBackgroundSync(true);

  (async () => {
    const batchPages = Math.max(Math.ceil(total / LEAD_BACKGROUND_BATCH_SIZE), 1);
    const allItems = [];

    for (let batchPage = 1; batchPage <= batchPages; batchPage += 1) {
      if (leadPrefetchRef.current.token !== syncToken || leadPrefetchRef.current.key !== cacheKey) {
        return;
      }

      if (batchPage > 1) {
        await new Promise((resolve) => setTimeout(resolve, LEAD_BACKGROUND_BATCH_DELAY_MS));
      }

      const response = await apiRequest(
        buildQueryPath("/leads", { page: batchPage, page_size: LEAD_BACKGROUND_BATCH_SIZE, full_fetch: 1, ...leadQueryBase }),
        { token }
      );

      if (leadPrefetchRef.current.token !== syncToken || leadPrefetchRef.current.key !== cacheKey) {
        return;
      }

      allItems.push(...(response.items || []));
    }

    fullCacheRef.current.set(cacheKey, {
      items: allItems,
      total,
      total_pages: Math.max(Math.ceil(total / LEADS_PAGE_SIZE), 1),
    });
  })()
    .catch(() => {})
    .finally(() => {
      if (leadPrefetchRef.current.token === syncToken && leadPrefetchRef.current.key === cacheKey) {
        leadPrefetchRef.current.running = false;
        setBackgroundSync(false);
      }
    });
}

export function mergeLeadAcrossCaches({ fullCacheRef, pageCacheRef, updatedLead }) {
  pageCacheRef.current.forEach((pageCache) => {
    pageCache.forEach((entry, pageKey) => {
      if (entry?.items?.some((lead) => lead.lead_id === updatedLead.lead_id)) {
        pageCache.set(pageKey, { ...entry, items: updateLeadCollections(entry.items, updatedLead) });
      }
    });
  });

  fullCacheRef.current.forEach((entry, cacheKey) => {
    if (entry?.items?.some((lead) => lead.lead_id === updatedLead.lead_id)) {
      fullCacheRef.current.set(cacheKey, { ...entry, items: updateLeadCollections(entry.items, updatedLead) });
    }
  });
}

export function removeLeadAcrossCaches({ fullCacheRef, pageCacheRef, leadId }) {
  pageCacheRef.current.forEach((pageCache) => {
    pageCache.forEach((entry, pageKey) => {
      pageCache.set(pageKey, { ...entry, items: removeLeadFromCollection(entry.items, leadId) });
    });
  });

  fullCacheRef.current.forEach((entry, cacheKey) => {
    fullCacheRef.current.set(cacheKey, { ...entry, items: removeLeadFromCollection(entry.items, leadId) });
  });
}

export function applyOwnerAcrossCaches({ fullCacheRef, label, leadIds, nextOwner, pageCacheRef }) {
  pageCacheRef.current.forEach((pageCache) => {
    pageCache.forEach((entry, pageKey) => {
      pageCache.set(pageKey, { ...entry, items: applyOwnerToLeadCollections(entry.items, leadIds, nextOwner, label) });
    });
  });

  fullCacheRef.current.forEach((entry, cacheKey) => {
    fullCacheRef.current.set(cacheKey, { ...entry, items: applyOwnerToLeadCollections(entry.items, leadIds, nextOwner, label) });
  });
}
