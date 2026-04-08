class AppError extends Error {
  constructor(message, statusCode = 400, details = null, code = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
  }
}

module.exports = AppError;
