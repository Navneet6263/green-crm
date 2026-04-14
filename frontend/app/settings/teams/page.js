"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../components/dashboard/icons";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";
import {
  formatScopedError,
  isPlatformConsoleRole,
  loadTeamsForCompany,
  loadUsersForScope,
  resolveScopedCompanyId,
} from "../../../lib/teamScope";
import { AlertError, AlertSuccess } from "../../../components/ui/Alert";

const ALLOWED_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager"];
const MANAGER_CAPABLE_ROLES = new Set(["super-admin", "platform-admin", "platform-manager", "admin", "manager"]);
const ASSIGNABLE_ROLE_FILTERS = [
  ["all", "All roles"],
  ["manager", "Managers"],
  ["sales", "Sales"],
  ["marketing", "Marketing"],
  ["support", "Support"],
  ["legal-team", "Legal"],
  ["finance-team", "Finance"],
  ["viewer", "Viewer"],
];

const HERO = "rounded-[36px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(250,241,221,0.98)_44%,_rgba(245,231,193,0.98)_100%)] p-6 shadow-[0_24px_70px_rgba(79,58,22,0.08)] md:p-8";
const PANEL = "rounded-[30px] border border-[#eadfcd] bg-white/82 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const SOFT = "rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4";
const INPUT = "w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none transition placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const PRIMARY = "inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2.5 text-sm font-semibold text-[#060710] shadow-[0_16px_30px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f] disabled:cursor-not-allowed disabled:opacity-60";
const GHOST = "inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710] disabled:cursor-not-allowed disabled:opacity-60";
const DANGER = "inline-flex min-h-[40px] cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60";
const KICKER = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";

function createTeamDraft(companyId = "") {
  return {
    company_id: companyId,
    name: "",
    code: "",
    description: "",
    is_active: true,
  };
}

function teamDraftFromRecord(team, companyId = "") {
  return {
    company_id: companyId || team?.company_id || "",
    name: team?.name || "",
    code: team?.code || "",
    description: team?.description || "",
    is_active: team?.is_active !== false,
  };
}

function initials(value = "TM") {
  return String(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() || "")
    .join("") || "TM";
}

function prettyRole(value = "") {
  return String(value)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function when(value, withTime = false) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString(
    "en-IN",
    withTime
      ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
      : { day: "numeric", month: "short", year: "numeric" }
  );
}

function buildTeamPath(teamId, companyId) {
  return companyId ? `/teams/${teamId}?company_id=${companyId}` : `/teams/${teamId}`;
}

function buildAssignableUsersPath(teamId, companyId) {
  return companyId ? `/teams/${teamId}/assignable-users?company_id=${companyId}` : `/teams/${teamId}/assignable-users`;
}

function normalizeActionUserId(value, fallback = "") {
  if (!value) {
    return String(fallback || "").trim();
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  if (typeof value === "object") {
    if (typeof value.preventDefault === "function" || value.currentTarget || value.target) {
      return String(fallback || "").trim();
    }

    if (value.user_id) {
      return String(value.user_id).trim();
    }
  }

  return String(fallback || "").trim();
}

export default function TeamSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [teamDetail, setTeamDetail] = useState(null);
  const [teamQuery, setTeamQuery] = useState("");
  const [assignmentQuery, setAssignmentQuery] = useState("");
  const [assignmentRoleFilter, setAssignmentRoleFilter] = useState("all");
  const [memberCandidateId, setMemberCandidateId] = useState("");
  const [managerCandidateId, setManagerCandidateId] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState("create");
  const [teamForm, setTeamForm] = useState(createTeamDraft());
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [assignableLoading, setAssignableLoading] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [workingKey, setWorkingKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const role = session?.user?.role || "";
  const isPlatformConsole = isPlatformConsoleRole(role);
  const scopedCompanyId = resolveScopedCompanyId(session, selectedCompanyId);
  const canCreateTeams = !isPlatformConsole;
  const canOpenUserRoster = ["super-admin", "admin"].includes(role);
  const selectedCompany = useMemo(
    () =>
      companies.find((company) => company.company_id === scopedCompanyId) ||
      companies[0] ||
      session?.company ||
      null,
    [companies, scopedCompanyId, session?.company]
  );
  const filteredTeams = useMemo(() => {
    const query = teamQuery.trim().toLowerCase();
    if (!query) {
      return teams;
    }

    return teams.filter((team) =>
      [team.name, team.code, team.description, team.created_by_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [teamQuery, teams]);
  const selectedTeam = useMemo(() => {
    const summary = teams.find((team) => team.team_id === selectedTeamId) || null;
    if (!summary) {
      return teamDetail?.team_id === selectedTeamId ? teamDetail : null;
    }

    if (!teamDetail || teamDetail.team_id !== summary.team_id) {
      return summary;
    }

    return {
      ...summary,
      ...teamDetail,
      members: teamDetail.members || [],
      managers: teamDetail.managers || [],
    };
  }, [selectedTeamId, teamDetail, teams]);
  const teamMembers = selectedTeam?.members || [];
  const teamManagers = selectedTeam?.managers || [];
  const availableMembers = useMemo(
    () => assignableUsers.filter((user) => !teamMembers.some((member) => member.user_id === user.user_id)),
    [assignableUsers, teamMembers]
  );
  const availableManagers = useMemo(
    () =>
      assignableUsers.filter(
        (user) =>
          MANAGER_CAPABLE_ROLES.has(user.role) &&
          !teamManagers.some((manager) => manager.user_id === user.user_id)
      ),
    [assignableUsers, teamManagers]
  );
  const filteredAssignmentUsers = useMemo(() => {
    const query = assignmentQuery.trim().toLowerCase();

    return assignableUsers
      .filter((user) => {
        const matchesRole = assignmentRoleFilter === "all" || user.role === assignmentRoleFilter;
        if (!matchesRole) {
          return false;
        }

        if (!query) {
          return true;
        }

        return [user.name, user.email, user.role, user.department, user.user_id]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((left, right) => {
        const leftIsMember = teamMembers.some((member) => member.user_id === left.user_id);
        const rightIsMember = teamMembers.some((member) => member.user_id === right.user_id);
        const leftIsManager = teamManagers.some((manager) => manager.user_id === left.user_id);
        const rightIsManager = teamManagers.some((manager) => manager.user_id === right.user_id);

        if (leftIsMember !== rightIsMember) {
          return leftIsMember ? -1 : 1;
        }

        if (leftIsManager !== rightIsManager) {
          return leftIsManager ? -1 : 1;
        }

        return String(left.name || "").localeCompare(String(right.name || ""));
      });
  }, [assignableUsers, assignmentQuery, assignmentRoleFilter, teamManagers, teamMembers]);
  const assignmentHelperCopy = role === "manager"
    ? "Managers cannot create new IDs. Ask admin to create the account first, then add that user here to a team you manage."
    : "Create the user ID in Workspace Users, then add that person here as a member or manager for the selected team.";
  const stats = useMemo(
    () => ({
      teams: teams.length,
      members: teams.reduce((sum, team) => sum + Number(team.member_count || 0), 0),
      managers: teams.reduce((sum, team) => sum + Number(team.manager_count || 0), 0),
      users: users.length,
    }),
    [teams, users.length]
  );

  async function refreshWorkspace(activeSession = session, companyId = scopedCompanyId, preferredTeamId = selectedTeamId) {
    if (!activeSession?.token) {
      return;
    }

    if (!companyId) {
      setTeams([]);
      setUsers([]);
      setAssignableUsers([]);
      setSelectedTeamId("");
      setTeamDetail(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [teamItems, userItems] = await Promise.all([
        loadTeamsForCompany(activeSession.token, companyId),
        loadUsersForScope(activeSession.token, { companyId, pageSize: 180, path: "/users" }),
      ]);

      setTeams(teamItems);
      setUsers(userItems);

      const nextSelectedTeamId = teamItems.some((team) => team.team_id === preferredTeamId)
        ? preferredTeamId
        : teamItems[0]?.team_id || "";

      setSelectedTeamId(nextSelectedTeamId);
      if (!nextSelectedTeamId) {
        setTeamDetail(null);
        setAssignableUsers([]);
      }
    } catch (requestError) {
      setTeams([]);
      setUsers([]);
      setAssignableUsers([]);
      setSelectedTeamId("");
      setTeamDetail(null);
      setError(formatScopedError(requestError, "Failed to load team workspace."));
    } finally {
      setLoading(false);
    }
  }

  async function refreshSelectedTeamWorkspace(activeSession = session, companyId = scopedCompanyId, teamId = selectedTeamId) {
    if (!activeSession?.token || !companyId || !teamId) {
      return;
    }

    try {
      const [teamItems, detail, assignable] = await Promise.all([
        loadTeamsForCompany(activeSession.token, companyId),
        apiRequest(buildTeamPath(teamId, companyId), { token: activeSession.token }),
        apiRequest(buildAssignableUsersPath(teamId, companyId), { token: activeSession.token }),
      ]);

      setTeams(teamItems);
      setTeamDetail(detail);
      setAssignableUsers(Array.isArray(assignable) ? assignable : []);
    } catch (requestError) {
      throw new Error(formatScopedError(requestError, "Failed to refresh the selected team."));
    }
  }

  function openCreateEditor() {
    setTeamForm(createTeamDraft(scopedCompanyId));
    setEditorMode("create");
    setEditorOpen(true);
  }

  function openEditEditor() {
    if (!selectedTeam) {
      return;
    }

    setTeamForm(teamDraftFromRecord(selectedTeam, scopedCompanyId));
    setEditorMode("edit");
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setTeamForm(createTeamDraft(scopedCompanyId));
  }

  useEffect(() => {
    let ignore = false;

    async function bootstrap() {
      const activeSession = loadSession();
      if (!activeSession) {
        router.replace("/login");
        return;
      }

      if (!ALLOWED_ROLES.includes(activeSession.user?.role)) {
        router.replace("/dashboard");
        return;
      }

      setSession(activeSession);

      try {
        if (isPlatformConsoleRole(activeSession.user?.role)) {
          const companyResponse = await apiRequest("/companies?page_size=120", { token: activeSession.token });
          if (ignore) {
            return;
          }

          const nextCompanies = companyResponse.items || [];
          const nextCompanyId =
            activeSession.company?.company_id ||
            activeSession.user?.company_id ||
            nextCompanies[0]?.company_id ||
            "";

          setCompanies(nextCompanies);
          setSelectedCompanyId(nextCompanyId);
          setTeamForm(createTeamDraft(nextCompanyId));
        } else {
          const currentCompany = activeSession.company
            ? [
                {
                  company_id: activeSession.company.company_id || activeSession.user?.company_id,
                  name: activeSession.company.name,
                  slug: activeSession.company.slug,
                  admin_email: activeSession.company.admin_email,
                  status: activeSession.company.status,
                },
              ]
            : [];
          const nextCompanyId =
            activeSession.company?.company_id || activeSession.user?.company_id || "";

          setCompanies(currentCompany);
          setSelectedCompanyId(nextCompanyId);
          setTeamForm(createTeamDraft(nextCompanyId));
        }
      } catch (requestError) {
        if (!ignore) {
          setLoading(false);
          setError(formatScopedError(requestError, "Failed to load workspace companies."));
        }
      }
    }

    bootstrap();

    return () => {
      ignore = true;
    };
  }, [router]);

  useEffect(() => {
    if (!session) {
      return;
    }

    refreshWorkspace(session, scopedCompanyId, selectedTeamId);
  }, [scopedCompanyId, session]);

  useEffect(() => {
    let ignore = false;

    async function loadTeamDetail() {
      if (!session?.token || !scopedCompanyId || !selectedTeamId) {
        setTeamDetail(null);
        setDetailLoading(false);
        return;
      }

      setDetailLoading(true);

      try {
        const response = await apiRequest(buildTeamPath(selectedTeamId, scopedCompanyId), {
          token: session.token,
        });

        if (!ignore) {
          setTeamDetail(response);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(formatScopedError(requestError, "Failed to load team details."));
        }
      } finally {
        if (!ignore) {
          setDetailLoading(false);
        }
      }
    }

    loadTeamDetail();

    return () => {
      ignore = true;
    };
  }, [scopedCompanyId, selectedTeamId, session]);

  useEffect(() => {
    let ignore = false;

    async function loadAssignableUsers() {
      if (!session?.token || !scopedCompanyId || !selectedTeamId) {
        setAssignableUsers([]);
        setAssignableLoading(false);
        return;
      }

      setAssignableLoading(true);

      try {
        const response = await apiRequest(buildAssignableUsersPath(selectedTeamId, scopedCompanyId), {
          token: session.token,
        });

        if (!ignore) {
          setAssignableUsers(Array.isArray(response) ? response : []);
        }
      } catch (requestError) {
        if (!ignore) {
          setAssignableUsers([]);
          setError(formatScopedError(requestError, "Failed to load users available for this team."));
        }
      } finally {
        if (!ignore) {
          setAssignableLoading(false);
        }
      }
    }

    loadAssignableUsers();

    return () => {
      ignore = true;
    };
  }, [scopedCompanyId, selectedTeamId, session]);

  async function saveTeam(event) {
    event.preventDefault();

    if (!session?.token || !scopedCompanyId || savingTeam) {
      return;
    }

    if (!teamForm.name.trim()) {
      setError("Team name is required.");
      return;
    }

    setSavingTeam(true);
    setError("");
    setMessage("");

    try {
      if (editorMode === "create") {
        const response = await apiRequest("/teams", {
          method: "POST",
          token: session.token,
          body: {
            company_id: scopedCompanyId,
            name: teamForm.name.trim(),
            code: teamForm.code.trim() || undefined,
            description: teamForm.description.trim() || undefined,
            is_active: teamForm.is_active,
          },
        });

        await refreshWorkspace(session, scopedCompanyId, response.team_id);
        setMessage("Team created. Add members and managers from the team detail panel.");
      } else if (selectedTeamId) {
        await apiRequest(`/teams/${selectedTeamId}`, {
          method: "PUT",
          token: session.token,
          body: {
            company_id: scopedCompanyId,
            name: teamForm.name.trim(),
            code: teamForm.code.trim() || undefined,
            description: teamForm.description.trim() || "",
            is_active: teamForm.is_active,
          },
        });

        await refreshWorkspace(session, scopedCompanyId, selectedTeamId);
        setMessage(
          teamForm.is_active
            ? "Team details updated."
            : "Team updated. Inactive teams drop out of active team lists after deactivation."
        );
      }

      closeEditor();
    } catch (requestError) {
      setError(formatScopedError(requestError, editorMode === "create" ? "Failed to create team." : "Failed to update team."));
    } finally {
      setSavingTeam(false);
    }
  }

  async function addMember(userId = memberCandidateId) {
    const resolvedUserId = normalizeActionUserId(userId, memberCandidateId);

    if (!session?.token || !selectedTeamId || !resolvedUserId) {
      return;
    }

    setWorkingKey("member:add");
    setError("");
    setMessage("");

    try {
      await apiRequest(`/teams/${selectedTeamId}/members`, {
        method: "POST",
        token: session.token,
        body: {
          company_id: scopedCompanyId,
          user_id: resolvedUserId,
        },
      });

      setMemberCandidateId("");
      await refreshSelectedTeamWorkspace(session, scopedCompanyId, selectedTeamId);
      setMessage("Member added to the selected team.");
    } catch (requestError) {
      setError(formatScopedError(requestError, "Failed to add team member."));
    } finally {
      setWorkingKey("");
    }
  }

  async function removeMember(userId) {
    if (!session?.token || !selectedTeamId || !userId) {
      return;
    }

    setWorkingKey(`member:${userId}`);
    setError("");
    setMessage("");

    try {
      await apiRequest(`/teams/${selectedTeamId}/members/${userId}?company_id=${scopedCompanyId}`, {
        method: "DELETE",
        token: session.token,
      });

      await refreshSelectedTeamWorkspace(session, scopedCompanyId, selectedTeamId);
      setMessage("Member removed from the selected team.");
    } catch (requestError) {
      setError(formatScopedError(requestError, "Failed to remove team member."));
    } finally {
      setWorkingKey("");
    }
  }

  async function addManager(userId = managerCandidateId) {
    const resolvedUserId = normalizeActionUserId(userId, managerCandidateId);

    if (!session?.token || !selectedTeamId || !resolvedUserId) {
      return;
    }

    setWorkingKey("manager:add");
    setError("");
    setMessage("");

    try {
      await apiRequest(`/teams/${selectedTeamId}/managers`, {
        method: "POST",
        token: session.token,
        body: {
          company_id: scopedCompanyId,
          user_id: resolvedUserId,
        },
      });

      setManagerCandidateId("");
      await refreshSelectedTeamWorkspace(session, scopedCompanyId, selectedTeamId);
      setMessage("Manager assigned. Managers are also added to the member roster automatically.");
    } catch (requestError) {
      setError(formatScopedError(requestError, "Failed to assign team manager."));
    } finally {
      setWorkingKey("");
    }
  }

  async function removeManager(userId) {
    if (!session?.token || !selectedTeamId || !userId) {
      return;
    }

    setWorkingKey(`manager:${userId}`);
    setError("");
    setMessage("");

    try {
      await apiRequest(`/teams/${selectedTeamId}/managers/${userId}?company_id=${scopedCompanyId}`, {
        method: "DELETE",
        token: session.token,
      });

      await refreshSelectedTeamWorkspace(session, scopedCompanyId, selectedTeamId);
      setMessage("Manager removed. Remove them from members too if they should leave the team entirely.");
    } catch (requestError) {
      setError(formatScopedError(requestError, "Failed to remove team manager."));
    } finally {
      setWorkingKey("");
    }
  }

  return (
    <DashboardShell session={session} title="Teams" hideTitle heroStats={[]}>
      <div className="mx-auto grid max-w-[1380px] gap-5">
        <AlertError message={error} onDismiss={() => setError("")} />
        <AlertSuccess message={message} onDismiss={() => setMessage("")} />

        <section className={HERO}>
          <div className="space-y-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl space-y-3">
                <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                  Team Workspace
                </span>
                <div>
                  <h2 className="text-[2rem] font-semibold tracking-tight text-[#060710] md:text-[2.2rem] md:leading-[1.08]">
                    Team Workspace
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-[#746853]">
                    Create teams, add members, and assign managers so leads, customers, and tasks stay scoped.
                  </p>
                </div>
              </div>

              <div className="w-full max-w-[460px] space-y-3">
                {isPlatformConsole ? (
                  <label className="space-y-2">
                    <span className={KICKER}>Company</span>
                    <select className={INPUT} value={selectedCompanyId} onChange={(event) => setSelectedCompanyId(event.target.value)}>
                      <option value="">Choose company</option>
                      {companies.map((company) => (
                        <option key={company.company_id} value={company.company_id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className={`${SOFT} bg-white/92`}>
                    <span className={KICKER}>Workspace</span>
                    <strong className="mt-3 block text-base text-[#060710]">{selectedCompany?.name || "Current company"}</strong>
                    <p className="mt-2 text-sm leading-6 text-[#746853]">
                      Team ownership here controls which people and products users see on the CRM side.
                    </p>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  {canOpenUserRoster ? (
                    <Link prefetch={false} href="/settings/users" className={`${GHOST} w-full`}>
                      <DashboardIcon name="users" className="h-4 w-4" />
                      Workspace Users
                    </Link>
                  ) : null}
                  {canCreateTeams ? (
                    <button className={`${PRIMARY} w-full`} type="button" onClick={openCreateEditor} disabled={!scopedCompanyId}>
                      <DashboardIcon name="settings" className="h-4 w-4" />
                      Create Team
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:items-stretch">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Active Teams", stats.teams, "users", "bg-[#fff0c8] text-[#8d6e27]"],
                  ["Members Linked", stats.members, "dashboard", "bg-[#fff7e8] text-[#8d6e27]"],
                  ["Managers Assigned", stats.managers, "analytics", "bg-[#f6efe2] text-[#5d503c]"],
                  ["Active Users", stats.users, "tasks", "bg-[#fff4d9] text-[#8d6e27]"],
                ].map(([label, value, icon, tint]) => (
                  <article key={label} className="rounded-[26px] border border-[#eadfcd] bg-white/90 p-4 shadow-[0_14px_30px_rgba(79,58,22,0.05)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className={KICKER}>{label}</p>
                        <h3 className="mt-2 text-[1.75rem] font-black leading-none text-slate-900">{value}</h3>
                      </div>
                      <div className={`grid h-12 w-12 place-items-center rounded-2xl ${tint}`}>
                        <DashboardIcon name={icon} className="h-5 w-5" />
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  {
                    title: "Create the team",
                    copy: "Set the team name, code, description, and active status before ownership starts showing up across the CRM.",
                  },
                  {
                    title: "Add members",
                    copy: "Members appear in owner dropdowns when leads, customers, tasks, and products are scoped to this team.",
                  },
                  {
                    title: "Assign managers",
                    copy: "Managers stay visible as the oversight layer for the team and can be tracked separately from the member roster.",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-[24px] border border-[#eadfcd] bg-white/82 px-4 py-4 shadow-[0_12px_28px_rgba(79,58,22,0.05)]">
                    <p className={KICKER}>How It Works</p>
                    <strong className="mt-3 block text-base text-[#060710]">{item.title}</strong>
                    <p className="mt-2 text-sm leading-6 text-[#746853]">{item.copy}</p>
                  </div>
                ))}
              </div>
            </div>

            {!canCreateTeams ? (
              <div className="rounded-[22px] border border-[#eadfcd] bg-white/84 px-4 py-4 text-sm leading-6 text-[#746853]">
                Create new teams from the tenant admin workspace. Platform operators can still review active teams and
                update existing membership here.
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)] xl:items-start">
          <div className="space-y-5">
            <article className={`${PANEL} xl:sticky xl:top-6`}>
              <div className="flex flex-col gap-4">
                <div>
                  <p className={KICKER}>Teams</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">
                    {selectedCompany?.name ? `${selectedCompany.name} teams` : "Active teams"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#746853]">
                    Only active teams appear here. Deactivated teams drop out of active ownership pickers.
                  </p>
                </div>
                <label className="space-y-2">
                  <span className={KICKER}>Search</span>
                  <input className={INPUT} value={teamQuery} onChange={(event) => setTeamQuery(event.target.value)} placeholder="Search team name or code" />
                </label>
              </div>

              <div className="mt-5 max-h-[calc(100vh-240px)] space-y-3 overflow-y-auto pr-1">
                {loading ? (
                  <div className="grid min-h-[240px] place-items-center rounded-[28px] border border-[#eadfcd] bg-[#fffaf1] px-6 text-sm text-[#7a6b57]">
                    Loading teams...
                  </div>
                ) : !scopedCompanyId ? (
                  <div className="grid min-h-[240px] place-items-center rounded-[28px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-6 text-center text-sm text-[#7a6b57]">
                    Choose a company to load its teams.
                  </div>
                ) : filteredTeams.length ? (
                  filteredTeams.map((team) => {
                    const active = selectedTeamId === team.team_id;

                    return (
                      <button
                        key={team.team_id}
                        type="button"
                        onClick={() => setSelectedTeamId(team.team_id)}
                        className={`w-full cursor-pointer rounded-[26px] border p-4 text-left transition ${
                          active
                            ? "border-[#d7b258] bg-[#fff8e9] shadow-[0_16px_32px_rgba(203,169,82,0.14)]"
                            : "border-[#eadfcd] bg-white/90 shadow-[0_10px_24px_rgba(79,58,22,0.05)] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(79,58,22,0.08)]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap gap-2">
                              <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fff6e4] px-3 py-1 text-[11px] font-bold text-[#7a6230]">
                                {team.code || "No code"}
                              </span>
                              <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                                Active
                              </span>
                            </div>
                            <h4 className="mt-3 text-lg font-semibold text-[#060710]">{team.name}</h4>
                            <p className="mt-2 text-sm leading-6 text-[#746853]">
                              {team.description || "No description added yet."}
                            </p>
                          </div>
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[#10111d] text-sm font-black text-white">
                            {initials(team.name)}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-[18px] border border-[#efe6d8] bg-[#fffaf1] px-3 py-3">
                            <p className={KICKER}>Members</p>
                            <p className="mt-2 text-sm font-semibold text-[#060710]">{team.member_count || 0}</p>
                          </div>
                          <div className="rounded-[18px] border border-[#efe6d8] bg-[#fffaf1] px-3 py-3">
                            <p className={KICKER}>Managers</p>
                            <p className="mt-2 text-sm font-semibold text-[#060710]">{team.manager_count || 0}</p>
                          </div>
                          <div className="rounded-[18px] border border-[#efe6d8] bg-[#fffaf1] px-3 py-3">
                            <p className={KICKER}>Created</p>
                            <p className="mt-2 text-sm font-semibold text-[#060710]">{when(team.created_at)}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : teams.length ? (
                  <div className="grid min-h-[240px] place-items-center rounded-[28px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-6 text-center text-sm text-[#7a6b57]">
                    No active teams matched the current search.
                  </div>
                ) : (
                  <div className="grid min-h-[280px] place-items-center rounded-[28px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-6 text-center">
                    <div className="max-w-md space-y-3">
                      <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                        Empty Workspace
                      </span>
                      <h4 className="text-2xl font-semibold tracking-tight text-[#060710]">No teams exist yet</h4>
                      <p className="text-sm leading-7 text-[#746853]">
                        Create the first team so ownership, members, and managers become explicit across lead and customer
                        flows.
                      </p>
                      {canCreateTeams ? (
                        <button className={PRIMARY} type="button" onClick={openCreateEditor}>
                          <DashboardIcon name="settings" className="h-4 w-4" />
                          Create First Team
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </article>

            {canOpenUserRoster && !users.length && scopedCompanyId ? (
              <article className={PANEL}>
                <div className="space-y-3">
                  <p className={KICKER}>Workspace Users</p>
                  <h3 className="text-2xl font-semibold tracking-tight text-[#060710]">Add users before you build team ownership</h3>
                  <p className="text-sm leading-7 text-[#746853]">
                    Teams only become useful after active users exist in the workspace. Create user accounts first, then
                    attach them as members or managers here.
                  </p>
                  {canOpenUserRoster ? (
                    <Link prefetch={false} href="/settings/users" className={PRIMARY}>
                      <DashboardIcon name="users" className="h-4 w-4" />
                      Open Workspace Users
                    </Link>
                  ) : null}
                </div>
              </article>
            ) : null}
          </div>

          <div className="space-y-5">
            <article className={PANEL}>
              {selectedTeam ? (
                <div className="space-y-7">
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)] xl:items-stretch">
                    <div className="max-w-3xl space-y-3">
                      <p className={KICKER}>Selected Team</p>
                      <h3 className="text-[2rem] font-semibold tracking-tight text-[#060710]">{selectedTeam.name}</h3>
                      <p className="text-sm leading-7 text-[#746853]">
                        {selectedTeam.description || "No team description has been added yet."}
                      </p>
                      <p className="text-sm leading-6 text-[#8b7a62]">
                        This team controls who can appear in team-scoped owner pickers and which managers remain visible as
                        the oversight layer.
                      </p>
                    </div>
                    <div className="flex h-full flex-col justify-between rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4 shadow-[0_12px_28px_rgba(79,58,22,0.05)]">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fff6e4] px-3 py-1 text-[11px] font-bold text-[#7a6230]">
                            {selectedTeam.code || "No code"}
                          </span>
                          <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                            {selectedTeam.is_active === false ? "Inactive" : "Active"}
                          </span>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-[#746853]">
                          Update the team identity here, then manage managers and members in the sections below.
                        </p>
                      </div>
                      <button className={`${GHOST} mt-5 w-full`} type="button" onClick={openEditEditor}>
                        <DashboardIcon name="settings" className="h-4 w-4" />
                        Edit Team
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                    <div className={SOFT}>
                      <span className={KICKER}>Team Code</span>
                      <strong className="mt-3 block text-base text-[#060710]">{selectedTeam.code || "Auto generated"}</strong>
                    </div>
                    <div className={SOFT}>
                      <span className={KICKER}>Members</span>
                      <strong className="mt-3 block text-base text-[#060710]">{selectedTeam.member_count || teamMembers.length || 0}</strong>
                    </div>
                    <div className={SOFT}>
                      <span className={KICKER}>Managers</span>
                      <strong className="mt-3 block text-base text-[#060710]">{selectedTeam.manager_count || teamManagers.length || 0}</strong>
                    </div>
                    <div className={SOFT}>
                      <span className={KICKER}>Created</span>
                      <strong className="mt-3 block text-base text-[#060710]">{when(selectedTeam.created_at)}</strong>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                    <div className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-5 py-5">
                      <p className={KICKER}>Record Ownership</p>
                      <p className="mt-3 text-sm leading-7 text-[#746853]">
                        Members from this team appear in owner dropdowns and define who can take ownership of team-scoped
                        CRM records.
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-5 py-5">
                      <p className={KICKER}>Management Layer</p>
                      <p className="mt-3 text-sm leading-7 text-[#746853]">
                        Managers stay visible as the leadership layer for this team, while the member roster keeps
                        day-to-day ownership clear.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 xl:min-h-[240px] xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center">
                  <div className="max-w-2xl space-y-4">
                    <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                      Team Details
                    </span>
                    <h3 className="text-[2rem] font-semibold leading-[1.08] tracking-tight text-[#060710]">
                      Select a team to manage members, managers, and ownership visibility
                    </h3>
                    <p className="text-sm leading-7 text-[#746853]">
                      Once a team is selected, this panel shows who belongs to it, who manages it, and what changes users
                      will feel in team-scoped CRM flows.
                    </p>
                  </div>
                  <div className="grid gap-3">
                    <div className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                      <p className={KICKER}>1. Choose A Team</p>
                      <p className="mt-3 text-sm leading-6 text-[#746853]">
                        Use the team list on the left to load the right-side management panels.
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                      <p className={KICKER}>2. Manage People</p>
                      <p className="mt-3 text-sm leading-6 text-[#746853]">
                        Then add members, assign managers, and confirm the ownership structure before CRM records move.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </article>

            {selectedTeam ? (
              <>
                <article className={`${PANEL} overflow-hidden`}>
                  <div className="space-y-6">
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-end">
                      <div>
                        <p className={KICKER}>Team People</p>
                        <h3 className="mt-2 text-[2rem] font-semibold tracking-tight text-[#060710]">Manage members and managers in one workspace</h3>
                        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#746853]">
                          This layout keeps the team roster stable even when the page zoom changes. Add, remove, search, and promote people from one clean rectangle instead of scattered panels.
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        <div className={SOFT}>
                          <span className={KICKER}>Current Members</span>
                          <strong className="mt-3 block text-base text-[#060710]">{teamMembers.length}</strong>
                        </div>
                        <div className={SOFT}>
                          <span className={KICKER}>Current Managers</span>
                          <strong className="mt-3 block text-base text-[#060710]">{teamManagers.length}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5">
                <section className="rounded-[28px] border border-[#eadfcd] bg-[#fffaf1] p-5 shadow-[0_10px_24px_rgba(79,58,22,0.04)]">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.92fr)] xl:items-end">
                    <div>
                      <p className={KICKER}>Managers</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Who manages this team</h3>
                      <p className="mt-2 text-sm leading-6 text-[#746853]">
                        Managers can oversee the team. Adding one also adds them to the member roster automatically.
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4">
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_132px]">
                        <select className={INPUT} value={managerCandidateId} onChange={(event) => setManagerCandidateId(event.target.value)} disabled={!availableManagers.length || detailLoading}>
                          <option value="">{availableManagers.length ? "Choose manager" : "No manager-capable users available"}</option>
                          {availableManagers.map((user) => (
                            <option key={user.user_id} value={user.user_id}>
                              {user.name} | {prettyRole(user.role)}
                            </option>
                          ))}
                        </select>
                        <button className={`${PRIMARY} w-full`} type="button" onClick={() => addManager()} disabled={!managerCandidateId || workingKey === "manager:add"}>
                          <DashboardIcon name="users" className="h-4 w-4" />
                          {workingKey === "manager:add" ? "Assigning..." : "Assign"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex-1 space-y-3">
                    {detailLoading && !teamManagers.length ? (
                      <div className="grid min-h-[180px] place-items-center rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4 text-sm text-[#7a6b57]">
                        Loading team managers...
                      </div>
                    ) : teamManagers.length ? (
                      teamManagers.map((manager) => (
                        <div key={manager.user_id} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4 shadow-[0_10px_24px_rgba(79,58,22,0.04)]">
                          <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[minmax(0,1fr)_156px] sm:items-start">
                            <div className="flex min-w-0 items-start gap-4">
                              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[#10111d] text-sm font-black text-white">
                                {initials(manager.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap gap-2">
                                  <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                                    {prettyRole(manager.role)}
                                  </span>
                                  <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fff6e4] px-3 py-1 text-[11px] font-bold text-[#7a6230]">
                                    Manager
                                  </span>
                                </div>
                                <strong className="mt-3 block text-base text-[#060710]">{manager.name}</strong>
                                <span className="mt-1 block text-sm text-[#746853]">{manager.email}</span>
                                <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm text-[#7a6b57]">
                                  <div>
                                    <p className={KICKER}>Department</p>
                                    <p className="mt-2 font-semibold text-[#060710]">{manager.department || "Not set"}</p>
                                  </div>
                                  <div>
                                    <p className={KICKER}>Phone</p>
                                    <p className="mt-2 font-semibold text-[#060710]">{manager.phone || "Not set"}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <button className={`${DANGER} w-full`} type="button" disabled={workingKey === `manager:${manager.user_id}`} onClick={() => removeManager(manager.user_id)}>
                              {workingKey === `manager:${manager.user_id}` ? "Removing..." : "Remove Manager"}
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="grid min-h-[220px] place-items-center rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-4 py-6 text-center text-sm leading-6 text-[#746853]">
                        No managers are assigned yet. Add at least one manager so users understand who owns team execution.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-[28px] border border-[#eadfcd] bg-[#fffaf1] p-5 shadow-[0_10px_24px_rgba(79,58,22,0.04)]">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.96fr)] xl:items-start">
                    <div>
                      <p className={KICKER}>Members</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Who belongs to this team</h3>
                      <p className="mt-2 text-sm leading-6 text-[#746853]">
                        Current team members appear first in the roster below. Add, remove, or search people from the same panel instead of managing two separate sections.
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#8b7a62]">{assignmentHelperCopy}</p>
                    </div>
                    <div className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4">
                      <div className="grid gap-3">
                        <label className="space-y-2">
                          <span className={KICKER}>Quick Add Member</span>
                          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_132px]">
                            <select className={INPUT} value={memberCandidateId} onChange={(event) => setMemberCandidateId(event.target.value)} disabled={!availableMembers.length || detailLoading}>
                              <option value="">{availableMembers.length ? "Choose member" : "No additional active users available"}</option>
                              {availableMembers.map((user) => (
                                <option key={user.user_id} value={user.user_id}>
                                  {user.name} | {prettyRole(user.role)}
                                </option>
                              ))}
                            </select>
                            <button className={`${PRIMARY} w-full`} type="button" onClick={() => addMember()} disabled={!memberCandidateId || workingKey === "member:add"}>
                              <DashboardIcon name="users" className="h-4 w-4" />
                              {workingKey === "member:add" ? "Adding..." : "Add"}
                            </button>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <div className={SOFT}>
                      <span className={KICKER}>Current Members</span>
                      <strong className="mt-3 block text-base text-[#060710]">{teamMembers.length}</strong>
                    </div>
                    <div className={SOFT}>
                      <span className={KICKER}>Roster Results</span>
                      <strong className="mt-3 block text-base text-[#060710]">{filteredAssignmentUsers.length}</strong>
                    </div>
                    <div className={SOFT}>
                      <span className={KICKER}>Ready To Add</span>
                      <strong className="mt-3 block text-base text-[#060710]">{availableMembers.length}</strong>
                    </div>
                    <div className={SOFT}>
                      <span className={KICKER}>Can Lead Team</span>
                      <strong className="mt-3 block text-base text-[#060710]">{availableManagers.length}</strong>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className={KICKER}>Search User</span>
                        <input
                          className={INPUT}
                          value={assignmentQuery}
                          onChange={(event) => setAssignmentQuery(event.target.value)}
                          placeholder="Search name, email, role, or user ID"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className={KICKER}>Role Filter</span>
                        <select className={INPUT} value={assignmentRoleFilter} onChange={(event) => setAssignmentRoleFilter(event.target.value)}>
                          {ASSIGNABLE_ROLE_FILTERS.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="mt-5 flex-1 space-y-3">
                    {assignableLoading ? (
                      <div className="grid min-h-[220px] place-items-center rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4 text-sm text-[#7a6b57]">
                        Loading team roster...
                      </div>
                    ) : filteredAssignmentUsers.length ? (
                      filteredAssignmentUsers.map((user) => {
                        const isMember = teamMembers.some((member) => member.user_id === user.user_id);
                        const isManager = teamManagers.some((manager) => manager.user_id === user.user_id);
                        const teamMember = teamMembers.find((member) => member.user_id === user.user_id) || null;
                        const canPromoteToManager = MANAGER_CAPABLE_ROLES.has(user.role) && !isManager;

                        return (
                          <div key={user.user_id} className="rounded-[26px] border border-[#eadfcd] bg-[#fffaf1] p-5 shadow-[0_12px_28px_rgba(79,58,22,0.04)] transition hover:border-[#e3cfab]">
                            <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:items-center xl:gap-6">
                              <div className="min-w-0">
                                <div className="flex flex-wrap gap-2">
                                  <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                                    {prettyRole(user.role)}
                                  </span>
                                  <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fff6e4] px-3 py-1 text-[11px] font-bold text-[#7a6230]">
                                    {user.user_id}
                                  </span>
                                  {isMember ? (
                                    <span className="inline-flex rounded-full border border-[#dce8cf] bg-[#eff9e9] px-3 py-1 text-[11px] font-bold text-[#2a7f43]">
                                      {teamMember?.is_primary ? "Primary member" : "Team member"}
                                    </span>
                                  ) : null}
                                  {isManager ? (
                                    <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                                      Manager
                                    </span>
                                  ) : null}
                                </div>
                                <strong className="mt-3 block text-base text-[#060710]">{user.name}</strong>
                                <span className="mt-1 block text-sm text-[#746853]">{user.email}</span>
                                <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm text-[#7a6b57]">
                                  <div>
                                    <p className={KICKER}>Department</p>
                                    <p className="mt-2 font-semibold text-[#060710]">{user.department || "Not set"}</p>
                                  </div>
                                  <div>
                                    <p className={KICKER}>Phone</p>
                                    <p className="mt-2 font-semibold text-[#060710]">{user.phone || "Not set"}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[360px] xl:justify-self-end">
                                {isMember ? (
                                  <button
                                    className={`${DANGER} w-full`}
                                    type="button"
                                    onClick={() => removeMember(user.user_id)}
                                    disabled={workingKey === `member:${user.user_id}`}
                                  >
                                    <DashboardIcon name="users" className="h-4 w-4" />
                                    {workingKey === `member:${user.user_id}` ? "Removing..." : "Remove Member"}
                                  </button>
                                ) : (
                                  <button
                                    className={`${GHOST} w-full`}
                                    type="button"
                                    onClick={() => addMember(user.user_id)}
                                    disabled={workingKey === "member:add"}
                                  >
                                    <DashboardIcon name="users" className="h-4 w-4" />
                                    {workingKey === "member:add" ? "Adding..." : "Add To Team"}
                                  </button>
                                )}
                                <button
                                  className={`${PRIMARY} w-full`}
                                  type="button"
                                  onClick={() => addManager(user.user_id)}
                                  disabled={!canPromoteToManager || workingKey === "manager:add"}
                                >
                                  <DashboardIcon name="analytics" className="h-4 w-4" />
                                  {isManager ? "Manager" : workingKey === "manager:add" ? "Assigning..." : canPromoteToManager ? "Make Manager" : "Manager Role Needed"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="grid min-h-[220px] place-items-center rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-4 py-6 text-center text-sm leading-6 text-[#746853]">
                        No users matched the current filter. Create the user first, then return here to place them in this team.
                      </div>
                    )}
                  </div>
                </section>
                </div>
                  </div>
                </article>
              </>
            ) : null}
          </div>
        </section>
      </div>
      {editorOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-[#060710]/45 backdrop-blur-sm" onClick={closeEditor} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto border-l border-[#eadfcd] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(249,242,229,0.98))] p-6 shadow-[-20px_0_60px_rgba(79,58,22,0.16)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                  {editorMode === "create" ? "Create Team" : "Edit Team"}
                </span>
                <h3 className="mt-4 text-[2rem] font-semibold tracking-tight text-[#060710]">
                  {editorMode === "create" ? "Set up the team identity first" : "Update the selected team"}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#746853]">
                  {editorMode === "create"
                    ? "Save the basic team details first. Then use the team detail panel to add members and assign managers."
                    : "Update the team name, code, description, and active status without leaving the workspace."}
                </p>
              </div>
              <button className="grid h-11 w-11 cursor-pointer place-items-center rounded-2xl border border-[#eadfcd] bg-white text-[#6d604b]" type="button" onClick={closeEditor}>
                <span className="relative block h-4 w-4">
                  <span className="absolute left-0 top-1/2 block h-0.5 w-4 -translate-y-1/2 rotate-45 rounded-full bg-current" />
                  <span className="absolute left-0 top-1/2 block h-0.5 w-4 -translate-y-1/2 -rotate-45 rounded-full bg-current" />
                </span>
              </button>
            </div>

            <form className="mt-8 grid gap-4" onSubmit={saveTeam}>
              <label className="space-y-2">
                <span className={KICKER}>Team Name</span>
                <input className={INPUT} value={teamForm.name} onChange={(event) => setTeamForm((current) => ({ ...current, name: event.target.value }))} placeholder="North Sales" required />
              </label>

              <label className="space-y-2">
                <span className={KICKER}>Team Code</span>
                <input
                  className={INPUT}
                  value={teamForm.code}
                  onChange={(event) =>
                    setTeamForm((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase().replace(/\s+/g, "_"),
                    }))
                  }
                  placeholder="Optional"
                />
                <small className="text-xs font-semibold text-[#8f816a]">
                  Leave blank to auto-generate the code from the team name.
                </small>
              </label>

              <label className="space-y-2">
                <span className={KICKER}>Description</span>
                <textarea className={`${INPUT} min-h-[150px] resize-y`} rows="5" value={teamForm.description} onChange={(event) => setTeamForm((current) => ({ ...current, description: event.target.value }))} placeholder="What does this team own, and how should users think about it?" />
              </label>

              <label className="flex items-start gap-3 rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                <input type="checkbox" className="mt-1 h-4 w-4 rounded border-[#d7b258]" checked={teamForm.is_active} onChange={(event) => setTeamForm((current) => ({ ...current, is_active: event.target.checked }))} />
                <span>
                  <strong className="block text-sm text-[#060710]">Active team</strong>
                  <span className="mt-1 block text-sm leading-6 text-[#746853]">
                    Active teams appear in record ownership pickers. Inactive teams drop out of active CRM team lists.
                  </span>
                </span>
              </label>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button className={GHOST} type="button" onClick={closeEditor}>
                  Cancel
                </button>
                <button className={PRIMARY} type="submit" disabled={savingTeam}>
                  <DashboardIcon name="settings" className="h-4 w-4" />
                  {savingTeam ? (editorMode === "create" ? "Creating..." : "Saving...") : editorMode === "create" ? "Create Team" : "Save Team"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </DashboardShell>
  );
}
