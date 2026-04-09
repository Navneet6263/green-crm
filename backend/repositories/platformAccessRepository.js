const db = require("../db/connection");

function getExecutor(executor) {
  return executor || db;
}

function normalizeIds(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean))];
}

async function listCompanyIdsByUser(userId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    `
      SELECT company_id
      FROM platform_user_company_access
      WHERE user_id = ?
      ORDER BY company_id ASC
    `,
    [userId]
  );

  return rows.map((row) => row.company_id);
}

async function listCompanyIdsByUsers(userIds, executor) {
  const active = getExecutor(executor);
  const normalizedUserIds = normalizeIds(userIds);

  if (!normalizedUserIds.length) {
    return {};
  }

  const [rows] = await active.query(
    `
      SELECT user_id, company_id
      FROM platform_user_company_access
      WHERE user_id IN (${normalizedUserIds.map(() => "?").join(", ")})
      ORDER BY user_id ASC, company_id ASC
    `,
    normalizedUserIds
  );

  return rows.reduce((accumulator, row) => {
    if (!accumulator[row.user_id]) {
      accumulator[row.user_id] = [];
    }

    accumulator[row.user_id].push(row.company_id);
    return accumulator;
  }, {});
}

async function replaceCompanyIdsForUser(userId, companyIds, createdBy, executor) {
  const active = getExecutor(executor);
  const normalizedCompanyIds = normalizeIds(companyIds);

  await active.query("DELETE FROM platform_user_company_access WHERE user_id = ?", [userId]);

  for (const companyId of normalizedCompanyIds) {
    await active.query(
      `
        INSERT INTO platform_user_company_access (user_id, company_id, created_by)
        VALUES (?, ?, ?)
      `,
      [userId, companyId, createdBy || null]
    );
  }

  return normalizedCompanyIds;
}

module.exports = {
  listCompanyIdsByUser,
  listCompanyIdsByUsers,
  replaceCompanyIdsForUser,
};
