#!/usr/bin/env node

require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");

const db = require("../db/connection");
const companyRepository = require("../repositories/companyRepository");
const teamRepository = require("../repositories/teamRepository");
const userRepository = require("../repositories/userRepository");
const { ensureInitialCompanyTeam } = require("../services/teamProvisioningService");
const { createPrefixedId } = require("../utils/ids");

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const [rawKey, inlineValue] = token.slice(2).split("=");
    if (inlineValue !== undefined) {
      parsed[rawKey] = inlineValue;
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[rawKey] = "true";
      continue;
    }

    parsed[rawKey] = next;
    index += 1;
  }

  return parsed;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function normalizeIdList(value) {
  return [...new Set((Array.isArray(value) ? value : String(value || "").split(","))
    .map((item) => String(item || "").trim())
    .filter(Boolean))];
}

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function ensureUsersExist(companyId, userIds) {
  const normalizedUserIds = normalizeIdList(userIds);
  for (const userId of normalizedUserIds) {
    const user = await userRepository.getUserInCompany(userId, companyId);
    if (!user || !user.is_active) {
      throw new Error(`User ${userId} is not an active member of company ${companyId}.`);
    }
  }

  return normalizedUserIds;
}

async function resolveTeamContext({
  companyId,
  teamId,
  teamName,
  teamCode,
  actorUserId,
  managerUserIds,
  memberUserIds,
  dryRun,
}) {
  if (teamId) {
    const existingTeam = await teamRepository.getTeamById(teamId, companyId);
    if (!existingTeam) {
      throw new Error(`Team ${teamId} was not found in company ${companyId}.`);
    }
    return existingTeam;
  }

  if (teamCode) {
    const existingByCode = await teamRepository.getTeamByCode(companyId, teamCode);
    if (existingByCode) {
      return existingByCode;
    }
  }

  if (dryRun) {
    throw new Error("Dry run requires an existing --team_id or --team_code.");
  }

  if (teamName || teamCode) {
    return teamRepository.createTeam({
      team_id: await createPrefixedId("tem"),
      company_id: companyId,
      name: teamName || "Migrated Team",
      code: teamCode || "MIGRATED",
      description: "Backfilled ownership team",
      created_by: actorUserId,
      is_active: true,
    });
  }

  return ensureInitialCompanyTeam({
    companyId,
    actorUserId,
    teamName: teamName || "Migrated Team",
    teamCode: teamCode || "MIGRATED",
    description: "Backfilled ownership team",
    managerUserIds,
    memberUserIds,
  });
}

async function syncTeamMappings({ team, actorUserId, managerUserIds, memberUserIds, dryRun }) {
  if (dryRun) {
    return;
  }

  const distinctManagerIds = normalizeIdList(managerUserIds);
  const distinctMemberIds = normalizeIdList([...memberUserIds, ...distinctManagerIds]);

  await db.withTransaction(async (transaction) => {
    for (const managerUserId of distinctManagerIds) {
      await teamRepository.addTeamManager(
        {
          company_id: team.company_id,
          team_id: team.team_id,
          user_id: managerUserId,
          added_by: actorUserId || null,
        },
        transaction
      );
    }

    let primaryAssigned = false;
    for (const memberUserId of distinctMemberIds) {
      const isPrimary = !primaryAssigned;
      await teamRepository.addTeamMember(
        {
          company_id: team.company_id,
          team_id: team.team_id,
          user_id: memberUserId,
          membership_role: distinctManagerIds.includes(memberUserId) ? "lead" : "member",
          is_primary: isPrimary,
          added_by: actorUserId || null,
        },
        transaction
      );
      primaryAssigned = true;
    }
  });
}

async function getEligibleUserIds(companyId, teamId, managerUserIds, memberUserIds) {
  const [teamMembers, teamManagers] = await Promise.all([
    teamRepository.listTeamMembers(teamId, companyId),
    teamRepository.listTeamManagers(teamId, companyId),
  ]);

  return normalizeIdList([
    ...teamMembers.map((member) => member.user_id),
    ...teamManagers.map((manager) => manager.user_id),
    ...managerUserIds,
    ...memberUserIds,
  ]);
}

async function applyBulkUpdate(transaction, sqlText, params) {
  const [result] = await transaction.query(sqlText, params);
  return Number(result?.affectedRows || 0);
}

