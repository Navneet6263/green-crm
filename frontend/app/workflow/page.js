"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../components/dashboard/DashboardShell";
import { apiRequest } from "../../lib/api";
import { ROLE_HOME_ROUTE } from "../../lib/roles";
import { loadSession } from "../../lib/session";
import { WorkflowWorkspaceView } from "./workflow-ui";
import {
  ALLOWED_ROLES,
  WORKFLOW_PAGE_SIZE,
  buildLeadAnalysis,
  buildWorkflowDeck,
  qp,
} from "./workflow-utils";

const INITIAL_FILTERS = {
  query: "",
  stage: "all",
  status: "all",
  owner: "all",
  priority: "all",
  source: "all",
};

const INITIAL_TRACKER_META = {
  page: 1,
  page_size: WORKFLOW_PAGE_SIZE,
  total: 0,
  total_pages: 1,
};

const TRACKER_FILTER_DEBOUNCE_MS = 300;

function normalizeTrackerMeta(meta = {}, pageNumber = 1) {
  return {
    page: Number(meta.page || pageNumber || 1),
    page_size: Number(meta.page_size || WORKFLOW_PAGE_SIZE),
    total: Number(meta.total || 0),
    total_pages: Math.max(Number(meta.total_pages || 1), 1),
  };
}

