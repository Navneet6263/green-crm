"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { formatScopedError } from "../../../lib/teamScope";
import {
  runArchiveLead,
  runTransferLeadToLegal,
} from "./leadOwnershipActionUtils";

export function useLeadOwnershipActions({
  activeLead,
  applyOwner,
  bulkUsers,
  clearSelection,
  leads,
  mergeLead,
  onArchived,
  picked,
  setPicked,
  setSelectedLead,
  setError,
  setNotice,
  session,
  teamUsers,
}) {
  const [assigning, setAssigning] = useState(false);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [bulkNote, setBulkNote] = useState("");
  const [bulkOwner, setBulkOwner] = useState("");
  const [deleting, setDeleting] = useState("");
  const [legalTransferNote, setLegalTransferNote] = useState("");
  const [legalTransferOwner, setLegalTransferOwner] = useState("");
  const [owner, setOwner] = useState("");
  const [ownerNote, setOwnerNote] = useState("");
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    setOwner(activeLead?.assigned_to || "");
    setOwnerNote("");
    setLegalTransferOwner(activeLead?.assigned_to_legal || "");
    setLegalTransferNote("");
  }, [activeLead?.assigned_to, activeLead?.assigned_to_legal, activeLead?.lead_id]);

  useEffect(() => {
    if (owner && owner !== activeLead?.assigned_to && !teamUsers.some((item) => item.user_id === owner)) {
      setOwner("");
    }
  }, [activeLead?.assigned_to, owner, teamUsers]);

  useEffect(() => {
    if (bulkOwner && !bulkUsers.some((item) => item.user_id === bulkOwner)) {
      setBulkOwner("");
    }
  }, [bulkOwner, bulkUsers]);

  async function saveOwner() {
    if (!activeLead || !owner || owner === activeLead.assigned_to) {
      return;
    }

    if (!ownerNote.trim()) {
      setError("Owner update note is required.");
      return;
    }

    setAssigning(true);
    setError("");
    setNotice("");

    try {
      const updatedLead = await apiRequest(`/leads/${activeLead.lead_id}/assign`, {
        method: "POST",
        token: session.token,
        body: { assigned_to: owner, change_note: ownerNote.trim() },
      });

      const person = teamUsers.find((user) => user.user_id === owner);
      mergeLead(updatedLead);
      applyOwner(
        [activeLead.lead_id],
        updatedLead.assigned_to || owner,
        updatedLead.assigned_to_name || person?.name || activeLead.assigned_to_name
      );
      setOwnerNote("");
      setNotice(`Lead owner updated to ${updatedLead.assigned_to_name || person?.name || "selected user"}.`);
    } catch (requestError) {
      setError(formatScopedError(requestError, "Could not update the lead owner."));
    } finally {
      setAssigning(false);
    }
  }

  async function bulkAssign() {
    if (!bulkOwner || !picked.length) {
      return;
    }

    if (!bulkNote.trim()) {
      setError("Bulk assignment note is required.");
      return;
    }

    const pickedTeamIds = [...new Set(leads.filter((lead) => picked.includes(lead.lead_id)).map((lead) => lead.team_id).filter(Boolean))];
    if (pickedTeamIds.length > 1) {
      setError("Select leads from one team at a time before bulk assignment.");
      return;
    }

    setBulkAssigning(true);
    setError("");
    setNotice("");

    try {
      const result = await apiRequest("/leads/assign", {
        method: "POST",
        token: session.token,
        body: { lead_ids: picked, assigned_to: bulkOwner, change_note: bulkNote.trim() },
      });

      const person = bulkUsers.find((user) => user.user_id === bulkOwner) || teamUsers.find((user) => user.user_id === bulkOwner);
      applyOwner(picked, bulkOwner, person?.name || "");
      setBulkOwner("");
      setBulkNote("");
      setPicked([]);
      setNotice(`${result.updated_count ?? picked.length} leads assigned to ${person?.name || "selected user"}.`);
    } catch (requestError) {
      setError(formatScopedError(requestError, "Could not update the selected lead owners."));
    } finally {
      setBulkAssigning(false);
    }
  }

  async function archiveLead(leadId) {
    await runArchiveLead({
      clearSelection,
      leadId,
      leads,
      onArchived,
      sessionToken: session.token,
      setDeleting,
      setError,
      setNotice,
      setPicked,
    });
  }

  async function transferLeadToLegal() {
    await runTransferLeadToLegal({
      activeLead,
      legalTransferNote,
      legalTransferOwner,
      mergeLead,
      sessionToken: session.token,
      setError,
      setLegalTransferNote,
      setNotice,
      setSelectedLead,
      setTransferring,
    });
  }

  return {
    archiveLead,
    assigning,
    bulkAssign,
    bulkAssigning,
    bulkNote,
    bulkOwner,
    deleting,
    legalTransferNote,
    legalTransferOwner,
    owner,
    ownerNote,
    saveOwner,
    setBulkNote,
    setBulkOwner,
    setLegalTransferNote,
    setLegalTransferOwner,
    setOwner,
    setOwnerNote,
    transferring,
    transferLeadToLegal,
  };
}
