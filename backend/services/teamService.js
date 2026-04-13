const db = require("../db/connection");
const teamRepository = require("../repositories/teamRepository");
const userRepository = require("../repositories/userRepository");
const auditRepository = require("../repositories/auditRepository");
const companyRepository = require("../repositories/companyRepository");
const { ROLES, MANAGER_ROLES } = require("../constants/roles");
const { createPrefixedId, slugify } = require("../utils/ids");
const { buildPaginatedResult, parsePagination } = require("../utils/pagination");
const AppError = require("../utils/appError");
const { assertCompanyAccess, getAccessibleCompanyIds, isPlatformOperatorRole } = require("../utils/tenant");
const { assertTeamAccess, isCompanyWideRole, parseRequestedTeamIds, resolveTeamScope } = require("./accessScopeService");

function normalizeText(value) {
  return String(value || "").trim();
}

function resolveCompanyId(auth, payloadCompanyId = null) {
  if (auth.role === ROLES.SUPER_ADMIN || isPlatformOperatorRole(auth.role)) {
    return payloadCompanyId || null;
  }

  return auth.companyId;
}

async function ensureManagePermission(auth, companyId, teamId = null) {
  if (![ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_MANAGER, ROLES.ADMIN, ROLES.MANAGER].includes(auth.role)) {
    throw new AppError("Your role cannot manage teams.", 403);
  }

  assertCompanyAccess(auth, companyId);

  if (teamId && auth.role === ROLES.MANAGER) {
    await assertTeamAccess(auth, companyId, teamId, {
      includeManaged: true,
      includeMembership: false,
    });
  }
}

async function listTeams(auth, query) {
  const pagination = parsePagination(query);
  const companyId = resolveCompanyId(auth, query.company_id || null);
  const companyIds =
    !companyId && isPlatformOperatorRole(auth.role)
      ? getAccessibleCompanyIds(auth)
      : null;

  if (companyId) {
    assertCompanyAccess(auth, companyId);
  }

  const requestedTeamIds = parseRequestedTeamIds(query);
  const { teamIds } = await resolveTeamScope(auth, companyId, requestedTeamIds, {
    includeManaged: true,
    includeMembership: true,
  });

  const { rows, total } = await teamRepository.listTeams(
    {
      companyId,
      companyIds,
      teamIds,
      search: query.search || "",
    },
    pagination
  );

  return buildPaginatedResult(rows, total, pagination);
}

async function getTeam(auth, teamId, query = {}) {
  const companyId = resolveCompanyId(auth, query.company_id || null);
  const team = await teamRepository.getTeamById(teamId, companyId);
  if (!team) {
    throw new AppError("Team not found.", 404);
  }

  await assertTeamAccess(auth, team.company_id, team.team_id, {
    includeManaged: true,
    includeMembership: true,
  });

  const [members, managers] = await Promise.all([
    teamRepository.listTeamMembers(team.team_id, team.company_id),
    teamRepository.listTeamManagers(team.team_id, team.company_id),
  ]);

  return {
    ...team,
    members,
    managers,
  };
}

async function listAssignableUsers(auth, teamId, query = {}) {
  const team = await getTeam(auth, teamId, { company_id: query.company_id || null });
  await ensureManagePermission(auth, team.company_id, team.team_id);

  return userRepository.listActiveUsersInCompany(team.company_id, {
    search: query.search || "",
  });
}

async function createTeam(auth, payload) {
  const companyId = resolveCompanyId(auth, payload.company_id || null);
  if (!companyId) {
    throw new AppError("A company is required.", 400);
  }

  await ensureManagePermission(auth, companyId);
  const company = await companyRepository.getCompanyById(companyId);
  if (!company) {
    throw new AppError("Company not found.", 404);
  }

  const name = normalizeText(payload.name);
  if (!name) {
    throw new AppError("Team name is required.", 400);
  }

  const code = normalizeText(payload.code || slugify(name).toUpperCase().replace(/-/g, "_")).slice(0, 40);
  const existingCode = await teamRepository.getTeamByCode(companyId, code);
  if (existingCode) {
    throw new AppError("Team code already exists in this company.", 409);
  }

  const managerIds = auth.role === ROLES.MANAGER
    ? [auth.userId]
    : [auth.userId, ...parseRequestedTeamIds({ team_ids: payload.manager_ids || [] })];
  const memberIds = parseRequestedTeamIds({ team_ids: payload.member_ids || [] });

  const distinctManagerIds = [...new Set(managerIds.filter(Boolean))];
  const distinctMemberIds = [...new Set([...memberIds, ...distinctManagerIds])];

  const users = await Promise.all(
    distinctMemberIds.map((userId) => userRepository.getUserInCompany(userId, companyId))
  );

  if (users.some((user) => !user || !user.is_active)) {
    throw new AppError("All team users must belong to the same active company.", 400);
  }

  const created = await db.withTransaction(async (transaction) => {
    const team = await teamRepository.createTeam(
      {
        team_id: await createPrefixedId("tem"),
        company_id: companyId,
        name,
        code,
        description: normalizeText(payload.description) || null,
        created_by: auth.userId,
      },
      transaction
    );

    for (const managerId of distinctManagerIds) {
      await teamRepository.addTeamManager(
        {
          company_id: companyId,
          team_id: team.team_id,
          user_id: managerId,
          added_by: auth.userId,
        },
        transaction
      );
    }

    let primaryAssigned = false;
    for (const memberId of distinctMemberIds) {
      const shouldBePrimary =
        !primaryAssigned &&
        (memberId === auth.userId || distinctMemberIds.length === 1 || payload.primary_user_id === memberId);

      await teamRepository.addTeamMember(
        {
          company_id: companyId,
          team_id: team.team_id,
          user_id: memberId,
          membership_role: memberId === auth.userId ? "lead" : "member",
          is_primary: shouldBePrimary,
          added_by: auth.userId,
        },
        transaction
      );

      if (shouldBePrimary) {
        primaryAssigned = true;
      }
    }

    await auditRepository.createLog(
      {
        audit_id: await createPrefixedId("aud"),
        company_id: companyId,
        action: "team.created",
        performed_by: auth.userId,
        user_email: auth.email,
        user_role: auth.role,
        details: {
          team_id: team.team_id,
          manager_ids: distinctManagerIds,
          member_ids: distinctMemberIds,
        },
      },
      transaction
    );

    return team;
  });

  return getTeam(auth, created.team_id, { company_id: companyId });
}

