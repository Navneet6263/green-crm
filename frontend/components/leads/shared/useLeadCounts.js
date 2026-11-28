"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../../../lib/api";
import { buildQueryPath } from "./leadPageFormatters";

// Filters that narrow WHO and WHAT is counted. The status, priority, follow-up and "no update"
// filters are left out on purpose: the cards and views are those filters, so each card keeps its own count.
const SCOPE_KEYS = ["company_id", "team_ids", "assigned_to", "product_id", "lead_source", "created_by", "workflow_stage", "search", "notes_search", "from_date", "to_date"];
const NARROWING = SCOPE_KEYS.filter((key) => key !== "company_id");

/** Numbers for the Leads page cards and view tabs, following the filters above the list. */
export function useLeadCounts(token, leadQueryBase, seeds = []) {
  const [counts, setCounts] = useState(null);
  const scope = Object.fromEntries(SCOPE_KEYS.map((key) => [key, leadQueryBase[key]]));
  if (scope.from_date || scope.to_date) scope.date_filter_type = leadQueryBase.date_filter_type;
  const key = JSON.stringify(scope);
  const filtered = NARROWING.some((name) => scope[name]);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    apiRequest(buildQueryPath("/leads/counts", JSON.parse(key)), { token, fresh: true })
      .then((data) => { if (!cancelled) setCounts({ ...data, filtered }); })
      .catch(() => { if (!cancelled) setCounts(null); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, key, ...seeds]);

  return counts;
}
