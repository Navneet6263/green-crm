const db = require("../db/connection");

function getExecutor(executor) {
  return executor || db;
}

async function getProductById(productId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query("SELECT TOP 1 * FROM products WHERE product_id = ?", [productId]);
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
        name,
        color,
        is_active,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      product.product_id,
      product.company_id,
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

  ["name", "color", "is_active"].forEach((column) => {
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

async function listProducts({ companyId, search, pagination }, executor) {
  const active = getExecutor(executor);
  const conditions = [];
  const params = [];

  if (companyId) {
    conditions.push("company_id = ?");
    params.push(companyId);
  }

  if (search) {
    conditions.push("name LIKE ?");
    params.push(`%${search}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [countRows] = await active.query(
    `SELECT COUNT(*) AS total FROM products ${whereClause}`,
    params
  );
  const [rows] = await active.query(
    `
      SELECT *
      FROM products
      ${whereClause}
      ORDER BY created_at DESC
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
