const AppError = require("../utils/appError");

function authorize(...roles) {
  return function authorizationMiddleware(req, _res, next) {
    if (!req.auth) {
      next(new AppError("Authentication context missing", 401));
      return;
    }

    if (!roles.includes(req.auth.role)) {
      next(new AppError("You do not have permission to perform this action", 403));
      return;
    }

    next();
  };
}

module.exports = authorize;