async function backfillLeads(transaction, companyId, teamId, eligibleUserIds, sampleLimit) {
  let assignedCount = 0;
  let createdCount = 0;

  if (eligibleUserIds.length) {
    assignedCount = await applyBulkUpdate(
      transaction,
      `
        UPDATE leads
        SET team_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE company_id = ?
          AND team_id IS NULL
          AND assigned_to IN (${eligibleUserIds.map(() => "?").join(", ")})
      `,
      [teamId, companyId, ...eligibleUserIds]
    );

    createdCount = await applyBulkUpdate(
      transaction,
      `
        UPDATE leads
        SET team_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE company_id = ?
          AND team_id IS NULL
          AND created_by IN (${eligibleUserIds.map(() => "?").join(", ")})
      `,
      [teamId, companyId, ...eligibleUserIds]
    );
  }

  const [unresolved] = await transaction.query(
    `
      SELECT TOP (${sampleLimit})
        lead_id AS record_id,
        assigned_to,
        created_by,
        company_name,
        contact_person,
        created_at
      FROM leads
      WHERE company_id = ? AND team_id IS NULL
      ORDER BY created_at DESC, id DESC
    `,
    [companyId]
  );

  const [summaryRows] = await transaction.query(
    "SELECT COUNT(*) AS total FROM leads WHERE company_id = ? AND team_id IS NULL",
    [companyId]
  );

  return {
    table: "leads",
    assigned_count: assignedCount,
    created_by_count: createdCount,
    unresolved_count: Number(summaryRows[0]?.total || 0),
    unresolved_sample: unresolved,
  };
}

async function backfillCustomers(transaction, companyId, teamId, eligibleUserIds, sampleLimit) {
  let assignedCount = 0;
  let convertedLeadCount = 0;

  if (eligibleUserIds.length) {
    assignedCount = await applyBulkUpdate(
      transaction,
      `
        UPDATE customers
        SET team_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE company_id = ?
          AND team_id IS NULL
          AND assigned_to IN (${eligibleUserIds.map(() => "?").join(", ")})
      `,
      [teamId, companyId, ...eligibleUserIds]
    );
  }

  convertedLeadCount = await applyBulkUpdate(
    transaction,
    `
      UPDATE c
      SET c.team_id = l.team_id,
          c.updated_at = CURRENT_TIMESTAMP
      FROM customers c
      INNER JOIN leads l
        ON l.lead_id = c.converted_from_lead_id
       AND l.company_id = c.company_id
      WHERE c.company_id = ?
        AND c.team_id IS NULL
        AND l.team_id IS NOT NULL
    `,
    [companyId]
  );

  const [unresolved] = await transaction.query(
    `
      SELECT TOP (${sampleLimit})
        customer_id AS record_id,
        assigned_to,
        converted_from_lead_id,
        company_name,
        name,
        created_at
      FROM customers
      WHERE company_id = ? AND team_id IS NULL
      ORDER BY created_at DESC, id DESC
    `,
    [companyId]
  );

  const [summaryRows] = await transaction.query(
    "SELECT COUNT(*) AS total FROM customers WHERE company_id = ? AND team_id IS NULL",
    [companyId]
  );

  return {
    table: "customers",
    assigned_count: assignedCount,
    inherited_from_lead_count: convertedLeadCount,
    unresolved_count: Number(summaryRows[0]?.total || 0),
    unresolved_sample: unresolved,
  };
}

async function backfillTasks(transaction, companyId, teamId, eligibleUserIds, sampleLimit) {
  let assignedCount = 0;
  let createdCount = 0;

  if (eligibleUserIds.length) {
    assignedCount = await applyBulkUpdate(
      transaction,
      `
        UPDATE tasks
        SET team_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE company_id = ?
          AND team_id IS NULL
          AND assigned_to IN (${eligibleUserIds.map(() => "?").join(", ")})
      `,
      [teamId, companyId, ...eligibleUserIds]
    );

    createdCount = await applyBulkUpdate(
      transaction,
      `
        UPDATE tasks
        SET team_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE company_id = ?
          AND team_id IS NULL
          AND created_by IN (${eligibleUserIds.map(() => "?").join(", ")})
      `,
      [teamId, companyId, ...eligibleUserIds]
    );
  }

  const [unresolved] = await transaction.query(
    `
      SELECT TOP (${sampleLimit})
        task_id AS record_id,
        assigned_to,
        created_by,
        related_to,
        related_id,
        created_at
      FROM tasks
      WHERE company_id = ? AND team_id IS NULL
      ORDER BY created_at DESC, id DESC
    `,
    [companyId]
  );

  const [summaryRows] = await transaction.query(
    "SELECT COUNT(*) AS total FROM tasks WHERE company_id = ? AND team_id IS NULL",
    [companyId]
  );

  return {
    table: "tasks",
    assigned_count: assignedCount,
    created_by_count: createdCount,
    unresolved_count: Number(summaryRows[0]?.total || 0),
    unresolved_sample: unresolved,
  };
}

