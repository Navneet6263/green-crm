"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "../../../lib/api";

export const TENANT_ROLE_OPTIONS = ["admin", "manager", "sales", "marketing", "support", "legal-team", "finance-team", "viewer"];

function initialState() {
  return {
    loading: true,
    savingUserId: "",
    users: [],
    error: "",
    message: "",
  };
}

export function useCompanyRoleControl({ companyId, token, enabled = true }) {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    if (!enabled || !companyId || !token) {
      setState(initialState);
      return;
    }

    let active = true;
    setState((current) => ({ ...current, loading: true, error: "", message: "" }));

    apiRequest(`/users?page_size=80&company_id=${companyId}`, { token })
      .then((response) => {
        if (!active) {
          return;
        }

        setState({
          loading: false,
          savingUserId: "",
          users: (response.items || []).filter((user) => TENANT_ROLE_OPTIONS.includes(user.role)),
          error: "",
          message: "",
        });
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setState((current) => ({ ...current, loading: false, error: error.message }));
      });

    return () => {
      active = false;
    };
  }, [companyId, enabled, token]);

  async function updateRole(userId, role) {
    setState((current) => ({ ...current, savingUserId: userId, error: "", message: "" }));

    try {
      const user = await apiRequest(`/super-admin/users/${userId}/role`, {
        method: "PUT",
        token,
        body: { role },
      });

      setState((current) => ({
        ...current,
        savingUserId: "",
        users: current.users.map((item) => (item.user_id === user.user_id ? user : item)),
        message: `${user.name || user.email} moved to ${role}.`,
      }));
    } catch (error) {
      setState((current) => ({ ...current, savingUserId: "", error: error.message }));
    }
  }

  return {
    ...state,
    updateRole,
  };
}
