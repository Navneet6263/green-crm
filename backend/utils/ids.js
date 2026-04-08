const crypto = require("crypto");
const connection = require("../db/connection");

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

// prefix → { table, column, code }
const ID_CONFIG = {
  usr: { table: "users",               column: "user_id",    code: "UI" },
  cmp: { table: "companies",           column: "company_id", code: "CI" },
  led: { table: "leads",               column: "lead_id",    code: "LI" },
  prd: { table: "products",            column: "product_id", code: "PI" },
  act: { table: "lead_activities",     column: "activity_id",code: "AI" },
  aud: { table: "audit_logs",          column: "audit_id",   code: "ALI" },
  tsk: { table: "tasks",               column: "task_id",    code: "TI" },
  cst: { table: "customers",           column: "customer_id",code: "CSI" },
  ntf: { table: "notifications",       column: "notif_id",   code: "NI" },
};

function pad(n) {
  return String(n).padStart(4, "0");
}

function buildTalentId(companyId, userId) {
  const companyCode = String(companyId || "COMP")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase()
    .slice(-4)
    .padStart(4, "X");

  const userCode = String(userId || crypto.randomUUID())
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase()
    .slice(-4)
    .padStart(4, "0");

  return `TAL-${companyCode}-${userCode}`;
}

async function createPrefixedId(prefix) {
  const cfg = ID_CONFIG[prefix];

  if (!cfg) {
    // fallback for unknown prefixes
    return `${prefix}_${crypto.randomUUID()}`;
  }

  // Find highest existing numeric suffix for this code
  const pattern = `${cfg.code}%`;
  const [[row]] = await connection.query(
    `SELECT TOP 1 ${cfg.column} as id FROM ${cfg.table}
     WHERE ${cfg.column} LIKE ?
     ORDER BY ${cfg.column} DESC`,
    [pattern]
  );

  let next = 1;
  if (row?.id) {
    const num = parseInt(row.id.replace(cfg.code, ""), 10);
    if (!isNaN(num)) next = num + 1;
  }

  return `${cfg.code}${pad(next)}`;
}

module.exports = {
  buildTalentId,
  createPrefixedId,
  slugify,
};
