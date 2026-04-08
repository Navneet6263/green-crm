const sql = require("mssql");

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeValue(value) {
  if (value === undefined) {
    return null;
  }

  if (value === null || value instanceof Date || Buffer.isBuffer(value)) {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return value;
}

function createConfig(databaseName) {
  const requestedPort = process.env.DB_PORT;
  const poolMax = parseNumber(process.env.DB_POOL_MAX || process.env.DB_POOL_LIMIT, 20);
  const poolMin = parseNumber(process.env.DB_POOL_MIN, 0);
  const idleTimeoutMillis = parseNumber(process.env.DB_POOL_IDLE_TIMEOUT_MS, 30000);

  return {
    server: process.env.DB_HOST || process.env.DB_SERVER || "localhost",
    user: process.env.DB_USER || "sa",
    password: process.env.DB_PASS || process.env.DB_PASSWORD || "",
    database: databaseName || process.env.DB_NAME || "greencrm",
    pool: {
      max: Math.max(poolMax, 1),
      min: Math.max(poolMin, 0),
      idleTimeoutMillis: Math.max(idleTimeoutMillis, 0),
    },
    connectionTimeout: Math.max(parseNumber(process.env.DB_CONNECTION_TIMEOUT_MS, 15000), 0),
    requestTimeout: Math.max(parseNumber(process.env.DB_REQUEST_TIMEOUT_MS, 15000), 0),
    options: {
      encrypt: parseBoolean(process.env.DB_ENCRYPT, false),
      trustServerCertificate: parseBoolean(
        process.env.DB_TRUST_SERVER_CERTIFICATE ?? process.env.DB_TRUST_SERVER_CERT,
        true
      ),
      enableArithAbort: true,
      ...(process.env.DB_INSTANCE ? { instanceName: process.env.DB_INSTANCE } : {}),
    },
    ...(process.env.DB_DOMAIN ? { domain: process.env.DB_DOMAIN } : {}),
    ...(requestedPort ? { port: Number(requestedPort) } : {}),
  };
}

const config = createConfig();
let poolPromise;

function prepareSql(rawSql, rawParams = []) {
  const normalizedSql = String(rawSql || "").trim();
  const normalizedParams = rawParams.map(normalizeValue);

  let paramIndex = 0;
  const boundSql = normalizedSql.replace(/\?/g, () => `@p${paramIndex++}`);

  if (paramIndex !== normalizedParams.length) {
    throw new Error("SQL parameter count mismatch while preparing query");
  }

  return {
    sqlText: boundSql,
    params: normalizedParams,
    isInsert: /^\s*INSERT\b/i.test(normalizedSql),
    isSelect: /^\s*SELECT\b/i.test(normalizedSql),
  };
}

function getRequester(target) {
  return typeof target.request === "function" ? target.request() : new sql.Request(target);
}

function buildRequest(target, params) {
  const request = getRequester(target);

  params.forEach((value, index) => {
    request.input(`p${index}`, value);
  });

  return request;
}

function sumRowsAffected(result) {
  return (result.rowsAffected || []).reduce((total, count) => total + count, 0);
}

function formatResult(result, meta) {
  if (meta.isSelect) {
    return [result.recordset || [], result];
  }

  if (meta.isInsert) {
    const insertRow = result.recordsets?.[result.recordsets.length - 1]?.[0] || {};
    return [
      {
        affectedRows: sumRowsAffected(result),
        insertId: insertRow.insertId ?? null,
      },
      result,
    ];
  }

  return [
    {
      affectedRows: sumRowsAffected(result),
    },
    result,
  ];
}

async function executeQuery(target, rawSql, params = []) {
  const prepared = prepareSql(rawSql, params);
  const request = buildRequest(target, prepared.params);
  const sqlText = prepared.isInsert
    ? `${prepared.sqlText}; SELECT CAST(SCOPE_IDENTITY() AS BIGINT) AS insertId;`
    : prepared.sqlText;
  const result = await request.query(sqlText);

  return formatResult(result, prepared);
}

async function ensureDatabase() {
  if (!parseBoolean(process.env.DB_CREATE_IF_MISSING, false)) {
    return;
  }

  const masterPool = new sql.ConnectionPool(createConfig(process.env.DB_ADMIN_DATABASE || "master"));

  try {
    await masterPool.connect();

    await masterPool
      .request()
      .input("databaseName", sql.NVarChar, config.database)
      .query(
        `
          IF DB_ID(@databaseName) IS NULL
          BEGIN
            DECLARE @sql NVARCHAR(MAX) = N'CREATE DATABASE ' + QUOTENAME(@databaseName);
            EXEC(@sql);
          END
        `
      );
  } finally {
    await masterPool.close();
  }
}

async function initializeDatabase() {
  if (!poolPromise) {
    poolPromise = (async () => {
      await ensureDatabase();
      const pool = new sql.ConnectionPool(config);
      await pool.connect();
      return pool;
    })().catch((error) => {
      poolPromise = null;
      throw error;
    });
  }

  return poolPromise;
}

async function query(rawSql, params) {
  const pool = await initializeDatabase();
  return executeQuery(pool, rawSql, params);
}

async function withTransaction(handler) {
  const pool = await initializeDatabase();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  const executor = {
    query(rawSql, params) {
      return executeQuery(transaction, rawSql, params);
    },
  };

  try {
    const result = await handler(executor);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  config,
  initializeDatabase,
  query,
  withTransaction,
};
