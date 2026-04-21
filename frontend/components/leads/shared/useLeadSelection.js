"use client";

import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { formatScopedError } from "../../../lib/teamScope";

export function useLeadSelection({ leads, resetKey, session }) {
  const [detailError, setDetailError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    setSelectedId("");
    setSelected(null);
    setDetailError("");
    setDetailLoading(false);
  }, [resetKey]);

  useEffect(() => {
    if (!session?.token || !selectedId) {
      setSelected(null);
      setDetailLoading(false);
      return undefined;
    }

    setDetailLoading(true);
    setDetailError("");

    let ignore = false;

    (async () => {
      try {
        const lead = await apiRequest(`/leads/${selectedId}`, { token: session.token });
        if (!ignore) {
          setSelected((current) =>
            current?.lead_id === lead.lead_id ? { ...current, ...lead } : lead
          );
        }
      } catch (requestError) {
        if (!ignore) {
          setDetailError(formatScopedError(requestError, "Could not load lead details."));
        }
      } finally {
        if (!ignore) {
          setDetailLoading(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [selectedId, session?.token]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const baseLead = leads.find((lead) => lead.lead_id === selectedId) || null;
    setSelected((current) => {
      if (!baseLead) {
        return current;
      }

      return current?.lead_id === selectedId ? { ...baseLead, ...current } : baseLead;
    });
  }, [leads, selectedId]);

  const activeLead = useMemo(
    () => selected || leads.find((lead) => lead.lead_id === selectedId) || null,
    [leads, selected, selectedId]
  );

  function toggleLeadSelection(leadId) {
    setSelectedId((current) => (current === leadId ? "" : leadId));
  }

  function mergeSelectedLead(updatedLead) {
    if (!updatedLead?.lead_id) {
      return;
    }

    setSelected((current) =>
      current?.lead_id === updatedLead.lead_id ? { ...current, ...updatedLead } : current
    );
  }

  function clearSelection() {
    setSelectedId("");
    setSelected(null);
  }

  return {
    activeLead,
    clearSelection,
    detailError,
    detailLoading,
    mergeSelectedLead,
    selected,
    selectedId,
    setSelected,
    toggleLeadSelection,
  };
}