export default function WorkflowPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [queue, setQueue] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [trackerMeta, setTrackerMeta] = useState(INITIAL_TRACKER_META);
  const [trackerSummary, setTrackerSummary] = useState(null);
  const [trackerFilterOptions, setTrackerFilterOptions] = useState({ owners: [], sources: [] });
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const trackerCacheRef = useRef(new Map());
  const trackerRequestRef = useRef({ inFlight: new Map(), token: 0 });
  const detailRequestRef = useRef(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(filters.query.trim());
    }, TRACKER_FILTER_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [filters.query]);

  const trackerQuery = useMemo(
    () => ({
      query: debouncedQuery || undefined,
      stage: filters.stage !== "all" ? filters.stage : undefined,
      status: filters.status !== "all" ? filters.status : undefined,
      owner: filters.owner !== "all" ? filters.owner : undefined,
      priority: filters.priority !== "all" ? filters.priority : undefined,
      source: filters.source !== "all" ? filters.source : undefined,
    }),
    [debouncedQuery, filters.owner, filters.priority, filters.source, filters.stage, filters.status]
  );
  const trackerQueryKey = useMemo(() => JSON.stringify(trackerQuery), [trackerQuery]);

  function buildTrackerPath(pageNumber = 1) {
    return qp("/workflow/tracker", {
      page: pageNumber,
      page_size: WORKFLOW_PAGE_SIZE,
      ...trackerQuery,
    });
  }

  function applyWorkflowResponse(response, pageNumber = 1) {
    const nextItems = response.items || [];
    const nextMeta = normalizeTrackerMeta(response.meta, pageNumber);
    setQueue(nextItems);
    setTrackerMeta(nextMeta);
    setTrackerSummary(response.summary || null);
    setTrackerFilterOptions(response.filter_options || { owners: [], sources: [] });
    setCurrentPage(nextMeta.page);
    setSelectedId((current) => (nextItems.some((lead) => lead.lead_id === current) ? current : nextItems[0]?.lead_id || ""));
  }

  async function loadSelectedLead(activeSession, leadId) {
    if (!leadId) {
      detailRequestRef.current += 1;
      setSelectedLead(null);
      setDetailLoading(false);
      return;
    }
    const requestToken = detailRequestRef.current + 1;
    detailRequestRef.current = requestToken;
    setDetailLoading(true);
    setSelectedLead(null);
    try {
      const response = await apiRequest(`/leads/${leadId}`, { token: activeSession.token });
      if (detailRequestRef.current === requestToken) {
        setSelectedLead(response);
      }
    } catch (requestError) {
      if (detailRequestRef.current === requestToken) {
        setError(requestError.message);
      }
    } finally {
      if (detailRequestRef.current === requestToken) {
        setDetailLoading(false);
      }
    }
  }

  async function loadWorkflowPage(activeSession, pageNumber = 1, { refresh = false } = {}) {
    if (!activeSession?.token) {
      return null;
    }

    const path = buildTrackerPath(pageNumber);
    const cachedResponse = !refresh ? trackerCacheRef.current.get(path) : null;
    if (cachedResponse) {
      applyWorkflowResponse(cachedResponse, pageNumber);
      hasLoadedRef.current = true;
      setLoading(false);
      setPageLoading(false);
      return cachedResponse;
    }

    const pendingRequest = !refresh ? trackerRequestRef.current.inFlight.get(path) : null;
    if (pendingRequest) {
      return pendingRequest;
    }

    const requestToken = trackerRequestRef.current.token + 1;
    trackerRequestRef.current.token = requestToken;

    if (!hasLoadedRef.current) {
      setLoading(true);
    } else {
      setPageLoading(true);
    }

    setError("");

    const requestPromise = apiRequest(path, { token: activeSession.token })
      .then((response) => {
        trackerCacheRef.current.set(path, response);
        if (trackerRequestRef.current.token !== requestToken) {
          return response;
        }

        applyWorkflowResponse(response, pageNumber);
        hasLoadedRef.current = true;
        return response;
      })
      .catch((requestError) => {
        if (trackerRequestRef.current.token === requestToken) {
          setError(requestError.message);
          if (!hasLoadedRef.current) {
            setQueue([]);
            setTrackerMeta(INITIAL_TRACKER_META);
            setTrackerSummary(null);
            setSelectedId("");
            setSelectedLead(null);
          }
        }
        throw requestError;
      })
      .finally(() => {
        trackerRequestRef.current.inFlight.delete(path);
        if (trackerRequestRef.current.token === requestToken) {
          setLoading(false);
          setPageLoading(false);
        }
      });

    trackerRequestRef.current.inFlight.set(path, requestPromise);
    return requestPromise;
  }

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) {
      router.replace("/login");
      return;
    }
    if (!ALLOWED_ROLES.includes(activeSession.user?.role)) {
      router.replace(ROLE_HOME_ROUTE[activeSession.user?.role] || "/dashboard");
      return;
    }
    setSession(activeSession);
  }, [router]);

  useEffect(() => {
    if (!session?.token) {
      return;
    }

    setCurrentPage(1);
    loadWorkflowPage(session, 1).catch(() => {});
  }, [session, trackerQueryKey]);

  useEffect(() => {
    if (!session?.token || !selectedId) {
      if (!selectedId) {
        detailRequestRef.current += 1;
        setSelectedLead(null);
        setDetailLoading(false);
      }
      return;
    }
    loadSelectedLead(session, selectedId);
  }, [selectedId, session]);

  const deck = useMemo(
    () =>
      buildWorkflowDeck({
        filters,
        filterOptions: trackerFilterOptions,
        items: queue,
        meta: trackerMeta,
        summary: trackerSummary,
      }, filters),
    [filters, queue, trackerFilterOptions, trackerMeta, trackerSummary]
  );
  const analysis = useMemo(() => buildLeadAnalysis(selectedLead), [selectedLead]);
  const totalPages = Math.max(Number(trackerMeta.total_pages || 1), 1);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters(INITIAL_FILTERS);
  }

  return (
    <DashboardShell session={session} title="Workflow" hideTitle heroStats={[]}>
      <WorkflowWorkspaceView
        deck={deck}
        pagedLeads={queue}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={trackerMeta.page_size}
        filters={filters}
        selectedLead={selectedLead}
        selectedId={selectedId}
        analysis={analysis || { metrics: [], flags: [], customerSignal: "--" }}
        loading={loading}
        pageLoading={pageLoading}
        detailLoading={detailLoading}
        error={error}
        onSelectLead={setSelectedId}
        onPageChange={(nextPage) => {
          if (!session?.token || pageLoading || nextPage === currentPage) {
            return;
          }
          loadWorkflowPage(session, nextPage).catch(() => {});
        }}
        onRefresh={() => session?.token && loadWorkflowPage(session, currentPage, { refresh: true }).catch(() => {})}
        onFilterChange={updateFilter}
        onResetFilters={resetFilters}
      />
    </DashboardShell>
  );
}
