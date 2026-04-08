const AppError = require("../utils/appError");

function errorHandler(error, _req, res, _next) {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code || null,
      details: error.details || null,
    });
    return;
  }

  if (error && error.code === "ER_DUP_ENTRY") {
    res.status(409).json({
      error: "A unique value already exists for this record.",
      code: error.code,
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    error: "Internal server error",
    code: error && error.code ? error.code : null,
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
