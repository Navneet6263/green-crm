const db = require("../db/connection");
const crypto = require("crypto");
const companyRepository = require("../repositories/companyRepository");
const userRepository = require("../repositories/userRepository");
const auditRepository = require("../repositories/auditRepository");
const emailService = require("./emailService");
const { PLATFORM_COMPANY_ID } = require("../db/schema");
const { ROLES } = require("../constants/roles");
const { buildTalentId, createPrefixedId, slugify } = require("../utils/ids");
const { hashPassword } = require("../utils/auth");
const { buildPaginatedResult, parsePagination } = require("../utils/pagination");
const AppError = require("../utils/appError");
const { buildServiceSettingsPatch, mergeDeep, parseCompanySettings } = require("../utils/companySettings");
const { assertCompanyAccess, getAccessibleCompanyIds, isPlatformOperatorRole } = require("../utils/tenant");

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const { password: _pw, ...safeUser } = user;
  return safeUser;
}

function buildTemporaryPassword(length = 12) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const required = ["A", "a", "1", "!"];
  const randomBytes = crypto.randomBytes(Math.max(length - required.length, 8));
  const generated = [...required];

  for (let index = 0; index < length - required.length; index += 1) {
    generated.push(alphabet[randomBytes[index] % alphabet.length]);
  }

  return generated.join("");
}

async function getPlatformCompany() {
  return companyRepository.getCompanyWithSettings(PLATFORM_COMPANY_ID);
}

async function listCompanies(auth, query) {
  if (auth.role === ROLES.SUPER_ADMIN) {
    const pagination = parsePagination(query);
    const { rows, total } = await companyRepository.listCompanies({
      search: query.search || "",
      pagination,
    });

    return buildPaginatedResult(rows, total, pagination);
  }

  if (isPlatformOperatorRole(auth.role)) {
    const pagination = parsePagination(query);
    const companyId = query.company_id || null;

    if (companyId) {
      assertCompanyAccess(auth, companyId);
      const company = await companyRepository.getCompanyWithSettings(companyId);
      const items = company ? [company] : [];
      return buildPaginatedResult(items, items.length, { ...pagination, page: 1, offset: 0, limit: Math.max(items.length, 1) });
    }

    const { rows, total } = await companyRepository.listCompanies({
      search: query.search || "",
      pagination,
      companyIds: getAccessibleCompanyIds(auth),
    });

    return buildPaginatedResult(rows, total, pagination);
  }

  if (auth.role !== ROLES.SUPER_ADMIN) {
    const company = await companyRepository.getCompanyWithSettings(auth.companyId);
    return {
      items: company ? [company] : [],
      meta: {
        page: 1,
        page_size: 1,
        total: company ? 1 : 0,
        total_pages: 1,
      },
    };
  }

  return {
    items: [],
    meta: {
      page: 1,
      page_size: 1,
      total: 0,
      total_pages: 1,
    },
  };
}

async function getCompany(auth, companyId) {
  assertCompanyAccess(auth, companyId);
  const company = await companyRepository.getCompanyWithSettings(companyId);

  if (!company) {
    throw new AppError("Company not found.", 404);
  }

  return company;
}

async function createCompany(auth, payload) {
  if (auth.role !== ROLES.SUPER_ADMIN) {
    throw new AppError("Only super admins can create companies.", 403);
  }

  const companyName = String(payload.name || payload.company_name || "").trim();
  const companySlug = slugify(payload.slug || payload.company_slug || companyName);

  if (!companyName || !companySlug) {
    throw new AppError("Company name and slug are required.");
  }

  const existingCompany = await companyRepository.getCompanyBySlug(companySlug);
  if (existingCompany) {
    throw new AppError("Company slug already exists.", 409);
  }

  const adminPassword =
    String(payload.admin_password || "").trim() || buildTemporaryPassword();
  const serviceSettings = mergeDeep(
    {
      onboarding_profile: {
        source: "super-admin-company-create",
      },
    },
    buildServiceSettingsPatch(payload)
  );

  if (
    payload.admin_email &&
    payload.admin_name &&
    parseCompanySettings(serviceSettings).staff_limits?.[ROLES.ADMIN] !== null &&
    parseCompanySettings(serviceSettings).staff_limits?.[ROLES.ADMIN] < 1
  ) {
    throw new AppError("Admin seat limit must be at least 1 when creating a company admin.", 400);
  }

  const result = await db.withTransaction(async (transaction) => {
    const companyId = await createPrefixedId("cmp");
    const company = await companyRepository.createCompany(
      {
        company_id: companyId,
        name: companyName,
        slug: companySlug,
        contact_email: payload.contact_email || payload.admin_email || "",
        admin_email: payload.admin_email || "",
        contact_phone: payload.contact_phone || payload.phone || null,
        industry: payload.industry || null,
        status: payload.status || "trial",
        settings_currency: payload.settings_currency || payload.default_currency || "INR",
        settings_timezone: payload.settings_timezone || payload.timezone || "Asia/Kolkata",
        settings_date_format: payload.settings_date_format || "DD/MM/YYYY",
        country: payload.country || "India",
        website: payload.website || null,
        smtp_host: payload.smtp_host || null,
        smtp_port: payload.smtp_port || null,
        smtp_user: payload.smtp_user || null,
        smtp_password: payload.smtp_password || null,
        service_settings: serviceSettings,
      },
      transaction
    );

    let adminUser = null;

    if (payload.admin_email && payload.admin_name) {
      const adminEmail = String(payload.admin_email).trim().toLowerCase();
      const existingUser = await userRepository.getUserByEmail(adminEmail, transaction);
      if (existingUser) {
        throw new AppError("Admin email already exists.", 409);
      }

      adminUser = await userRepository.createUser(
        {
          user_id: await createPrefixedId("usr"),
          company_id: companyId,
          role: ROLES.ADMIN,
          name: String(payload.admin_name).trim(),
          email: adminEmail,
          phone: payload.admin_phone || null,
          department: "Administration",
          password: await hashPassword(adminPassword),
          created_by: auth.userId,
        },
        transaction
      );
    }

    await auditRepository.createLog(
      {
        audit_id: await createPrefixedId("aud"),
        company_id: companyId,
        action: "company.created",
        performed_by: auth.userId,
        target_user: adminUser?.user_id || null,
        user_email: adminUser?.email || null,
        user_role: adminUser?.role || null,
        details: {
          company_name: companyName,
          company_slug: companySlug,
        },
      },
      transaction
    );

    return {
      company: await companyRepository.getCompanyWithSettings(companyId, transaction),
      admin_user: sanitizeUser(adminUser),
    };
  });

  let credentialDelivery = null;

  if (result.admin_user) {
    const platformCompany = await getPlatformCompany();
    credentialDelivery = await emailService.dispatchUserCredentialsEmail({
      company: result.company,
      platformCompany,
      user: result.admin_user,
      temporaryPassword: adminPassword,
      createdByName: auth.name || auth.email || "GreenCRM",
      talentId: buildTalentId(result.admin_user.company_id, result.admin_user.user_id),
    });
  }

  return {
    ...result,
    credential_delivery: credentialDelivery,
    admin_temporary_password:
      result.admin_user && (process.env.NODE_ENV !== "production" || credentialDelivery?.delivery !== "email")
        ? adminPassword
        : undefined,
  };
}