async function backfillProducts(transaction, companyId, teamId, eligibleUserIds, sampleLimit) {
  let createdCount = 0;

  if (eligibleUserIds.length) {
    createdCount = await applyBulkUpdate(
      transaction,
      `
        UPDATE products
        SET team_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE company_id = ?
          AND team_id IS NULL
          AND created_by IN (${eligibleUserIds.map(() => "?").join(", ")})
      `,
      [teamId, companyId, ...eligibleUserIds]
    );
  }

  const [unresolved] = await transaction.query(
    `
      SELECT TOP (${sampleLimit})
        product_id AS record_id,
        created_by,
        name,
        created_at
      FROM products
      WHERE company_id = ? AND team_id IS NULL
      ORDER BY created_at DESC, id DESC
    `,
    [companyId]
  );

  const [summaryRows] = await transaction.query(
    "SELECT COUNT(*) AS total FROM products WHERE company_id = ? AND team_id IS NULL",
    [companyId]
  );

  return {
    table: "products",
    created_by_count: createdCount,
    unresolved_count: Number(summaryRows[0]?.total || 0),
    unresolved_sample: unresolved,
  };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const companyId = String(args.company_id || "").trim();
  const dryRun = parseBoolean(args.dry_run, false);
  const sampleLimit = Math.max(Number(args.sample_limit || 50), 1);

  if (!companyId) {
    throw new Error("--company_id is required.");
  }

  const company = await companyRepository.getCompanyById(companyId);
  if (!company) {
    throw new Error(`Company ${companyId} was not found.`);
  }

  const managerUserIds = await ensureUsersExist(companyId, normalizeIdList(args.manager_user_ids || []));
  const memberUserIds = await ensureUsersExist(companyId, normalizeIdList(args.member_user_ids || []));
  const actorUserId = String(args.actor_user_id || managerUserIds[0] || memberUserIds[0] || "").trim() || null;

  const team = await resolveTeamContext({
    companyId,
    teamId: String(args.team_id || "").trim() || null,
    teamName: String(args.team_name || "").trim() || null,
    teamCode: String(args.team_code || "").trim() || null,
    actorUserId,
    managerUserIds,
    memberUserIds,
    dryRun,
  });

  if (!team) {
    throw new Error("A target team could not be resolved.");
  }

  await syncTeamMappings({
    team,
    actorUserId,
    managerUserIds,
    memberUserIds,
    dryRun,
  });

  const eligibleUserIds = await getEligibleUserIds(companyId, team.team_id, managerUserIds, memberUserIds);

  const report = await (dryRun
    ? db.withTransaction(async (transaction) => {
        const leadSummary = await backfillLeads(transaction, companyId, team.team_id, eligibleUserIds, sampleLimit);
        const customerSummary = await backfillCustomers(transaction, companyId, team.team_id, eligibleUserIds, sampleLimit);
        const taskSummary = await backfillTasks(transaction, companyId, team.team_id, eligibleUserIds, sampleLimit);
        const productSummary = await backfillProducts(transaction, companyId, team.team_id, eligibleUserIds, sampleLimit);

        throw {
          __dryRunRollback: true,
          report: {
            company_id: companyId,
            team_id: team.team_id,
            team_name: team.name,
            dry_run: true,
            eligible_user_ids: eligibleUserIds,
            tables: [leadSummary, customerSummary, taskSummary, productSummary],
          },
        };
      }).catch((error) => {
        if (error?.__dryRunRollback) {
          return error.report;
        }
        throw error;
      })
    : db.withTransaction(async (transaction) => {
        const leadSummary = await backfillLeads(transaction, companyId, team.team_id, eligibleUserIds, sampleLimit);
        const customerSummary = await backfillCustomers(transaction, companyId, team.team_id, eligibleUserIds, sampleLimit);
        const taskSummary = await backfillTasks(transaction, companyId, team.team_id, eligibleUserIds, sampleLimit);
        const productSummary = await backfillProducts(transaction, companyId, team.team_id, eligibleUserIds, sampleLimit);

        return {
          company_id: companyId,
          team_id: team.team_id,
          team_name: team.name,
          dry_run: false,
          eligible_user_ids: eligibleUserIds,
          tables: [leadSummary, customerSummary, taskSummary, productSummary],
        };
      }));

  const unresolvedTables = report.tables.filter((table) => table.unresolved_count > 0);
  if (unresolvedTables.length) {
    const reportsDir = path.join(__dirname, "..", "reports");
    ensureDirectory(reportsDir);
    const filePath = path.join(
      reportsDir,
      `team-backfill-unresolved-${companyId}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    );

    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          company_id: report.company_id,
          team_id: report.team_id,
          team_name: report.team_name,
          dry_run: report.dry_run,
          unresolved_tables: unresolvedTables,
        },
        null,
        2
      ),
      "utf8"
    );

    report.unresolved_output = filePath;
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

run().catch((error) => {
  console.error(
    JSON.stringify(
      {
        error: error.message || "Backfill failed.",
      },
      null,
      2
    )
  );
  process.exit(1);
});
