const teamRepository = require("../repositories/teamRepository");
const { ROLES } = require("../constants/roles");
const AppError = require("../utils/appError");
const { assertCompanyAccess, getAccessibleCompanyIds, isPlatformOperatorRole } = require("../utils/tenant");

function normalizeIdList(values) {
  return [...new Set((Array.isArray(values) ? values : [values]).map((value) => String(value || "").trim()).filter(Boolean))];
}

function parseRequestedTeamIds(source = {}) {
  const candidates = [];

  if (source.team_id !== undefined) {
    candidates.push(source.team_id);
  }

  if (source.teamId !== undefined) {
    candidates.push(source.teamId);
  }

  if (source.team_ids !== undefined) {
    candidates.push(...(Array.isArray(source.team_ids) ? source.team_ids : String(source.team_ids).split(",")));
  }

  if (source.teamIds !== undefined) {
    candidates.push(...(Array.isArray(source.teamIds) ? source.teamIds : String(source.teamIds).split(",")));
  }

  return normalizeIdList(candidates);
}

function buildScopeCacheKey(companyId, includeManaged, includeMembership) {
  return `${companyId || "all"}:${includeManaged ? "managed" : "no-managed"}:${includeMembership ? "member" : "no-member"}`;
}

function isCompanyWideRole(role) {
  return [ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_MANAGER, ROLES.ADMIN].includes(role);
}

async function getAccessibleTeamIds(
  auth,
  companyId,
  { includeManaged = true, includeMembership = true, allowFallbackWithoutTeams = true } = {}
) {
  if (!companyId || isCompanyWideRole(auth.role)) {
    return null;
  }

  if (!auth.__teamScopeCache) {
    auth.__teamScopeCache = new Map();
  }

  const cacheKey = buildScopeCacheKey(companyId, includeManaged, includeMembership);
  if (auth.__teamScopeCache.has(cacheKey)) {
    return auth.__teamScopeCache.get(cacheKey);
  }

  const activeTeamCount = await teamRepository.countActiveTeams(companyId);
  if (!activeTeamCount && allowFallbackWithoutTeams) {
    auth.__teamScopeCache.set(cacheKey, null);
    return null;
  }

  const teamIds = await teamRepository.listAccessibleTeamIds(
    {
      companyId,
      userId: auth.userId,
      includeManaged,
      includeMembership,
    }
  );

  auth.__teamScopeCache.set(cacheKey, teamIds);
  return teamIds;
}

async function getActiveTeamCount(companyId) {
  if (!companyId) {
    return 0;
  }

  return teamRepository.countActiveTeams(companyId);
}

async function resolveTeamScope(auth, companyId, requestedTeamIds = [], options = {}) {
  const normalizedRequested = normalizeIdList(requestedTeamIds);

  if (companyId) {
    assertCompanyAccess(auth, companyId);
  }

  if (!companyId && auth.role === ROLES.SUPER_ADMIN) {
    return {
      teamIds: normalizedRequested.length ? normalizedRequested : null,
      unrestricted: true,
    };
  }

  if (!companyId && isPlatformOperatorRole(auth.role)) {
    if (!normalizedRequested.length) {
      return {
        teamIds: null,
        unrestricted: true,
      };
    }

    const validRequested = await teamRepository.listValidTeamIdsAcrossCompanies(
      getAccessibleCompanyIds(auth),
      normalizedRequested
    );

    if (!validRequested.length) {
      throw new AppError("You cannot access the requested team scope.", 403);
    }

    return {
      teamIds: validRequested,
      unrestricted: false,
    };
  }

  const accessibleTeamIds = await getAccessibleTeamIds(auth, companyId, options);

  if (accessibleTeamIds === null) {
    if (!normalizedRequested.length) {
      return {
        teamIds: null,
        unrestricted: true,
      };
    }

    const validRequested = companyId
      ? await teamRepository.listValidTeamIds(companyId, normalizedRequested)
      : normalizedRequested;

    return {
      teamIds: validRequested,
      unrestricted: true,
    };
  }

  if (!normalizedRequested.length) {
    return {
      teamIds: accessibleTeamIds,
      unrestricted: false,
    };
  }

  const allowed = normalizedRequested.filter((teamId) => accessibleTeamIds.includes(teamId));
  if (!allowed.length) {
    throw new AppError("You cannot access the requested team scope.", 403);
  }

  return {
    teamIds: allowed,
    unrestricted: false,
  };
}

async function assertRecordTeamAccess(auth, record, options = {}) {
  if (!record) {
    throw new AppError("Record not found.", 404);
  }

  assertCompanyAccess(auth, record.company_id);

  const scope = await resolveTeamScope(
    auth,
    record.company_id,
    [],
    options
  );

  if (!scope.teamIds) {
    return record;
  }

  if (!record.team_id || !scope.teamIds.includes(record.team_id)) {
    throw new AppError("You cannot access records outside your allowed teams.", 403);
  }

  return record;
}

async function assertTeamAccess(auth, companyId, teamId, options = {}) {
  const scope = await resolveTeamScope(auth, companyId, [teamId], options);
  if (scope.teamIds && !scope.teamIds.includes(teamId)) {
    throw new AppError("You cannot access this team.", 403);
  }
}

async function ensureUserBelongsToTeam(companyId, userId, teamId, label = "User") {
  if (!companyId || !userId || !teamId) {
    return;
  }

  const teamUserIds = await teamRepository.listUsersForTeams(companyId, [teamId]);
  if (!teamUserIds.includes(userId)) {
    throw new AppError(`${label} must belong to the selected team.`, 400);
  }
}

async function ensureTeamIdWhenTeamsConfigured(companyId, teamId) {
  if (teamId) {
    return teamId;
  }

  const activeTeamCount = await getActiveTeamCount(companyId);
  if (activeTeamCount > 0) {
    throw new AppError("team_id is required once teams are configured for this company.", 400);
  }

  return null;
}

async function resolvePreferredTeamId(companyId, userId) {
  if (!companyId || !userId) {
    return null;
  }

  return teamRepository.getPreferredTeamId(companyId, userId);
}

async function resolveDefaultTeamId(companyId) {
  if (!companyId) {
    return null;
  }

  const total = await teamRepository.countActiveTeams(companyId);
  if (total === 1) {
    return teamRepository.getFirstActiveTeamId(companyId);
  }

  return null;
}

module.exports = {
  assertRecordTeamAccess,
  assertTeamAccess,
  ensureTeamIdWhenTeamsConfigured,
  ensureUserBelongsToTeam,
  getActiveTeamCount,
  getAccessibleTeamIds,
  isCompanyWideRole,
  normalizeIdList,
  parseRequestedTeamIds,
  resolveDefaultTeamId,
  resolvePreferredTeamId,
  resolveTeamScope,
};
