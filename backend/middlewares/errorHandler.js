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

  // Errors from Express itself (file not found, bad JSON, body too large) keep their 4xx status.
  const status = Number(error?.statusCode || error?.status);
  if (status >= 400 && status < 500) {
    res.status(status).json({
      error: error.expose && error.message ? error.message : status === 404 ? "Not found." : "The request could not be completed.",
      code: null,
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
