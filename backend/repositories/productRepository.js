const db = require("../db/connection");

function getExecutor(executor) {
  return executor || db;
}

async function attachTeamMappings(rows, executor) {
  if (!rows.length) return rows;
  const [mappings] = await getExecutor(executor).query(`
    SELECT m.company_id, m.product_id, m.team_id FROM product_team_mappings m
    INNER JOIN teams t ON t.company_id = m.company_id AND t.team_id = m.team_id AND t.is_active = 1
    WHERE m.product_id IN (${rows.map(() => "?").join(",")})`, rows.map(row => row.product_id));
  return rows.map(row => ({ ...row, mapped_team_ids: mappings
    .filter(m => m.company_id === row.company_id && m.product_id === row.product_id).map(m => m.team_id) }));
}

async function replaceTeamMappings(companyId, productId, teamIds, createdBy, executor) {
  const active = getExecutor(executor);
  // Serialize mapping changes per product. Caller supplies a transaction.
  await active.query("SELECT product_id FROM products WITH (UPDLOCK, HOLDLOCK) WHERE company_id = ? AND product_id = ?", [companyId, productId]);
  await active.query("DELETE FROM product_team_mappings WHERE company_id = ? AND product_id = ?", [companyId, productId]);
  for (const teamId of teamIds) await active.query(`
    INSERT INTO product_team_mappings(company_id, product_id, team_id, created_by) VALUES (?, ?, ?, ?)`,
  [companyId, productId, teamId, createdBy]);
}

async function getProductById(productId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    `
      SELECT TOP 1
        p.*,
        t.name AS team_name,
        t.code AS team_code
      FROM products p
      LEFT JOIN teams t ON t.team_id = p.team_id
      WHERE p.product_id = ?
    `,
    [productId]
  );
  return rows.length ? (await attachTeamMappings(rows, active))[0] : null;
}

async function getProductByName(companyId, name, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    "SELECT TOP 1 * FROM products WHERE company_id = ? AND name = ?",
    [companyId, name]
  );
  return rows[0] || null;
}

async function createProduct(product, executor) {
  const active = getExecutor(executor);

  await active.query(
    `
      INSERT INTO products (
        product_id,
        company_id,
        team_id,
        name,
        color,
        is_active,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      product.product_id,
      product.company_id,
      product.team_id || null,
      product.name,
      product.color || "#22c55e",
      product.is_active ? 1 : 0,
      product.created_by || null,
    ]
  );

  return getProductById(product.product_id, active);
}

async function updateProduct(productId, companyId, updates, executor) {
  const active = getExecutor(executor);
  const fields = [];
  const params = [];

  ["name", "color", "is_active", "team_id"].forEach((column) => {
    if (!Object.prototype.hasOwnProperty.call(updates, column)) {
      return;
    }

    fields.push(`${column} = ?`);
    params.push(updates[column]);
  });

  if (fields.length) {
    await active.query(
      `UPDATE products SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE product_id = ? AND company_id = ?`,
      [...params, productId, companyId]
    );
  }

  return getProductById(productId, active);
}

async function deactivateProduct(productId, companyId, executor) {
  return updateProduct(productId, companyId, { is_active: 0 }, executor);
}

async function listProducts({ companyId, companyIds = null, search, teamIds = null, pagination }, executor) {
  const active = getExecutor(executor);
  const countConditions = [];
  const selectConditions = [];
  const params = [];

  if (companyId) {
    countConditions.push("p.company_id = ?");
    selectConditions.push("p.company_id = ?");
    params.push(companyId);
  } else if (Array.isArray(companyIds)) {
    if (!companyIds.length) {
      return { rows: [], total: 0 };
    }

    countConditions.push(`p.company_id IN (${companyIds.map(() => "?").join(", ")})`);
    selectConditions.push(`p.company_id IN (${companyIds.map(() => "?").join(", ")})`);
    params.push(...companyIds);
  }

  if (search) {
    countConditions.push("p.name LIKE ?");
    selectConditions.push("p.name LIKE ?");
    params.push(`%${search}%`);
  }

  if (teamIds) {
    if (!teamIds.length) {
      return { rows: [], total: 0 };
    }

    const teamPredicate = `(p.team_id IN (${teamIds.map(() => "?").join(", ")}) OR EXISTS (
      SELECT 1 FROM product_team_mappings m
      WHERE m.company_id = p.company_id AND m.product_id = p.product_id
        AND m.team_id IN (${teamIds.map(() => "?").join(", ")})
    ))`;
    countConditions.push(teamPredicate);
    selectConditions.push(teamPredicate);
    params.push(...teamIds, ...teamIds);
  }

  const countWhereClause = countConditions.length ? `WHERE ${countConditions.join(" AND ")}` : "";
  const selectWhereClause = selectConditions.length ? `WHERE ${selectConditions.join(" AND ")}` : "";
  const [countRows] = await active.query(
    `SELECT COUNT(*) AS total FROM products p ${countWhereClause}`,
    params
  );
  const [rows] = await active.query(
    `
      SELECT
        p.*,
        t.name AS team_name,
        t.code AS team_code
      FROM products p
      LEFT JOIN teams t ON t.team_id = p.team_id
      ${selectWhereClause}
      ORDER BY p.created_at DESC
      OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `,
    [...params, pagination.offset, pagination.limit]
  );

  return {
    rows: await attachTeamMappings(rows, active),
    total: countRows[0].total,
  };
}

module.exports = {
  createProduct,
  deactivateProduct,
  getProductById,
  getProductByName,
  listProducts,
  updateProduct,
  replaceTeamMappings,
};
