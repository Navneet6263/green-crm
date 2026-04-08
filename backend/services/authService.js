const db = require("../db/connection");
const companyRepository = require("../repositories/companyRepository");
const userRepository = require("../repositories/userRepository");
const auditRepository = require("../repositories/auditRepository");
const emailService = require("./emailService");
const { MAX_SUPER_ADMINS, ROLES } = require("../constants/roles");
const { PLATFORM_COMPANY_ID } = require("../db/schema");
const { buildAuthToken, buildTimedToken, hashPassword, verifyPassword, verifyToken } = require("../utils/auth");
const { buildTalentId, createPrefixedId, slugify } = require("../utils/ids");
const AppError = require("../utils/appError");

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

async function registerCompany(payload) {
  const companyName = String(payload.company_name || payload.name || "").trim();
  const companySlug = slugify(payload.company_slug || payload.slug || companyName);
  const adminName = String(payload.admin_name || "").trim();
  const adminEmail = String(payload.admin_email || "").trim().toLowerCase();
  const password = String(payload.password || "");

  if (!companyName || !companySlug || !adminName || !adminEmail || password.length < 8) {
    throw new AppError("Company name, company slug, admin details, and an 8+ char password are required.");
  }

  const existingCompany = await companyRepository.getCompanyBySlug(companySlug);
  if (existingCompany) {
    throw new AppError("Company slug is already in use.", 409);
  }

  const existingUser = await userRepository.getUserByEmail(adminEmail);
  if (existingUser) {
    throw new AppError("A user with this email already exists.", 409);
  }

  const result = await db.withTransaction(async (transaction) => {
    const companyId = await createPrefixedId("cmp");
    const adminUserId = await createPrefixedId("usr");

    const company = await companyRepository.createCompany(
      {
        company_id: companyId,
        name: companyName,
        slug: companySlug,
        contact_email: payload.contact_email || adminEmail,
        admin_email: adminEmail,
        contact_phone: payload.contact_phone || payload.phone || null,
        industry: payload.industry || null,
        status: payload.status || "trial",
        settings_currency: payload.default_currency || payload.settings_currency || "INR",
        settings_timezone: payload.timezone || payload.settings_timezone || "Asia/Kolkata",
        settings_date_format: payload.settings_date_format || "DD/MM/YYYY",
        country: payload.country || "India",
        website: payload.website || null,
      },
      transaction
    );

    const adminUser = await userRepository.createUser(
      {
        user_id: adminUserId,
        company_id: companyId,
        role: ROLES.ADMIN,
        name: adminName,
        email: adminEmail,
        phone: payload.admin_phone || null,
        department: "Administration",
        password: await hashPassword(password),
      },
      transaction
    );

    await auditRepository.createLog(
      {
        audit_id: await createPrefixedId("aud"),
        company_id: companyId,
        action: "company.registered",
        performed_by: adminUserId,
        target_user: adminUserId,
        user_email: adminEmail,
        user_role: ROLES.ADMIN,
        details: {
          company_name: companyName,
          company_slug: companySlug,
        },
      },
      transaction
    );

    return {
      company,
      user: adminUser,
    };
  });

  return {
    company: result.company,
    user: sanitizeUser(result.user),
    token: buildAuthToken(result.user),
  };
}

async function login(payload) {
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");

  if (!email || !password) {
    throw new AppError("Email and password are required.", 400);
  }

  const user = await userRepository.getUserByEmail(email);
  if (!user || !user.password) {
    throw new AppError("Invalid credentials.", 401);
  }

  const passwordMatches = await verifyPassword(password, user.password);
  if (!passwordMatches) {
    throw new AppError("Invalid credentials.", 401);
  }

  if (!user.is_active) {
    throw new AppError("User account is not active.", 401);
  }

  await userRepository.updateLastLogin(user.user_id);
  const company = await companyRepository.getCompanyWithSettings(user.company_id);

  return {
    user: sanitizeUser(user),
    company,
    token: buildAuthToken(user),
  };
}

async function getProfile(auth) {
  const user = await userRepository.getUserById(auth.userId);
  const company = await companyRepository.getCompanyWithSettings(auth.companyId);

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  return {
    user: sanitizeUser(user),
    company,
  };
}

async function checkAuth(auth) {
  const profile = await getProfile(auth);

  return {
    valid: true,
    ...profile,
  };
}

async function verify(auth) {
  return checkAuth(auth);
}

async function logout(auth, tokenPayload) {
  if (tokenPayload?.jti && tokenPayload?.exp) {
    await db.query(
      `
        INSERT IGNORE INTO token_blacklist
          (company_id, user_id, token_id, reason, deactivated_by, expires_at)
        VALUES (?, ?, ?, 'LOGOUT', ?, FROM_UNIXTIME(?))
      `,
      [auth.companyId, auth.userId, tokenPayload.jti, auth.userId, tokenPayload.exp]
    );
  }

  return { logged_out: true };
}

