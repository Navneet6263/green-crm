"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "../../../lib/api";
import {
  loadTeamsForCompany,
  loadUsersForScope,
  resolveInitialTeamId,
} from "../../../lib/teamScope";
import { buildQueryPath } from "./leadPageFormatters";
import { mapProductOptions } from "./leadPageHelpers";

export function useLeadScopeResources({
  canLoadScopedUsers,
  canManage,
  isPlatformConsole,
  onInvalidTeamFilter,
  pickedTeamIds,
  refreshSeed,
  scopedCompanyId,
  scopedTeamId,
  session,
  teamCompanyId,
  teamFilter,
}) {
  const [bulkUsers, setBulkUsers] = useState([]);
  const [filterUsers, setFilterUsers] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    if (!session?.token) {
      return undefined;
    }

    let ignore = false;

    (async () => {
      try {
        const requests = [
          teamCompanyId
            ? loadTeamsForCompany(session.token, teamCompanyId)
            : Promise.resolve([]),
          !isPlatformConsole || scopedCompanyId
            ? apiRequest(
                buildQueryPath("/leads/stats/products", {
                  company_id: scopedCompanyId,
                  team_ids: teamFilter !== "all" ? teamFilter : undefined,
                }),
                { token: session.token }
              )
            : Promise.resolve([]),
        ];

        const [scopeResources, productStats] = await Promise.all(requests);
        if (ignore) {
          return;
        }

        const nextTeams = scopeResources || [];
        setTeams(nextTeams);
        setProductOptions(mapProductOptions(productStats));

        if (teamFilter !== "all" && !nextTeams.some((entry) => entry.team_id === teamFilter)) {
          onInvalidTeamFilter?.();
        }
      } catch (_error) {
        if (!ignore) {
          setTeams([]);
          setTeamUsers([]);
          setProductOptions([]);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [
    canLoadScopedUsers,
    isPlatformConsole,
    onInvalidTeamFilter,
    refreshSeed,
    scopedCompanyId,
    session,
    teamCompanyId,
    teamFilter,
  ]);

  useEffect(() => {
    if (!session?.token || !canLoadScopedUsers || !teamCompanyId) {
      setTeamUsers([]);
      return undefined;
    }

    let ignore = false;

    (async () => {
      try {
        const resolvedTeamId = resolveInitialTeamId(
          teams,
          teamFilter !== "all" ? teamFilter : scopedTeamId
        );
        const users = await loadUsersForScope(session.token, {
          companyId: teamCompanyId,
          teamId: resolvedTeamId,
          pageSize: 80,
          path: "/users",
        });

        if (!ignore) {
          setTeamUsers(users);
        }
      } catch (_error) {
        if (!ignore) {
          setTeamUsers([]);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [canLoadScopedUsers, scopedTeamId, session, teamCompanyId, teamFilter, teams]);

  useEffect(() => {
    if (!session?.token || !canManage || !teamCompanyId) {
      setFilterUsers([]);
      return undefined;
    }

    let ignore = false;

    (async () => {
      try {
        const users = await loadUsersForScope(session.token, {
          companyId: teamCompanyId,
          teamId: teamFilter !== "all" ? teamFilter : "",
          pageSize: 120,
          path: "/users",
        });

        if (!ignore) {
          setFilterUsers(users);
        }
      } catch (_error) {
        if (!ignore) {
          setFilterUsers([]);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [canManage, session, teamCompanyId, teamFilter]);

  useEffect(() => {
    if (!session?.token || !canManage || !teamCompanyId || pickedTeamIds.length !== 1) {
      setBulkUsers([]);
      return undefined;
    }

    let ignore = false;

    (async () => {
      try {
        const users = await loadUsersForScope(session.token, {
          companyId: teamCompanyId,
          teamId: pickedTeamIds[0],
          pageSize: 80,
          path: "/users",
        });

        if (!ignore) {
          setBulkUsers(users);
        }
      } catch (_error) {
        if (!ignore) {
          setBulkUsers([]);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [canManage, pickedTeamIds, session, teamCompanyId]);

  return {
    bulkUsers,
    filterUsers,
    productOptions,
    teamUsers,
    teams,
  };
}
