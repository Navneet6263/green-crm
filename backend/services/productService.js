const productRepository = require("../repositories/productRepository");
const companyRepository = require("../repositories/companyRepository");
const auditRepository = require("../repositories/auditRepository");
const { ROLES } = require("../constants/roles");
const { createPrefixedId } = require("../utils/ids");
const { buildPaginatedResult, parsePagination } = require("../utils/pagination");
const AppError = require("../utils/appError");
const { assertCompanyAccess, getAccessibleCompanyIds, isPlatformOperatorRole } = require("../utils/tenant");
const {
  assertRecordTeamAccess,
  assertTeamAccess,
  ensureTeamIdWhenTeamsConfigured,
  parseRequestedTeamIds,
  resolveDefaultTeamId,
  resolvePreferredTeamId,
  resolveTeamScope,
} = require("./accessScopeService");

async function resolveProductTeamId(auth, companyId, payload, existingProduct = null) {
  const requestedTeamIds = parseRequestedTeamIds(payload);

  if (requestedTeamIds.length) {
    const [teamId] = requestedTeamIds;
    await assertTeamAccess(auth, companyId, teamId, {
      includeManaged: true,
      includeMembership: true,
    });
    return teamId;
  }

  if (existingProduct?.team_id) {
    return existingProduct.team_id;
  }

  const creatorTeamId = await resolvePreferredTeamId(companyId, auth.userId);
  if (creatorTeamId) {
    return creatorTeamId;
  }

  return resolveDefaultTeamId(companyId);
}

async function listProducts(auth, query) {
  const pagination = parsePagination(query);
  const companyId =
    auth.role === ROLES.SUPER_ADMIN || isPlatformOperatorRole(auth.role)
      ? query.company_id || null
      : auth.companyId;
  const companyIds =
    isPlatformOperatorRole(auth.role) && !companyId
      ? getAccessibleCompanyIds(auth)
      : null;
  const requestedTeamIds = parseRequestedTeamIds(query);

  if (companyId) {
    assertCompanyAccess(auth, companyId);
  }

  const { teamIds } = await resolveTeamScope(auth, companyId, requestedTeamIds, {
    includeManaged: true,
    includeMembership: true,
  });

  const { rows, total } = await productRepository.listProducts({
    companyId,
    companyIds,
    teamIds,
    search: query.search || "",
    pagination,
  });

  return buildPaginatedResult(rows, total, pagination);
}

async function createProduct(auth, payload) {
  if (![ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_MANAGER, ROLES.ADMIN, ROLES.MANAGER].includes(auth.role)) {
    throw new AppError("Only super admins, platform operators, company admins, and managers can create products.", 403);
  }

  const companyId =
    auth.role === ROLES.SUPER_ADMIN || isPlatformOperatorRole(auth.role)
      ? payload.company_id || null
      : auth.companyId;
  const name = String(payload.name || "").trim();

  if (!companyId || !name) {
    throw new AppError("Company and product name are required.");
  }

  assertCompanyAccess(auth, companyId);
  const company = await companyRepository.getCompanyById(companyId);
  if (!company) {
    throw new AppError("Company not found.", 404);
  }

  const teamId = await ensureTeamIdWhenTeamsConfigured(
    companyId,
    await resolveProductTeamId(auth, companyId, payload)
  );

  const existingProduct = await productRepository.getProductByName(companyId, name);
  if (existingProduct) {
    throw new AppError("A product with this name already exists for the company.", 409);
  }

  const product = await productRepository.createProduct({
    product_id: await createPrefixedId("prd"),
    company_id: companyId,
    team_id: teamId,
    name,
    color: payload.color || "#22c55e",
    is_active: payload.is_active !== false,
    created_by: auth.userId,
  });

  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: companyId,
    action: "product.created",
    performed_by: auth.userId,
    target_user: null,
    user_email: auth.email,
    user_role: auth.role,
    details: {
      product_id: product.product_id,
      name: product.name,
    },
  });

  return product;
}

async function updateProduct(auth, productId, payload) {
  const product = await productRepository.getProductById(productId);
  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  assertCompanyAccess(auth, product.company_id);
  await assertRecordTeamAccess(auth, product, {
    includeManaged: true,
    includeMembership: true,
  });

  if (![ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_MANAGER, ROLES.ADMIN, ROLES.MANAGER].includes(auth.role)) {
    throw new AppError("Only super admins, platform operators, company admins, and managers can update products.", 403);
  }

  if (payload.name) {
    const existingProduct = await productRepository.getProductByName(product.company_id, String(payload.name).trim());
    if (existingProduct && existingProduct.product_id !== product.product_id) {
      throw new AppError("A product with this name already exists for the company.", 409);
    }
  }

  const nextTeamId = await ensureTeamIdWhenTeamsConfigured(
    product.company_id,
    await resolveProductTeamId(auth, product.company_id, payload, product)
  );

  const updated = await productRepository.updateProduct(product.product_id, product.company_id, {
    name: payload.name !== undefined ? String(payload.name || "").trim() : product.name,
    color: payload.color !== undefined ? payload.color : product.color,
    is_active: payload.is_active !== undefined ? Number(Boolean(payload.is_active)) : product.is_active,
    team_id: nextTeamId,
  });

  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: product.company_id,
    action: "product.updated",
    performed_by: auth.userId,
    target_user: null,
    user_email: auth.email,
    user_role: auth.role,
    details: {
      product_id: updated.product_id,
    },
  });

  return updated;
}

async function deleteProduct(auth, productId) {
  const product = await productRepository.getProductById(productId);
  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  assertCompanyAccess(auth, product.company_id);
  await assertRecordTeamAccess(auth, product, {
    includeManaged: true,
    includeMembership: true,
  });

  if (![ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_MANAGER, ROLES.ADMIN, ROLES.MANAGER].includes(auth.role)) {
    throw new AppError("Only super admins, platform operators, company admins, and managers can archive products.", 403);
  }

  await productRepository.deactivateProduct(product.product_id, product.company_id);
  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: product.company_id,
    action: "product.archived",
    performed_by: auth.userId,
    target_user: null,
    user_email: auth.email,
    user_role: auth.role,
    details: {
      product_id: product.product_id,
    },
  });

  return { archived: true };
}

async function enableProductForCompany(auth, companyId, productId) {
  assertCompanyAccess(auth, companyId);
  const product = await productRepository.getProductById(productId);

  if (!product || product.company_id !== companyId) {
    throw new AppError("Product not found for the specified company.", 404);
  }

  await assertRecordTeamAccess(auth, product, {
    includeManaged: true,
    includeMembership: true,
  });

  return {
    product_id: product.product_id,
    company_id: product.company_id,
    enabled: Boolean(product.is_active),
  };
}

module.exports = {
  createProduct,
  deleteProduct,
  enableProductForCompany,
  listProducts,
  updateProduct,
};