async function forgotPassword(payload) {
  const email = String(payload.email || "").trim().toLowerCase();
  if (!email) {
    throw new AppError("Email is required.");
  }

  const genericResponse = {
    message: "If this email exists, password reset instructions have been sent.",
  };

  const user = await userRepository.getUserByEmail(email);
  if (!user) {
    return genericResponse;
  }

  const token = buildTimedToken(
    {
      sub: user.user_id,
      company_id: user.company_id,
      purpose: "password-reset",
    },
    60 * 30
  );

  const frontendBase = emailService.getFrontendUrl();
  const resetUrl = `${frontendBase}/reset-password?token=${encodeURIComponent(token)}`;
  const company = await companyRepository.getCompanyWithSettings(user.company_id);
  const delivery = await emailService.sendPasswordResetEmail({
    user,
    company,
    resetUrl,
  });
  const exposeDebugPreview = process.env.NODE_ENV !== "production";

  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: user.company_id,
    action: "auth.password_reset_requested",
    performed_by: user.user_id,
    target_user: user.user_id,
    user_email: user.email,
    user_role: user.role,
    details: {
      delivery: delivery.delivery,
      provider: delivery.provider,
      preview_available: Boolean(delivery.preview_reset_url),
    },
  });

  return {
    ...genericResponse,
    ...(exposeDebugPreview
      ? {
          delivery: delivery.delivery,
          preview_reset_url: delivery.preview_reset_url,
          reset_token: delivery.delivery === "email" ? undefined : token,
        }
      : {}),
  };
}

async function resetPassword(payload) {
  const token = String(payload.token || payload.reset_token || "").trim();
  const newPassword = String(payload.new_password || payload.password || "").trim();

  if (!token || newPassword.length < 8) {
    throw new AppError("Reset token and an 8+ character password are required.");
  }

  const tokenPayload = verifyToken(token);
  if (!tokenPayload || tokenPayload.purpose !== "password-reset") {
    throw new AppError("Reset token is invalid or expired.", 400);
  }

  const user = await userRepository.getUserById(tokenPayload.sub);
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  await userRepository.updateUser(
    user.user_id,
    user.company_id,
    {
      password: await hashPassword(newPassword),
      is_temporary_password: 0,
    }
  );

  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: user.company_id,
    action: "auth.password_reset_completed",
    performed_by: user.user_id,
    target_user: user.user_id,
    user_email: user.email,
    user_role: user.role,
    details: null,
  });

  return { reset: true };
}

async function updateProfile(auth, payload) {
  const user = await userRepository.getUserById(auth.userId);
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const updatedUser = await userRepository.updateUser(user.user_id, user.company_id, {
    name: payload.name !== undefined ? String(payload.name || "").trim() : user.name,
    phone: payload.phone !== undefined ? String(payload.phone || "").trim() : user.phone,
    department: payload.department !== undefined ? String(payload.department || "").trim() : user.department,
    app_preferences: payload.app_preferences || user.app_preferences || null,
    notification_prefs: payload.notification_prefs || user.notification_prefs || null,
  });

  return {
    user: sanitizeUser(updatedUser),
    company: await companyRepository.getCompanyWithSettings(user.company_id),
  };
}

async function changePassword(auth, payload) {
  const currentPassword = String(payload.current_password || "").trim();
  const newPassword = String(payload.new_password || "").trim();

  if (!currentPassword || newPassword.length < 8) {
    throw new AppError("Current password and an 8+ character new password are required.");
  }

  const user = await userRepository.getUserById(auth.userId);
  if (!user || !user.password) {
    throw new AppError("User not found.", 404);
  }

  const passwordMatches = await verifyPassword(currentPassword, user.password);
  if (!passwordMatches) {
    throw new AppError("Current password is incorrect.", 400);
  }

  await userRepository.updateUser(user.user_id, user.company_id, {
    password: await hashPassword(newPassword),
    is_temporary_password: 0,
  });

  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: user.company_id,
    action: "auth.password_changed",
    performed_by: user.user_id,
    target_user: user.user_id,
    user_email: user.email,
    user_role: user.role,
    details: null,
  });

  return { changed: true };
}

async function getSuperAdminStatus() {
  const total = await userRepository.countSuperAdmins();

  return {
    total,
    max: MAX_SUPER_ADMINS,
    can_create_more: total < MAX_SUPER_ADMINS,
    platform_company_id: PLATFORM_COMPANY_ID,
  };
}

module.exports = {
  changePassword,
  checkAuth,
  forgotPassword,
  getProfile,
  getSuperAdminStatus,
  login,
  logout,
  registerCompany,
  resetPassword,
  updateProfile,
  verify,
};
