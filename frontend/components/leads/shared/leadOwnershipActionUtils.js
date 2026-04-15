"use client";

import { apiRequest } from "../../../lib/api";
import { formatScopedError } from "../../../lib/teamScope";

export async function runArchiveLead({
  clearSelection,
  leadId,
  leads,
  onArchived,
  sessionToken,
  setDeleting,
  setError,
  setNotice,
  setPicked,
}) {
  const lead = leads.find((item) => item.lead_id === leadId);
  if (!window.confirm(`Archive "${lead?.company_name || "this lead"}"?`)) {
    return;
  }

  const archiveNote = window.prompt("Archive note is required. Why are you archiving this lead?")?.trim();
  if (!archiveNote) {
    setError("Archive note is required.");
    return;
  }

  setDeleting(leadId);
  setError("");
  setNotice("");

  try {
    await apiRequest(`/leads/${leadId}`, {
      method: "DELETE",
      token: sessionToken,
      body: { change_note: archiveNote },
    });

    clearSelection();
    setPicked((current) => current.filter((item) => item !== leadId));
    onArchived?.(leadId);
    setNotice(`Lead "${lead?.company_name || ""}" archived successfully.`);
  } catch (requestError) {
    setError(formatScopedError(requestError, "Could not archive this lead."));
  } finally {
    setDeleting("");
  }
}

export async function runTransferLeadToLegal({
  activeLead,
  legalTransferNote,
  legalTransferOwner,
  mergeLead,
  sessionToken,
  setError,
  setLegalTransferNote,
  setNotice,
  setSelectedLead,
  setTransferring,
}) {
  if (!activeLead) {
    return;
  }

  if (!legalTransferNote.trim()) {
    setError("Transfer note is required before moving a closed-won lead to legal.");
    return;
  }

  setTransferring(true);
  setError("");
  setNotice("");

  try {
    const updatedLead = await apiRequest(`/workflow/${activeLead.lead_id}/transfer-to-legal`, {
      method: "POST",
      token: sessionToken,
      body: { assigned_to: legalTransferOwner || null, notes: legalTransferNote.trim() },
    });

    mergeLead(updatedLead);
    const latestLead = await apiRequest(`/leads/${updatedLead.lead_id}`, { token: sessionToken });
    setSelectedLead(latestLead);
    setLegalTransferNote("");
    setNotice("Lead transferred to legal successfully.");
  } catch (requestError) {
    setError(formatScopedError(requestError, "Could not transfer this lead to legal."));
  } finally {
    setTransferring(false);
  }
}
