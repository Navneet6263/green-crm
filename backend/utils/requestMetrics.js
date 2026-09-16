const { AsyncLocalStorage } = require("node:async_hooks");
const { performance } = require("node:perf_hooks");
const storage = new AsyncLocalStorage();

async function measureDatabase(operation) {
  const metrics = storage.getStore();
  if (!metrics) return operation();
  const start = performance.now();
  metrics.dbQueries += 1;
  try { return await operation(); }
  finally { metrics.dbMs += performance.now() - start; }
}

module.exports = { storage, measureDatabase };
