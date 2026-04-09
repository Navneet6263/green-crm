const db = require("../db/connection");
const companyRepository = require("../repositories/companyRepository");
const platformAccessRepository = require("../repositories/platformAccessRepository");
const userRepository = require("../repositories/userRepository");
const auditRepository = require("../repositories/auditRepository");
const emailService = require("./emailService");
const {
  MAX_SUPER_ADMINS,
  PLATFORM_OPERATOR_ROLES,
  ROLE_VALUES,
  ROLES,
} = require("../constants/roles");
const { PLATFORM_COMPANY_ID } = require("../db/schema");
const { buildTalentId, createPrefixedId } = require("../utils/ids");
const { hashPassword } = require("../utils/auth");
const { buildPaginatedResult, parsePagination } = require("../utils/pagination");
const AppError = require("../utils/appError");
const { getRoleLimit } = require("../utils/companySettings");
const { assertCompanyAccess, getAccessibleCompanyIds, isPlatformOperatorRole } = require("../utils/tenant");

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const { password: _pw, ...safeUser } = user;
  const sanitized = {
    ...safeUser,
    talent_id: buildTalentId(safeUser.company_id, safeUser.user_id),
  };

  if (safeUser.managed_company_ids) {
    sanitized.managed_company_ids = safeUser.managed_company_ids;
  }

  return sanitized;
}

function normalizeIdList(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean))];
}

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function isPlatformRootRole(role) {
  return [ROLES.SUPER_ADMIN, ...PLATFORM_OPERATOR_ROLES].includes(role);
}

function isTenantRole(role) {
  return !isPlatformRootRole(role);
}

function getManagedCompanyId(auth, payload) {
  if ([ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN].includes(auth.role) && payload.company_id) {
    return payload.company_id;
  }

  if (isPlatformRootRole(normalizeRole(payload.role))) {
    return PLATFORM_COMPANY_ID;
  }

  return auth.companyId;
}

async function getPlatformCompany() {
  return companyRepository.getCompanyWithSettings(PLATFORM_COMPANY_ID);
}

async function assertRoleCapacity(company, role, companyId) {
  if (!companyId || isPlatformRootRole(role)) {
    return;
  }

  const roleLimit = getRoleLimit(company?.service_settings, role);
  if (roleLimit === null) {
    return;
  }

  const activeCount = await userRepository.countActiveUsersByRole(companyId, role);
  if (activeCount >= roleLimit) {
    throw new AppError(
      `Seat limit reached for ${role}. This company can keep only ${roleLimit} active ${role} user(s).`,
      403
    );
  }
}

async function ensureCompaniesExist(companyIds) {
  const normalizedCompanyIds = normalizeIdList(companyIds);

  for (const companyId of normalizedCompanyIds) {
    const company = await companyRepository.getCompanyById(companyId);
    if (!company || company.company_id === PLATFORM_COMPANY_ID) {
      throw new AppError(`Company ${companyId} is not available for assignment.`, 400);
    }
  }

  return normalizedCompanyIds;
}

async function resolveManagedCompanyIds(auth, payload) {
  if (!payload || !Object.prototype.hasOwnProperty.call(payload, "managed_company_ids")) {
    return undefined;
  }

  const requestedCompanyIds = await ensureCompaniesExist(payload.managed_company_ids);

  if (auth.role !== ROLES.SUPER_ADMIN) {
    requestedCompanyIds.forEach((companyId) => assertCompanyAccess(auth, companyId));
  }

  if (!requestedCompanyIds.length) {
    throw new AppError("At least one company assignment is required for platform operators.", 400);
  }

  return requestedCompanyIds;
}

async function attachManagedCompanyIdsToUsers(users, executor) {
  const items = Array.isArray(users) ? users : [];
  const platformUsers = items.filter((user) => isPlatformOperatorRole(user.role));

  if (!platformUsers.length) {
    return items;
  }

  const managedCompanyMap = await platformAccessRepository.listCompanyIdsByUsers(
    platformUsers.map((user) => user.user_id),
    executor
  );

  return items.map((user) =>
    isPlatformOperatorRole(user.role)
      ? { ...user, managed_company_ids: managedCompanyMap[user.user_id] || [] }
      : user
  );
}

