const db = require("../db/connection");
const companyRepository = require("../repositories/companyRepository");
const userRepository = require("../repositories/userRepository");
const auditRepository = require("../repositories/auditRepository");
const { MAX_SUPER_ADMINS, ROLE_VALUES, ROLES } = require("../constants/roles");
const { PLATFORM_COMPANY_ID } = require("../db/schema");
const { buildTalentId, createPrefixedId } = require("../utils/ids");
const { hashPassword } = require("../utils/auth");
const { buildPaginatedResult, parsePagination } = require("../utils/pagination");
const AppError = require("../utils/appError");
const { assertCompanyAccess } = require("../utils/tenant");

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const { password: _pw, ...safeUser } = user;
  return {
    ...safeUser,
    talent_id: buildTalentId(safeUser.company_id, safeUser.user_id),
  };
}

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function getManagedCompanyId(auth, payload) {
  if (auth.role === ROLES.SUPER_ADMIN && payload.company_id) {
    return payload.company_id;
  }

  if (auth.role === ROLES.SUPER_ADMIN && normalizeRole(payload.role) === ROLES.SUPER_ADMIN) {
    return PLATFORM_COMPANY_ID;
  }

  return auth.companyId;
}

function assertManagementAccess(auth, targetUser, nextRole) {
  assertCompanyAccess(auth, targetUser.company_id);

  if (auth.role === ROLES.ADMIN) {
    if ([ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(targetUser.role) || [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(nextRole)) {
      throw new AppError("Company admins can manage employees only.", 403);
    }
  }
}

async function listUsers(auth, query) {
  const pagination = parsePagination(query);
  const companyId =
    auth.role === ROLES.SUPER_ADMIN ? query.company_id || null : auth.companyId;

  if (companyId) {
    assertCompanyAccess(auth, companyId);
  }

  const { rows, total } = await userRepository.listUsers(
    {
      companyId,
      role: normalizeRole(query.role) || null,
      search: query.search || "",
      pagination,
    }
  );

  return buildPaginatedResult(rows.map(sanitizeUser), total, pagination);
}

async function createUser(auth, payload) {
  if (![ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(auth.role)) {
    throw new AppError("Only super admins and company admins can create users.", 403);
  }

  const role = normalizeRole(payload.role);
  const email = String(payload.email || "").trim().toLowerCase();
  const name = String(payload.name || payload.full_name || "").trim();
  const companyId = getManagedCompanyId(auth, payload);

  if (!ROLE_VALUES.includes(role)) {
    throw new AppError("Invalid role.");
  }

  if (!companyId || !email || !name) {
    throw new AppError("Company, name, and email are required.");
  }

  if (auth.role === ROLES.ADMIN && [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role)) {
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
  } else {
    assertCompanyAccess(auth, companyId);
    const company = await companyRepository.getCompanyById(companyId);
    if (!company) {
      throw new AppError("Company not found.", 404);
    }
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
        company_id: role === ROLES.SUPER_ADMIN ? PLATFORM_COMPANY_ID : companyId,
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
        },
      },
      transaction
    );

    return userRepository.getUserById(createdUser.user_id, transaction);
  });

  return {
    ...sanitizeUser(user),
    temporary_password: payload.password ? null : temporaryPassword,
  };
}

async function updateUser(auth, userId, payload) {
  const user = await userRepository.getUserById(userId);
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const nextRole = normalizeRole(payload.role || user.role);
  assertManagementAccess(auth, user, nextRole);

  if (!ROLE_VALUES.includes(nextRole)) {
    throw new AppError("Invalid role.");
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

  const updated = await userRepository.updateUser(user.user_id, user.company_id, updates);

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

  const updated = await userRepository.setUserActive(
    user.user_id,
    user.company_id,
    nextActive,
    auth.userId
  );

  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: updated.company_id,
    action: nextActive ? "user.activated" : "user.deactivated",
    performed_by: auth.userId,
    target_user: updated.user_id,
    user_email: updated.email,
    user_role: updated.role,
    details: null,
  });

  return sanitizeUser(updated);
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
    auth.role === ROLES.SUPER_ADMIN ? companyId || auth.companyId : auth.companyId;

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
