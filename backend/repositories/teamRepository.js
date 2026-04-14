const db = require("../db/connection");

function getExecutor(executor) {
  return executor || db;
}

function normalizeIdList(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean))];
}

async function countActiveTeams(companyId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    "SELECT COUNT(*) AS total FROM teams WHERE company_id = ? AND is_active = 1",
    [companyId]
  );
  return Number(rows[0]?.total || 0);
}

async function getFirstActiveTeamId(companyId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    "SELECT TOP 1 team_id FROM teams WHERE company_id = ? AND is_active = 1 ORDER BY created_at ASC, id ASC",
    [companyId]
  );
  return rows[0]?.team_id || null;
}

async function getTeamById(teamId, companyId = null, executor) {
  const active = getExecutor(executor);
  const conditions = ["t.team_id = ?"];
  const params = [teamId];

  if (companyId) {
    conditions.push("t.company_id = ?");
    params.push(companyId);
  }

  const [rows] = await active.query(
    `
      SELECT TOP 1
        t.*,
        creator.name AS created_by_name
      FROM teams t
      LEFT JOIN users creator ON creator.user_id = t.created_by
      WHERE ${conditions.join(" AND ")}
    `,
    params
  );

  return rows[0] || null;
}

async function getTeamByCode(companyId, code, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    "SELECT TOP 1 * FROM teams WHERE company_id = ? AND code = ?",
    [companyId, code]
  );
  return rows[0] || null;
}

async function listAccessibleTeamIds(
  { companyId, userId, includeManaged = true, includeMembership = true },
  executor
) {
  const active = getExecutor(executor);
  const selects = [];
  const params = [];

  if (includeManaged) {
    selects.push(`
      SELECT tm.team_id
      FROM team_managers tm
      INNER JOIN teams t ON t.team_id = tm.team_id AND t.company_id = tm.company_id
      WHERE tm.company_id = ?
        AND tm.user_id = ?
        AND tm.is_active = 1
        AND t.is_active = 1
    `);
    params.push(companyId, userId);
  }

  if (includeMembership) {
    selects.push(`
      SELECT mem.team_id
      FROM team_members mem
      INNER JOIN teams t ON t.team_id = mem.team_id AND t.company_id = mem.company_id
      WHERE mem.company_id = ?
        AND mem.user_id = ?
        AND mem.is_active = 1
        AND t.is_active = 1
    `);
    params.push(companyId, userId);
  }

  if (!selects.length) {
    return [];
  }

  const [rows] = await active.query(selects.join(" UNION "), params);
  return normalizeIdList(rows.map((row) => row.team_id));
}

async function getPreferredTeamId(companyId, userId, executor) {
  const active = getExecutor(executor);
  const [primaryRows] = await active.query(
    `
      SELECT TOP 1 team_id
      FROM team_members
      WHERE company_id = ? AND user_id = ? AND is_active = 1 AND is_primary = 1
      ORDER BY updated_at DESC, id DESC
    `,
    [companyId, userId]
  );

  if (primaryRows[0]?.team_id) {
    return primaryRows[0].team_id;
  }

  const [rows] = await active.query(
    `
      SELECT team_id
      FROM team_members
      WHERE company_id = ? AND user_id = ? AND is_active = 1
      ORDER BY created_at ASC, id ASC
    `,
    [companyId, userId]
  );

  return rows.length === 1 ? rows[0].team_id : null;
}

async function listUsersForTeams(companyId, teamIds, executor) {
  const normalizedTeamIds = normalizeIdList(teamIds);
  if (!normalizedTeamIds.length) {
    return [];
  }

  const active = getExecutor(executor);
  const [rows] = await active.query(
    `
      SELECT DISTINCT user_id
      FROM (
        SELECT user_id
        FROM team_members
        WHERE company_id = ?
          AND is_active = 1
          AND team_id IN (${normalizedTeamIds.map(() => "?").join(", ")})
        UNION
        SELECT user_id
        FROM team_managers
        WHERE company_id = ?
          AND is_active = 1
          AND team_id IN (${normalizedTeamIds.map(() => "?").join(", ")})
      ) scoped_users
    `,
    [companyId, ...normalizedTeamIds, companyId, ...normalizedTeamIds]
  );

  return normalizeIdList(rows.map((row) => row.user_id));
}

