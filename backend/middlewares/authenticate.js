const db = require("../db/connection");
const userRepository = require("../repositories/userRepository");
const { verifyToken } = require("../utils/auth");
const AppError = require("../utils/appError");

async function authenticate(req, _res, next) {
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

  if (payload.jti) {
    const [blacklistRows] = await db.query(
      "SELECT TOP 1 token_id FROM token_blacklist WHERE token_id = ?",
      [payload.jti]
    );

    if (blacklistRows.length) {
      next(new AppError("Session has been logged out", 401));
      return;
    }
  }

  const user = await userRepository.getUserById(payload.sub);

  if (!user || !user.is_active) {
    next(new AppError("User account is not active", 401));
    return;
  }

  req.auth = {
    userId: user.user_id,
    companyId: user.company_id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
  req.token = token;
  req.tokenPayload = payload;

  next();
}

module.exports = authenticate;