async function attachManagedCompanyIdsToUser(user, executor) {
  if (!user || !isPlatformOperatorRole(user.role)) {
    return user;
  }

  return {
    ...user,
    managed_company_ids: await platformAccessRepository.listCompanyIdsByUser(user.user_id, executor),
  };
}

function assertManagementAccess(auth, targetUser, nextRole) {
  assertCompanyAccess(auth, targetUser.company_id);

  if (auth.role === ROLES.PLATFORM_ADMIN) {
    if (isPlatformRootRole(targetUser.role) || isPlatformRootRole(nextRole)) {
      throw new AppError("Platform admins can manage tenant users only.", 403);
    }
  }

  if (auth.role === ROLES.ADMIN) {
    if ([ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(targetUser.role) || [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(nextRole) || isPlatformOperatorRole(nextRole)) {
      throw new AppError("Company admins can manage employees only.", 403);
    }
  }
}

async function listUsers(auth, query) {
  const pagination = parsePagination(query);
  let companyId = null;
  let companyIds = null;

  if (auth.role === ROLES.SUPER_ADMIN) {
    companyId = query.company_id || null;
  } else if (isPlatformOperatorRole(auth.role)) {
    companyId = query.company_id || null;
    if (companyId) {
      assertCompanyAccess(auth, companyId);
    } else {
      companyIds = getAccessibleCompanyIds(auth);
    }
  } else {
    companyId = auth.companyId;
  }

  if (companyId) {
    assertCompanyAccess(auth, companyId);
  }

  const { rows, total } = await userRepository.listUsers(
    {
      companyId,
      companyIds,
      role: normalizeRole(query.role) || null,
      search: query.search || "",
      pagination,
    }
  );

  const users = await attachManagedCompanyIdsToUsers(rows);
  return buildPaginatedResult(users.map(sanitizeUser), total, pagination);
}

async function createUser(auth, payload) {
  if (![ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.ADMIN].includes(auth.role)) {
    throw new AppError("Only super admins, platform admins, and company admins can create users.", 403);
  }

  const role = normalizeRole(payload.role);
  const email = String(payload.email || "").trim().toLowerCase();
  const name = String(payload.name || payload.full_name || "").trim();
  const companyId = getManagedCompanyId(auth, payload);
  const managedCompanyIds = isPlatformOperatorRole(role)
    ? await resolveManagedCompanyIds(auth, payload)
    : undefined;

  if (!ROLE_VALUES.includes(role)) {
    throw new AppError("Invalid role.");
  }

  if (!companyId || !email || !name) {
    throw new AppError("Company, name, and email are required.");
  }

  if (auth.role === ROLES.PLATFORM_ADMIN && isTenantRole(role) && !payload.company_id) {
    throw new AppError("Platform admins must choose a company before creating a tenant user.", 400);
  }

  if (auth.role === ROLES.ADMIN && !isTenantRole(role)) {
    throw new AppError("Company admins can only create tenant employees.", 403);
  }

  if (auth.role === ROLES.ADMIN && role === ROLES.ADMIN) {
    throw new AppError("Company admins can only create employees.", 403);
  }

  if (role === ROLES.SUPER_ADMIN) {
    if (auth.role !== ROLES.SUPER_ADMIN) {
      throw new AppError("Only super admins can create another super admin.", 403);
    }

    const total = await userRepository.countSuperAdmins();
    if (total >= MAX_SUPER_ADMINS) {
      throw new AppError("Maximum super admin limit reached.", 403);
    }
  } else if (isPlatformOperatorRole(role)) {
    if (auth.role !== ROLES.SUPER_ADMIN) {
      throw new AppError("Only super admins can create platform operators.", 403);
    }
    if (!managedCompanyIds?.length) {
      throw new AppError("Platform operators require at least one assigned company.", 400);
    }
  } else {
    assertCompanyAccess(auth, companyId);
    const company = await companyRepository.getCompanyWithSettings(companyId);
    if (!company) {
      throw new AppError("Company not found.", 404);
    }

    await assertRoleCapacity(company, role, companyId);
  }

  const existingUser = await userRepository.getUserByEmail(email);
  if (existingUser) {
    throw new AppError("A user with this email already exists.", 409);
  }

  const temporaryPassword =
    String(payload.password || "").trim() || `Temp@${Math.random().toString(36).slice(-8)}1`;

  const user = await db.withTransaction(async (transaction) => {
    const createdUser = await userRepository.createUser(
      {
        user_id: await createPrefixedId("usr"),
        company_id: isPlatformRootRole(role) ? PLATFORM_COMPANY_ID : companyId,
        role,
        name,
        email,
        phone: payload.phone || null,
        department: payload.department || null,
        password: await hashPassword(temporaryPassword),
        created_by: auth.userId,
      },
      transaction
    );

    if (isPlatformOperatorRole(role)) {
      await platformAccessRepository.replaceCompanyIdsForUser(
        createdUser.user_id,
        managedCompanyIds,
        auth.userId,
        transaction
      );
    }

    await userRepository.updateUser(
      createdUser.user_id,
      createdUser.company_id,
      {
        is_super_admin: role === ROLES.SUPER_ADMIN ? 1 : 0,
        super_admin_level: role === ROLES.SUPER_ADMIN ? 1 : 0,
        can_manage_super_admins: role === ROLES.SUPER_ADMIN ? 1 : 0,
        is_temporary_password: payload.password ? 0 : 1,
      },
      transaction
    );

    await auditRepository.createLog(
      {
        audit_id: await createPrefixedId("aud"),
        company_id: createdUser.company_id,
        action: "user.created",
        performed_by: auth.userId,
        target_user: createdUser.user_id,
        user_email: createdUser.email,
        user_role: createdUser.role,
        details: {
          role,
          managed_company_ids: managedCompanyIds || null,
        },
      },
      transaction
    );

    return attachManagedCompanyIdsToUser(
      await userRepository.getUserById(createdUser.user_id, transaction),
      transaction
    );
  });

  const effectiveCompany =
    isPlatformRootRole(role)
      ? await getPlatformCompany()
      : await companyRepository.getCompanyWithSettings(user.company_id);
  const platformCompany = await getPlatformCompany();
  const credentialDelivery = await emailService.dispatchUserCredentialsEmail({
    company: effectiveCompany,
    platformCompany,
    user: sanitizeUser(user),
    temporaryPassword,
    createdByName: auth.name || auth.email || "GreenCRM",
    talentId: buildTalentId(user.company_id, user.user_id),
  });

  return {
    ...sanitizeUser(user),
    credential_delivery: credentialDelivery,
    temporary_password:
      process.env.NODE_ENV !== "production" || credentialDelivery?.delivery !== "email"
        ? temporaryPassword
        : null,
  };
}

async function updateUser(auth, userId, payload) {
  const user = await userRepository.getUserById(userId);
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const nextRole = normalizeRole(payload.role || user.role);
  const currentIsPlatformRoot = isPlatformRootRole(user.role);
  const nextIsPlatformRoot = isPlatformRootRole(nextRole);
  assertManagementAccess(auth, user, nextRole);

  if (!ROLE_VALUES.includes(nextRole)) {
    throw new AppError("Invalid role.");
  }

  if (currentIsPlatformRoot !== nextIsPlatformRoot) {
    throw new AppError("Move between platform and tenant roles by creating a new account.", 400);
  }

  if (nextRole === ROLES.SUPER_ADMIN && auth.role !== ROLES.SUPER_ADMIN) {
    throw new AppError("Only super admins can manage super admin accounts.", 403);
  }

  if (isPlatformOperatorRole(nextRole) && auth.role !== ROLES.SUPER_ADMIN) {
    throw new AppError("Only super admins can manage platform operator accounts.", 403);
  }

  if (currentIsPlatformRoot && nextIsPlatformRoot && user.company_id !== PLATFORM_COMPANY_ID) {
    throw new AppError("Platform users must remain attached to the platform workspace.", 400);
  }

  if (isTenantRole(nextRole)) {
    const company = await companyRepository.getCompanyWithSettings(user.company_id);
    if (!company) {
      throw new AppError("Company not found.", 404);
    }

    if (nextRole !== user.role) {
      await assertRoleCapacity(company, nextRole, user.company_id);
    }
  }

  const nextEmail = payload.email ? String(payload.email).trim().toLowerCase() : user.email;
  if (nextEmail !== user.email) {
    const existingUser = await userRepository.getUserByEmail(nextEmail);
    if (existingUser && existingUser.user_id !== user.user_id) {
      throw new AppError("A user with this email already exists.", 409);
    }
  }

  const updates = {
    name: payload.name !== undefined ? String(payload.name || "").trim() : user.name,
    email: nextEmail,
    phone: payload.phone !== undefined ? String(payload.phone || "").trim() : user.phone,
    department: payload.department !== undefined ? String(payload.department || "").trim() : user.department,
    role: nextRole,
  };

  if (payload.password) {
    updates.password = await hashPassword(String(payload.password));
  }

  const managedCompanyIds = isPlatformOperatorRole(nextRole)
    ? await resolveManagedCompanyIds(auth, payload)
    : undefined;

  const updated = await db.withTransaction(async (transaction) => {
    const nextUser = await userRepository.updateUser(user.user_id, user.company_id, updates, transaction);

    if (managedCompanyIds !== undefined) {
      await platformAccessRepository.replaceCompanyIdsForUser(
        user.user_id,
        managedCompanyIds,
        auth.userId,
        transaction
      );
    }

    return attachManagedCompanyIdsToUser(nextUser, transaction);
  });

  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: updated.company_id,
    action: "user.updated",
    performed_by: auth.userId,
    target_user: updated.user_id,
    user_email: updated.email,
    user_role: updated.role,
    details: {
      role: updated.role,
      managed_company_ids: managedCompanyIds || undefined,
    },
  });

  return sanitizeUser(updated);
}

