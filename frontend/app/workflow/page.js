"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../components/dashboard/DashboardShell";
import { apiRequest } from "../../lib/api";
import { ROLE_HOME_ROUTE } from "../../lib/roles";
import { loadSession } from "../../lib/session";
import { WorkflowWorkspaceView } from "./workflow-ui";
import {
  ALLOWED_ROLES,
  WORKFLOW_BATCH,
  WORKFLOW_PAGE_SIZE,
  buildLeadAnalysis,
  buildWorkflowDeck,
  qp,
} from "./workflow-utils";

export default function WorkflowPage() {
  const queuePageSize = 10;
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [queue, setQueue] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    query: "",
    stage: "all",
    status: "all",
    owner: "all",
    priority: "all",
    source: "all",
  });
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadAllTrackerPages(token) {
    const firstResponse = await apiRequest(qp("/workflow/tracker", { page: 1, page_size: WORKFLOW_PAGE_SIZE }), { token });
    const totalPages = Number(firstResponse.meta?.total_pages || 1);
    const allItems = [...(firstResponse.items || [])];

    for (let page = 2; page <= totalPages; page += WORKFLOW_BATCH) {
      const batch = [];
      for (let currentPage = page; currentPage < page + WORKFLOW_BATCH && currentPage <= totalPages; currentPage += 1) {
        batch.push(apiRequest(qp("/workflow/tracker", { page: currentPage, page_size: WORKFLOW_PAGE_SIZE }), { token }));
      }
      const responses = await Promise.all(batch);
      responses.forEach((response) => allItems.push(...(response.items || [])));
    }

    return allItems;
  }

  async function loadSelectedLead(activeSession, leadId) {
    if (!leadId) {
      setSelectedLead(null);
      return;
    }
    setDetailLoading(true);
    setSelectedLead(null);
    try {
      const response = await apiRequest(`/leads/${leadId}`, { token: activeSession.token });
      setSelectedLead(response);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadWorkflow(activeSession) {
    setLoading(true);
    setError("");
    try {
      const items = await loadAllTrackerPages(activeSession.token);
      setQueue(items);
      setSelectedId((current) => (items.some((lead) => lead.lead_id === current) ? current : items[0]?.lead_id || ""));
    } catch (requestError) {
      setError(requestError.message);
      setQueue([]);
      setSelectedLead(null);
    } finally {
      setLoading(false);
    }
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
    loadWorkflow(activeSession);
  }, [router]);

  useEffect(() => {
    if (!session?.token || !selectedId) {
      if (!selectedId) {
        setSelectedLead(null);
      }
      return;
    }
    loadSelectedLead(session, selectedId);
  }, [selectedId, session]);

  const deck = useMemo(() => buildWorkflowDeck(queue, filters), [filters, queue]);
  const analysis = useMemo(() => buildLeadAnalysis(selectedLead), [selectedLead]);
  const totalPages = Math.max(1, Math.ceil(deck.filteredLeads.length / queuePageSize));
  const pagedLeads = useMemo(() => {
    const start = (currentPage - 1) * queuePageSize;
    return deck.filteredLeads.slice(start, start + queuePageSize);
  }, [currentPage, deck.filteredLeads]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters({
      query: "",
      stage: "all",
      status: "all",
      owner: "all",
      priority: "all",
      source: "all",
    });
  }

  return (
    <DashboardShell session={session} title="Workflow" hideTitle heroStats={[]}>
      <WorkflowWorkspaceView
        deck={deck}
        pagedLeads={pagedLeads}
        currentPage={currentPage}
        totalPages={totalPages}
        filters={filters}
        selectedLead={selectedLead}
        selectedId={selectedId}
        analysis={analysis || { metrics: [], flags: [], customerSignal: "--" }}
        loading={loading}
        detailLoading={detailLoading}
        error={error}
        onSelectLead={setSelectedId}
        onPageChange={setCurrentPage}
        onRefresh={() => session?.token && loadWorkflow(session)}
        onFilterChange={updateFilter}
        onResetFilters={resetFilters}
      />
    </DashboardShell>
  );
}
