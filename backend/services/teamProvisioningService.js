const teamRepository = require("../repositories/teamRepository");
const { createPrefixedId } = require("../utils/ids");

function normalizeIdList(values) {
  return [...new Set((Array.isArray(values) ? values : [values]).map((value) => String(value || "").trim()).filter(Boolean))];
}

async function ensureInitialCompanyTeam(
  {
    companyId,
    actorUserId = null,
    teamName = "Core Team",
    teamCode = "CORE",
    description = "Initial company team",
    managerUserIds = [],
    memberUserIds = [],
  },
  executor
) {
  if (!companyId) {
    return null;
  }

  const existingTeam = await teamRepository.getTeamByCode(companyId, teamCode, executor);
  if (existingTeam) {
    return existingTeam;
  }

  const activeTeamCount = await teamRepository.countActiveTeams(companyId, executor);
  if (activeTeamCount > 0) {
    const firstTeamId = await teamRepository.getFirstActiveTeamId(companyId, executor);
    return firstTeamId ? teamRepository.getTeamById(firstTeamId, companyId, executor) : null;
  }

  const distinctManagerIds = normalizeIdList(managerUserIds);
  const distinctMemberIds = normalizeIdList([...memberUserIds, ...distinctManagerIds]);
  const primaryUserId = distinctMemberIds[0] || null;

  const team = await teamRepository.createTeam(
    {
      team_id: await createPrefixedId("tem"),
      company_id: companyId,
      name: teamName,
      code: teamCode,
      description,
      created_by: actorUserId,
      is_active: true,
    },
    executor
  );

  for (const managerUserId of distinctManagerIds) {
    await teamRepository.addTeamManager(
      {
        company_id: companyId,
        team_id: team.team_id,
        user_id: managerUserId,
        added_by: actorUserId,
      },
      executor
    );
  }

  for (const memberUserId of distinctMemberIds) {
    await teamRepository.addTeamMember(
      {
        company_id: companyId,
        team_id: team.team_id,
        user_id: memberUserId,
        membership_role: distinctManagerIds.includes(memberUserId) ? "lead" : "member",
        is_primary: memberUserId === primaryUserId,
        added_by: actorUserId,
      },
      executor
    );
  }

  return team;
}

module.exports = {
  ensureInitialCompanyTeam,
};