async function toggleUser(auth, userId, payload = {}) {
  const user = await userRepository.getUserById(userId);
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  assertManagementAccess(auth, user, user.role);
  const nextActive =
    payload.is_active === undefined ? !Boolean(user.is_active) : Boolean(payload.is_active);

  if (nextActive && isTenantRole(user.role)) {
    const company = await companyRepository.getCompanyWithSettings(user.company_id);
    if (!company) {
      throw new AppError("Company not found.", 404);
    }

    await assertRoleCapacity(company, user.role, user.company_id);
  }

  const updated = await userRepository.setUserActive(
    user.user_id,
    user.company_id,
    nextActive,
    auth.userId
  );
  const decoratedUpdated = await attachManagedCompanyIdsToUser(updated);

  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: decoratedUpdated.company_id,
    action: nextActive ? "user.activated" : "user.deactivated",
    performed_by: auth.userId,
    target_user: decoratedUpdated.user_id,
    user_email: decoratedUpdated.email,
    user_role: decoratedUpdated.role,
    details: null,
  });

  return sanitizeUser(decoratedUpdated);
}

async function deleteUser(auth, userId) {
  const user = await userRepository.getUserById(userId);
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  if (user.user_id === auth.userId) {
    throw new AppError("You cannot delete your own account.");
  }

  await toggleUser(auth, userId, { is_active: false });
  return { deleted: true };
}

async function listUsersByRole(auth, role, companyId) {
  const effectiveCompanyId =
    [ROLES.SUPER_ADMIN, ...PLATFORM_OPERATOR_ROLES].includes(auth.role)
      ? companyId || auth.companyId
      : auth.companyId;

  assertCompanyAccess(auth, effectiveCompanyId);
  const rows = await userRepository.listUsersByRole(effectiveCompanyId, normalizeRole(role));
  return rows.map(sanitizeUser);
}

module.exports = {
  createUser,
  deleteUser,
  listUsers,
  listUsersByRole,
  toggleUser,
  updateUser,
};
