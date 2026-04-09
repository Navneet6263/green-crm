const db = require("../db/connection");
const platformAccessRepository = require("../repositories/platformAccessRepository");
const { PLATFORM_OPERATOR_ROLES } = require("../constants/roles");
const userRepository = require("../repositories/userRepository");
const { verifyToken } = require("../utils/auth");
const AppError = require("../utils/appError");
const {
  cacheAuthState,
  clearPendingAuthState,
  getAuthCacheKey,
  getCachedAuthState,
  getPendingAuthState,
  isAuthKeyRevoked,
  rememberRevokedAuthKey,
  setPendingAuthState,
} = require("../utils/requestAuthCache");

async function resolveAuthState(payload, cacheKey) {
  if (payload.jti) {
    const [blacklistRows] = await db.query(
      "SELECT TOP 1 token_id FROM token_blacklist WHERE token_id = ?",
      [payload.jti]
    );

    if (blacklistRows.length) {
      rememberRevokedAuthKey(cacheKey, payload.exp);
      throw new AppError("Session has been logged out", 401);
    }
  }

  const user = await userRepository.getUserById(payload.sub);

  if (!user || !user.is_active) {
    throw new AppError("User account is not active", 401);
  }

  const managedCompanyIds = PLATFORM_OPERATOR_ROLES.includes(user.role)
    ? await platformAccessRepository.listCompanyIdsByUser(user.user_id)
    : [];

  return {
    userId: user.user_id,
    companyId: user.company_id,
    email: user.email,
    name: user.name,
    role: user.role,
    managedCompanyIds,
  };
}

async function authenticate(req, _res, next) {
  try {
    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;

    if (!token) {
      next(new AppError("Authentication required", 401));
      return;
    }

    const payload = verifyToken(token);

    if (!payload) {
      next(new AppError("Invalid or expired token", 401));
      return;
    }

    const cacheKey = getAuthCacheKey(payload, token);

    if (isAuthKeyRevoked(cacheKey)) {
      next(new AppError("Session has been logged out", 401));
      return;
    }

    const cachedAuthState = getCachedAuthState(cacheKey);

    if (cachedAuthState) {
      req.auth = cachedAuthState;
      req.token = token;
      req.tokenPayload = payload;
      next();
      return;
    }

    let pendingAuthState = getPendingAuthState(cacheKey);

    if (!pendingAuthState) {
      pendingAuthState = resolveAuthState(payload, cacheKey).then((authState) => {
        cacheAuthState(cacheKey, authState, payload.exp);
        return authState;
      });
      setPendingAuthState(cacheKey, pendingAuthState);
    }

    try {
      req.auth = await pendingAuthState;
    } finally {
      clearPendingAuthState(cacheKey, pendingAuthState);
    }

    req.token = token;
    req.tokenPayload = payload;

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authenticate;