async function updateTeam(auth, teamId, payload) {
  const current = await getTeam(auth, teamId, { company_id: payload.company_id || null });
  await ensureManagePermission(auth, current.company_id, current.team_id);

  if (payload.code) {
    const existing = await teamRepository.getTeamByCode(current.company_id, normalizeText(payload.code));
    if (existing && existing.team_id !== current.team_id) {
      throw new AppError("Team code already exists in this company.", 409);
    }
  }

  const updated = await teamRepository.updateTeam(current.team_id, current.company_id, {
    name: payload.name !== undefined ? normalizeText(payload.name) : current.name,
    code: payload.code !== undefined ? normalizeText(payload.code) : current.code,
    description: payload.description !== undefined ? normalizeText(payload.description) : current.description,
    is_active: payload.is_active !== undefined ? Number(Boolean(payload.is_active)) : current.is_active,
  });

  return getTeam(auth, updated.team_id, { company_id: current.company_id });
}

async function addTeamMember(auth, teamId, payload) {
  const team = await getTeam(auth, teamId, { company_id: payload.company_id || null });
  await ensureManagePermission(auth, team.company_id, team.team_id);

  const userId = normalizeText(payload.user_id);
  if (!userId) {
    throw new AppError("user_id is required.", 400);
  }

  const user = await userRepository.getUserInCompany(userId, team.company_id);
  if (!user || !user.is_active) {
    throw new AppError("User must belong to the same active company.", 400);
  }

  await teamRepository.addTeamMember({
    company_id: team.company_id,
    team_id: team.team_id,
    user_id: user.user_id,
    membership_role: normalizeText(payload.membership_role) || "member",
    is_primary: payload.is_primary === true,
    added_by: auth.userId,
  });

  return getTeam(auth, team.team_id, { company_id: team.company_id });
}

async function removeTeamMember(auth, teamId, userId, query = {}) {
  const team = await getTeam(auth, teamId, { company_id: query.company_id || null });
  await ensureManagePermission(auth, team.company_id, team.team_id);
  await teamRepository.setTeamMemberActive(team.team_id, team.company_id, userId, false);
  return getTeam(auth, team.team_id, { company_id: team.company_id });
}

async function addTeamManager(auth, teamId, payload) {
  const team = await getTeam(auth, teamId, { company_id: payload.company_id || null });
  await ensureManagePermission(auth, team.company_id, team.team_id);

  const userId = normalizeText(payload.user_id);
  if (!userId) {
    throw new AppError("user_id is required.", 400);
  }

  const user = await userRepository.getUserInCompany(userId, team.company_id);
  if (!user || !user.is_active) {
    throw new AppError("User must belong to the same active company.", 400);
  }

  if (!MANAGER_ROLES.includes(user.role)) {
    throw new AppError("Only manager-capable roles can manage teams.", 400);
  }

  await teamRepository.addTeamManager({
    company_id: team.company_id,
    team_id: team.team_id,
    user_id: user.user_id,
    added_by: auth.userId,
  });

  await teamRepository.addTeamMember({
    company_id: team.company_id,
    team_id: team.team_id,
    user_id: user.user_id,
    membership_role: "lead",
    is_primary: false,
    added_by: auth.userId,
  });

  return getTeam(auth, team.team_id, { company_id: team.company_id });
}

async function removeTeamManager(auth, teamId, userId, query = {}) {
  const team = await getTeam(auth, teamId, { company_id: query.company_id || null });
  await ensureManagePermission(auth, team.company_id, team.team_id);
  await teamRepository.setTeamManagerActive(team.team_id, team.company_id, userId, false);
  return getTeam(auth, team.team_id, { company_id: team.company_id });
}

module.exports = {
  addTeamManager,
  addTeamMember,
  createTeam,
  getTeam,
  listAssignableUsers,
  listTeams,
  removeTeamManager,
  removeTeamMember,
  updateTeam,
};
