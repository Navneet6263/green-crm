const db = require("../db/connection");

function getExecutor(executor) {
  return executor || db;
}

async function getIntegration(companyId, channel, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    "SELECT TOP 1 * FROM company_integrations WHERE company_id = ? AND channel = ?",
    [companyId, channel]
  );

  return rows[0] || null;
}

async function listIntegrations(companyId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    "SELECT * FROM company_integrations WHERE company_id = ? ORDER BY channel ASC",
    [companyId]
  );

  return rows;
}

async function upsertIntegration(companyId, integration, executor) {
  const active = getExecutor(executor);
  const payload = [
    companyId,
    integration.channel,
    integration.enabled ? 1 : 0,
    integration.provider,
    integration.mode,
    integration.config_json || null,
  ];

  await active.query(
    `
      IF EXISTS (SELECT 1 FROM company_integrations WHERE company_id = ? AND channel = ?)
      BEGIN
        UPDATE company_integrations
        SET enabled = ?, provider = ?, mode = ?, config_json = ?, updated_at = CURRENT_TIMESTAMP
        WHERE company_id = ? AND channel = ?
      END
      ELSE
      BEGIN
        INSERT INTO company_integrations (company_id, channel, enabled, provider, mode, config_json)
        VALUES (?, ?, ?, ?, ?, ?)
      END
    `,
    [...payload, companyId, integration.channel, ...payload]
  );

  return getIntegration(companyId, integration.channel, active);
}

module.exports = {
  getIntegration,
  listIntegrations,
  upsertIntegration,
};
