const path = require("node:path");
const express = require("express");
const cors = require("cors");

const routes = require("./routes");
const { globalRateLimiter } = require("./middlewares/rateLimiter");
const { errorHandler, notFoundHandler } = require("./middlewares/errorHandler");
const responseWrapper = require("./middlewares/responseWrapper");
const securityHeaders = require("./middlewares/securityHeaders");
const { protectUploads } = require("./middlewares/protectUploads");

const DEFAULT_LOCAL_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://[::1]:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://[::1]:3001",
  "http://localhost:3010",
  "http://127.0.0.1:3010",
  "http://[::1]:3010",
];

function parseOriginList(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isLocalDevOrigin(origin) {
  try {
    const { hostname } = new URL(origin);
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname);
  } catch (_error) {
    return false;
  }
}

function buildCorsOptions() {
  const allowedOrigins = new Set([
    ...DEFAULT_LOCAL_ORIGINS,
    ...parseOriginList(process.env.CORS_ORIGIN),
    ...parseOriginList(process.env.FRONTEND_URL),
  ]);
  const allowLocalDevOrigins = process.env.NODE_ENV !== "production";

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || (allowLocalDevOrigins && isLocalDevOrigin(origin))) {
        callback(null, true);
        return;
      }

      // Unknown sites get no CORS permission (the browser blocks them); not a server error.
      callback(null, false);
    },
  };
}

function createApp() {
  const app = express();
  const uploadsRoot = path.join(__dirname, "uploads");
  const captureRawBody = (req, _res, buffer) => {
    req.rawBody = buffer?.length ? buffer.toString("utf8") : "";
  };

  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(require("./middlewares/requestTiming"));
  app.use(securityHeaders);
  // Public API and lead capture links: open to any website, with their own limits and errors.
  app.use("/api/v1", require("./routes/publicApiRoutes"));
  app.use(cors(buildCorsOptions()));
  app.use(express.json({
    limit: "1mb",
    verify: captureRawBody,
    // Admin emails carry a screenshot; their route reads the body with a larger limit.
    type: (req) => Boolean(req.is("application/json")) && !/^\/api\/nudges\/?(\?|$)/.test(req.originalUrl || ""),
  }));
  app.use(express.urlencoded({ extended: false, limit: "1mb", verify: captureRawBody }));
  app.use(globalRateLimiter);

  // Standardize all API responses to { success, data, meta } shape
  app.use(responseWrapper);

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "greencrm-api",
      timestamp: new Date().toISOString(),
    });
  });

  // Lead documents need a signed-in person who may open that lead (see protectUploads).
  const staticOptions = { fallthrough: false, index: false, dotfiles: "deny", cacheControl: false };
  app.use("/api/uploads", protectUploads, express.static(uploadsRoot, staticOptions));
  app.use("/uploads", protectUploads, express.static(uploadsRoot, staticOptions));
  app.use("/api", routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