async function listValidTeamIds(companyId, teamIds, executor) {
  const normalizedTeamIds = normalizeIdList(teamIds);
  if (!normalizedTeamIds.length) {
    return [];
  }

  const active = getExecutor(executor);
  const [rows] = await active.query(
    `
      SELECT team_id
      FROM teams
      WHERE company_id = ?
        AND is_active = 1
        AND team_id IN (${normalizedTeamIds.map(() => "?").join(", ")})
    `,
    [companyId, ...normalizedTeamIds]
  );

  return normalizeIdList(rows.map((row) => row.team_id));
}

async function listValidTeamIdsAcrossCompanies(companyIds, teamIds, executor) {
  const normalizedCompanyIds = normalizeIdList(companyIds);
  const normalizedTeamIds = normalizeIdList(teamIds);
  if (!normalizedCompanyIds.length || !normalizedTeamIds.length) {
    return [];
  }

  const active = getExecutor(executor);
  const [rows] = await active.query(
    `
      SELECT team_id
      FROM teams
      WHERE is_active = 1
        AND company_id IN (${normalizedCompanyIds.map(() => "?").join(", ")})
        AND team_id IN (${normalizedTeamIds.map(() => "?").join(", ")})
    `,
    [...normalizedCompanyIds, ...normalizedTeamIds]
  );

  return normalizeIdList(rows.map((row) => row.team_id));
}

