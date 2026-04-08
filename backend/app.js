const express = require("express");
const cors = require("cors");

const routes = require("./routes");
const { globalRateLimiter } = require("./middlewares/rateLimiter");
const { errorHandler, notFoundHandler } = require("./middlewares/errorHandler");

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

      callback(new Error("Origin not allowed by CORS"));
    },
  };
}

function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: "1mb" }));
  app.use(globalRateLimiter);

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "greencrm-api",
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api", routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
