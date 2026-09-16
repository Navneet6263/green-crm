const productRepository = require("../repositories/productRepository");
const AppError = require("../utils/appError");

function productAllowsTeam(product, teamId) {
  // Unscoped legacy products are not automatically shared with all teams.
  if (!teamId) return !product.team_id;
  return product.team_id === teamId || (product.mapped_team_ids || []).includes(teamId);
}

async function assertProductForTeam(companyId, productId, teamId) {
  if (!productId) return;
  const product = await productRepository.getProductById(productId);
  if (!product || product.company_id !== companyId || !product.is_active) {
    throw new AppError("Selected product is not active in this company.", 400);
  }
  if (!productAllowsTeam(product, teamId)) {
    throw new AppError("This product is not mapped to the selected team. Ask your company admin to map it.", 403);
  }
  return product;
}

module.exports = { assertProductForTeam, productAllowsTeam };
