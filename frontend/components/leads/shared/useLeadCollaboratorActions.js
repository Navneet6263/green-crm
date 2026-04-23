"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { formatScopedError } from "../../../lib/teamScope";

function getSharedUserIds(lead) {
  if (Array.isArray(lead?.shared_user_ids) && lead.shared_user_ids.length) {
    return lead.shared_user_ids;
  }

  return (Array.isArray(lead?.shared_users) ? lead.shared_users : [])
    .map((user) => user?.user_id)
    .filter(Boolean);
}

export function useLeadCollaboratorActions({
  activeLead,
  mergeLead,
  session,
  setError,
  setNotice,
  teamUsers,
}) {
  const [pendingCollaborator, setPendingCollaborator] = useState("");
  const [removingCollaboratorId, setRemovingCollaboratorId] = useState("");
  const [savingCollaborators, setSavingCollaborators] = useState(false);

  useEffect(() => {
    setPendingCollaborator("");
  }, [activeLead?.lead_id]);

  useEffect(() => {
    if (pendingCollaborator && !teamUsers.some((user) => user.user_id === pendingCollaborator)) {
      setPendingCollaborator("");
    }
  }, [pendingCollaborator, teamUsers]);

  async function addCollaborator() {
    if (!activeLead?.lead_id || !pendingCollaborator) {
      return;
    }

    const currentSharedUserIds = getSharedUserIds(activeLead);
    if (currentSharedUserIds.includes(pendingCollaborator) || activeLead.assigned_to === pendingCollaborator) {
      setPendingCollaborator("");
      return;
    }

    setSavingCollaborators(true);
    setError("");
    setNotice("");

    try {
      const response = await apiRequest(`/leads/${activeLead.lead_id}/assignments`, {
        method: "PUT",
        token: session.token,
        body: { shared_user_ids: [...currentSharedUserIds, pendingCollaborator] },
      });
      const person = teamUsers.find((user) => user.user_id === pendingCollaborator);
      mergeLead(response);
      setPendingCollaborator("");
      setNotice(`${person?.name || "User"} added to this lead.`);
    } catch (requestError) {
      setError(formatScopedError(requestError, "Could not add shared lead access."));
    } finally {
      setSavingCollaborators(false);
    }
  }

  async function removeCollaborator(userId) {
    if (!activeLead?.lead_id || !userId) {
      return;
    }

    setRemovingCollaboratorId(userId);
    setError("");
    setNotice("");

    try {
      const response = await apiRequest(`/leads/${activeLead.lead_id}/assignments/${userId}`, {
        method: "DELETE",
        token: session.token,
      });
      const person =
        (activeLead.shared_users || []).find((user) => user.user_id === userId)
        || teamUsers.find((user) => user.user_id === userId);
      mergeLead(response);
      setNotice(`${person?.name || "User"} removed from shared access.`);
    } catch (requestError) {
      setError(formatScopedError(requestError, "Could not remove shared lead access."));
    } finally {
      setRemovingCollaboratorId("");
    }
  }

  return {
    addCollaborator,
    pendingCollaborator,
    removeCollaborator,
    removingCollaboratorId,
    savingCollaborators,
    setPendingCollaborator,
  };
}