async function listTeams(filters, pagination, executor) {
  const active = getExecutor(executor);
  const conditions = ["t.is_active = 1"];
  const params = [];

  if (filters.companyId) {
    conditions.push("t.company_id = ?");
    params.push(filters.companyId);
  } else if (Array.isArray(filters.companyIds)) {
    if (!filters.companyIds.length) {
      conditions.push("1 = 0");
    } else {
      conditions.push(`t.company_id IN (${filters.companyIds.map(() => "?").join(", ")})`);
      params.push(...filters.companyIds);
    }
  }

  if (Array.isArray(filters.teamIds) && !filters.teamIds.length) {
    conditions.push("1 = 0");
  }

  if (filters.search) {
    conditions.push("(t.name LIKE ? OR t.code LIKE ? OR t.description LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }

  if (filters.teamIds?.length) {
    conditions.push(`t.team_id IN (${filters.teamIds.map(() => "?").join(", ")})`);
    params.push(...filters.teamIds);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const [countRows] = await active.query(
    `SELECT COUNT(*) AS total FROM teams t ${whereClause}`,
    params
  );
  const [rows] = await active.query(
    `
      SELECT
        t.*,
        creator.name AS created_by_name,
        (
          SELECT COUNT(*)
          FROM team_members mem
          WHERE mem.team_id = t.team_id AND mem.company_id = t.company_id AND mem.is_active = 1
        ) AS member_count,
        (
          SELECT COUNT(*)
          FROM team_managers mgr
          WHERE mgr.team_id = t.team_id AND mgr.company_id = t.company_id AND mgr.is_active = 1
        ) AS manager_count
      FROM teams t
      LEFT JOIN users creator ON creator.user_id = t.created_by
      ${whereClause}
      ORDER BY t.created_at DESC, t.id DESC
      OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `,
    [...params, pagination.offset, pagination.limit]
  );

  return {
    rows,
    total: Number(countRows[0]?.total || 0),
  };
}

async function createTeam(team, executor) {
  const active = getExecutor(executor);
  await active.query(
    `
      INSERT INTO teams (team_id, company_id, name, code, description, created_by, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      team.team_id,
      team.company_id,
      team.name,
      team.code,
      team.description || null,
      team.created_by || null,
      team.is_active === false ? 0 : 1,
    ]
  );

  return getTeamById(team.team_id, team.company_id, active);
}

async function updateTeam(teamId, companyId, updates, executor) {
  const active = getExecutor(executor);
  const fields = [];
  const params = [];

  ["name", "code", "description", "is_active"].forEach((column) => {
    if (!Object.prototype.hasOwnProperty.call(updates, column)) {
      return;
    }

    fields.push(`${column} = ?`);
    params.push(updates[column]);
  });

  if (fields.length) {
    await active.query(
      `UPDATE teams SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE team_id = ? AND company_id = ?`,
      [...params, teamId, companyId]
    );
  }

  return getTeamById(teamId, companyId, active);
}

async function listTeamMembers(teamId, companyId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    `
      SELECT
        mem.*,
        u.name,
        u.email,
        u.phone,
        u.role,
        u.department,
        u.is_active AS user_is_active
      FROM team_members mem
      INNER JOIN users u ON u.user_id = mem.user_id
      WHERE mem.team_id = ? AND mem.company_id = ? AND mem.is_active = 1
      ORDER BY mem.is_primary DESC, u.name ASC
    `,
    [teamId, companyId]
  );

  return rows;
}

async function listTeamManagers(teamId, companyId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    `
      SELECT
        mgr.*,
        u.name,
        u.email,
        u.phone,
        u.role,
        u.department,
        u.is_active AS user_is_active
      FROM team_managers mgr
      INNER JOIN users u ON u.user_id = mgr.user_id
      WHERE mgr.team_id = ? AND mgr.company_id = ? AND mgr.is_active = 1
      ORDER BY u.name ASC
    `,
    [teamId, companyId]
  );

  return rows;
}

async function addTeamMember(member, executor) {
  const active = getExecutor(executor);
  await active.query(
    `
      IF EXISTS (
        SELECT 1
        FROM team_members
        WHERE team_id = ? AND company_id = ? AND user_id = ?
      )
      BEGIN
        UPDATE team_members
        SET
          membership_role = ?,
          is_primary = ?,
          is_active = 1,
          added_by = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE team_id = ? AND company_id = ? AND user_id = ?
      END
      ELSE
      BEGIN
        INSERT INTO team_members
          (company_id, team_id, user_id, membership_role, is_primary, is_active, added_by)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      END
    `,
    [
      member.team_id,
      member.company_id,
      member.user_id,
      member.membership_role || "member",
      member.is_primary ? 1 : 0,
      member.added_by || null,
      member.team_id,
      member.company_id,
      member.user_id,
      member.company_id,
      member.team_id,
      member.user_id,
      member.membership_role || "member",
      member.is_primary ? 1 : 0,
      member.added_by || null,
    ]
  );

  if (member.is_primary) {
    await active.query(
      `
        UPDATE team_members
        SET is_primary = 0, updated_at = CURRENT_TIMESTAMP
        WHERE company_id = ? AND user_id = ? AND team_id <> ?
      `,
      [member.company_id, member.user_id, member.team_id]
    );
  }
}

async function setTeamMemberActive(teamId, companyId, userId, isActive, executor) {
  const active = getExecutor(executor);
  await active.query(
    `
      UPDATE team_members
      SET is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE team_id = ? AND company_id = ? AND user_id = ?
    `,
    [isActive ? 1 : 0, teamId, companyId, userId]
  );
}

async function addTeamManager(manager, executor) {
  const active = getExecutor(executor);
  await active.query(
    `
      IF EXISTS (
        SELECT 1
        FROM team_managers
        WHERE team_id = ? AND company_id = ? AND user_id = ?
      )
      BEGIN
        UPDATE team_managers
        SET
          is_active = 1,
          added_by = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE team_id = ? AND company_id = ? AND user_id = ?
      END
      ELSE
      BEGIN
        INSERT INTO team_managers (company_id, team_id, user_id, is_active, added_by)
        VALUES (?, ?, ?, 1, ?)
      END
    `,
    [
      manager.team_id,
      manager.company_id,
      manager.user_id,
      manager.added_by || null,
      manager.team_id,
      manager.company_id,
      manager.user_id,
      manager.company_id,
      manager.team_id,
      manager.user_id,
      manager.added_by || null,
    ]
  );
}

async function setTeamManagerActive(teamId, companyId, userId, isActive, executor) {
  const active = getExecutor(executor);
  await active.query(
    `
      UPDATE team_managers
      SET is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE team_id = ? AND company_id = ? AND user_id = ?
    `,
    [isActive ? 1 : 0, teamId, companyId, userId]
  );
}

module.exports = {
  addTeamManager,
  addTeamMember,
  countActiveTeams,
  createTeam,
  getFirstActiveTeamId,
  getPreferredTeamId,
  getTeamByCode,
  getTeamById,
  listAccessibleTeamIds,
  listTeamManagers,
  listTeamMembers,
  listTeams,
  listValidTeamIdsAcrossCompanies,
  listUsersForTeams,
  listValidTeamIds,
  setTeamManagerActive,
  setTeamMemberActive,
  updateTeam,
};
