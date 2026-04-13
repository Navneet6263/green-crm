const db = require("../db/connection");

function getExecutor(executor) {
  return executor || db;
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
  return rows[0] || null;
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
    countConditions.push("company_id = ?");
    selectConditions.push("p.company_id = ?");
    params.push(companyId);
  } else if (Array.isArray(companyIds)) {
    if (!companyIds.length) {
      return { rows: [], total: 0 };
    }

    countConditions.push(`company_id IN (${companyIds.map(() => "?").join(", ")})`);
    selectConditions.push(`p.company_id IN (${companyIds.map(() => "?").join(", ")})`);
    params.push(...companyIds);
  }

  if (search) {
    countConditions.push("name LIKE ?");
    selectConditions.push("p.name LIKE ?");
    params.push(`%${search}%`);
  }

  if (teamIds) {
    if (!teamIds.length) {
      return { rows: [], total: 0 };
    }

    countConditions.push(`team_id IN (${teamIds.map(() => "?").join(", ")})`);
    selectConditions.push(`p.team_id IN (${teamIds.map(() => "?").join(", ")})`);
    params.push(...teamIds);
  }

  const countWhereClause = countConditions.length ? `WHERE ${countConditions.join(" AND ")}` : "";
  const selectWhereClause = selectConditions.length ? `WHERE ${selectConditions.join(" AND ")}` : "";
  const [countRows] = await active.query(
    `SELECT COUNT(*) AS total FROM products ${countWhereClause}`,
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
    rows,
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
};