async function updateCompany(auth, companyId, payload) {
  assertCompanyAccess(auth, companyId);

  if (![ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.ADMIN].includes(auth.role)) {
    throw new AppError("Only super admins, platform admins, and company admins can update company settings.", 403);
  }

  const company = await companyRepository.getCompanyById(companyId);
  if (!company) {
    throw new AppError("Company not found.", 404);
  }

  const updates = {};

  [
    "name",
    "contact_email",
    "admin_email",
    "contact_phone",
    "industry",
    "website",
    "country",
    "settings_date_format",
    "branding_primary_color",
    "branding_logo_url",
    "smtp_host",
    "smtp_port",
    "smtp_user",
    "smtp_password",
    "service_access",
  ].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      updates[key] = payload[key];
    }
  });

  if (Object.prototype.hasOwnProperty.call(payload, "settings_currency") || Object.prototype.hasOwnProperty.call(payload, "default_currency")) {
    updates.settings_currency = payload.settings_currency || payload.default_currency;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "settings_timezone") || Object.prototype.hasOwnProperty.call(payload, "timezone")) {
    updates.settings_timezone = payload.settings_timezone || payload.timezone;
  }

  if ([ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN].includes(auth.role) && payload.status) {
    updates.status = payload.status;
  }

  const serviceSettingsPatch = buildServiceSettingsPatch(payload);
  if (Object.keys(serviceSettingsPatch).length) {
    updates.service_settings = mergeDeep(parseCompanySettings(company.service_settings), serviceSettingsPatch);
  } else if (Object.prototype.hasOwnProperty.call(payload, "service_settings")) {
    updates.service_settings = mergeDeep(
      parseCompanySettings(company.service_settings),
      parseCompanySettings(payload.service_settings)
    );
  }

  const updatedCompany = await companyRepository.updateCompany(companyId, updates);

  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: companyId,
    action: "company.updated",
    performed_by: auth.userId,
    target_user: null,
    user_email: auth.email,
    user_role: auth.role,
    details: payload,
  });

  return updatedCompany;
}

async function deleteCompany(auth, companyId) {
  if (auth.role !== ROLES.SUPER_ADMIN) {
    throw new AppError("Only super admins can archive companies.", 403);
  }

  const company = await companyRepository.getCompanyById(companyId);
  if (!company) {
    throw new AppError("Company not found.", 404);
  }

  await companyRepository.updateCompany(companyId, { status: "suspended" });
  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: companyId,
    action: "company.archived",
    performed_by: auth.userId,
    target_user: null,
    user_email: auth.email,
    user_role: auth.role,
    details: null,
  });

  return { archived: true };
}

async function getCompanyStats(auth, companyId) {
  assertCompanyAccess(auth, companyId);

  const company = await companyRepository.getCompanyById(companyId);
  if (!company) {
    throw new AppError("Company not found.", 404);
  }

  const [userResult, leadResult, taskResult, productResult] = await Promise.all([
    db.query("SELECT COUNT(*) AS total FROM users WHERE company_id = ? AND is_active = 1", [companyId]),
    db.query("SELECT COUNT(*) AS total FROM leads WHERE company_id = ? AND is_active = 1", [companyId]),
    db.query("SELECT COUNT(*) AS total FROM tasks WHERE company_id = ? AND status = 'pending'", [companyId]),
    db.query("SELECT COUNT(*) AS total FROM products WHERE company_id = ? AND is_active = 1", [companyId]),
  ]);

  const userRows = userResult[0];
  const leadRows = leadResult[0];
  const taskRows = taskResult[0];
  const productRows = productResult[0];

  return {
    company_id: companyId,
    users: userRows[0].total,
    leads: leadRows[0].total,
    pending_tasks: taskRows[0].total,
    products: productRows[0].total,
    status: company.status,
    service_settings: parseCompanySettings(company.service_settings),
  };
}

module.exports = {
  createCompany,
  deleteCompany,
  getCompany,
  getCompanyStats,
  listCompanies,
  updateCompany,
};
