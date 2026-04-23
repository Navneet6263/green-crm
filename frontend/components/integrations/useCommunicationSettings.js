"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "../../lib/api";
import { buildCommunicationDraft, buildCommunicationPayload } from "./utils";

function initialState() {
  return {
    loading: true,
    saving: false,
    error: "",
    message: "",
    draft: buildCommunicationDraft(),
  };
}

export function useCommunicationSettings({ companyId, token, enabled = true, canEditPermissions = false }) {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    if (!enabled || !companyId || !token) {
      setState(initialState());
      return;
    }

    let active = true;
    setState((current) => ({ ...current, loading: true, error: "", message: "" }));

    apiRequest(`/companies/${companyId}/communication-settings`, { token })
      .then((response) => {
        if (!active) return;
        setState({ loading: false, saving: false, error: "", message: "", draft: buildCommunicationDraft(response) });
      })
      .catch((error) => {
        if (!active) return;
        setState((current) => ({ ...current, loading: false, error: error.message }));
      });

    return () => {
      active = false;
    };
  }, [companyId, enabled, token]);

  function updateChannel(channel, key, value) {
    setState((current) => ({
      ...current,
      message: "",
      draft: {
        ...current.draft,
        integrations: {
          ...current.draft.integrations,
          [channel]: { ...current.draft.integrations[channel], [key]: value },
        },
      },
    }));
  }

  function updateConfig(channel, key, value) {
    setState((current) => ({
      ...current,
      message: "",
      draft: {
        ...current.draft,
        integrations: {
          ...current.draft.integrations,
          [channel]: {
            ...current.draft.integrations[channel],
            config: { ...current.draft.integrations[channel].config, [key]: value },
          },
        },
      },
    }));
  }

  function togglePermission(key) {
    setState((current) => ({
      ...current,
      message: "",
      draft: {
        ...current.draft,
        permissions: {
          ...(current.draft.permissions || {}),
          [key]: !current.draft.permissions?.[key],
        },
      },
    }));
  }

  async function save() {
    setState((current) => ({ ...current, saving: true, error: "", message: "" }));

    try {
      const response = await apiRequest(`/companies/${companyId}/communication-settings`, {
        method: "PUT",
        token,
        body: buildCommunicationPayload(state.draft, canEditPermissions),
      });

      setState({ loading: false, saving: false, error: "", message: "Communication settings updated.", draft: buildCommunicationDraft(response) });
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error: error.message }));
    }
  }

  return {
    ...state,
    updateChannel,
    updateConfig,
    togglePermission,
    save,
  };
}
