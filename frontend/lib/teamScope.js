import { apiRequest } from "./api";

export const PLATFORM_CONSOLE_ROLES = ["super-admin", "platform-admin", "platform-manager"];
export const TEAM_AWARE_ROLES = [
  "super-admin",
  "platform-admin",
  "platform-manager",
  "admin",
  "manager",
  "sales",
  "marketing",
  "support",
];
export const TEAM_ASSIGNMENT_ROLES = [
  "super-admin",
  "platform-admin",
  "platform-manager",
  "admin",
  "manager",
];

function normalizeQueryValue(value) {
  if (Array.isArray(value)) {
    const list = value
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    return list.length ? list.join(",") : "";
  }

  return value;
}

function buildPath(path, query = {}) {
  const search = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    const normalizedValue = normalizeQueryValue(value);

    if (normalizedValue === undefined || normalizedValue === null || normalizedValue === "") {
      return;
    }

    search.set(key, normalizedValue);
  });

  const queryString = search.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export function normalizeTeamItems(response) {
  return (response?.items || response || []).filter((team) => team?.team_id);
}

export function normalizeUserItems(response) {
  return (response?.items || response || []).filter(
    (user) => user?.user_id && user?.is_active !== false
  );
}

export function normalizeProductItems(response) {
  return (response?.items || response || []).filter((product) => product?.product_id);
}

export function isPlatformConsoleRole(role = "") {
  return PLATFORM_CONSOLE_ROLES.includes(role);
}

export function canManageScopedAssignments(role = "") {
  return TEAM_ASSIGNMENT_ROLES.includes(role);
}

export function resolveSessionCompanyId(session) {
  return session?.user?.company_id || session?.company?.company_id || "";
}

export function resolveScopedCompanyId(session, preferredCompanyId = "") {
  return isPlatformConsoleRole(session?.user?.role)
    ? preferredCompanyId || ""
    : resolveSessionCompanyId(session);
}

export function resolveInitialTeamId(teams, preferredTeamId = "") {
  if (preferredTeamId && teams.some((team) => team.team_id === preferredTeamId)) {
    return preferredTeamId;
  }

  if (teams.length === 1) {
    return teams[0].team_id;
  }

  return "";
}

export function shouldShowTeamSelector(role, teams = []) {
  return TEAM_AWARE_ROLES.includes(role) && teams.length > 1;
}

export function teamSelectLabel(team) {
  if (!team) {
    return "Unscoped team";
  }

  return team.code ? `${team.name} | ${team.code}` : team.name;
}

export function teamBadgeLabel(record) {
  if (!record?.team_name && !record?.team_code) {
    return "";
  }

  return record.team_code ? `${record.team_name || "Team"} | ${record.team_code}` : record.team_name;
}

export function filterRecordsByTeam(records, teamId) {
  if (!teamId) {
    return records || [];
  }

  return (records || []).filter((record) => !record?.team_id || record.team_id === teamId);
}

export async function loadTeamsForCompany(token, companyId, pageSize = 120) {
  if (!token || !companyId) {
    return [];
  }

  const response = await apiRequest(
    buildPath("/teams", {
      company_id: companyId,
      page_size: pageSize,
    }),
    { token }
  );

  return normalizeTeamItems(response);
}

export async function loadUsersForScope(token, { companyId, teamId = "", pageSize = 120, path = "/users" } = {}) {
  if (!token || !companyId) {
    return [];
  }

  const response = await apiRequest(
    buildPath(path, {
      company_id: companyId || undefined,
      team_ids: teamId || undefined,
      page_size: pageSize,
    }),
    { token }
  );

  return normalizeUserItems(response);
}

export async function loadProductsForScope(token, { companyId, teamId = "", pageSize = 120, path = "/products" } = {}) {
  if (!token) {
    return [];
  }

  const response = await apiRequest(
    buildPath(path, {
      company_id: companyId || undefined,
      team_ids: teamId || undefined,
      page_size: pageSize,
    }),
    { token }
  );

  return normalizeProductItems(response);
}

export async function loadTeamScopeResources(
  token,
  { companyId, teamId = "", includeUsers = false, userPageSize = 120, userPath = "/users" } = {}
) {
  if (!token || !companyId) {
    return { teams: [], users: [], teamId: "" };
  }

  const teams = await loadTeamsForCompany(token, companyId);
  const resolvedTeamId = resolveInitialTeamId(teams, teamId);
  const users = includeUsers
    ? await loadUsersForScope(token, {
        companyId,
        teamId: resolvedTeamId,
        pageSize: userPageSize,
        path: userPath,
      })
    : [];

  return {
    teams,
    users,
    teamId: resolvedTeamId,
  };
}

export function teamSelectionRequiredMessage(subject = "record") {
  return `Choose the team that should own this ${subject}.`;
}

export function getTeamAssignmentState(teams = [], selectedTeamId = "", subject = "record") {
  const normalizedSubject = String(subject || "record").trim().toLowerCase() || "record";
  const normalizedTeams = normalizeTeamItems(teams);
  const selectedTeam =
    normalizedTeams.find((team) => team.team_id === selectedTeamId) ||
    (normalizedTeams.length === 1 ? normalizedTeams[0] : null);

  if (!normalizedTeams.length) {
    return {
      mode: "none",
      selectedTeam: null,
      title: "No active team configured",
      description: `Create a team first before assigning team ownership. Until then, this ${normalizedSubject} will not show a team owner.`,
    };
  }

  if (normalizedTeams.length === 1 && selectedTeam) {
    return {
      mode: "auto",
      selectedTeam,
      title: "Team assignment is automatic",
      description: `This company currently has one active team, so this ${normalizedSubject} will be assigned to ${selectedTeam.name} automatically.`,
    };
  }

  if (!selectedTeam) {
    return {
      mode: "manual",
      selectedTeam: null,
      title: "Choose team ownership",
      description: `${teamSelectionRequiredMessage(normalizedSubject)} Available owners and products update after you pick a team.`,
    };
  }

  return {
    mode: "selected",
    selectedTeam,
    title: `${selectedTeam.name} will own this ${normalizedSubject}`,
    description: `This ${normalizedSubject} will belong to ${selectedTeam.name}. Available owners and products are filtered by the selected team.`,
  };
}

export function scopedOwnersHelperText(team) {
  return team?.name
    ? `Available owners are filtered by ${team.name}.`
    : "Available owners are filtered by the selected team.";
}

export function scopedProductsHelperText(team) {
  return team?.name
    ? `Only products available to ${team.name} are shown here.`
    : "Only products available to the selected team are shown here.";
}

export function scopedUsersEmptyMessage(team) {
  return team?.name
    ? `No active users are available in ${team.name}.`
    : "No active users are available in this workspace.";
}

export function scopedProductsEmptyMessage(team) {
  return team?.name
    ? `No products are available for ${team.name} yet.`
    : "No products are available in this workspace yet.";
}

export function formatScopedError(error, fallback = "Request failed.") {
  return error?.message || fallback;
}
