const memory = new Map();
let redisClientPromise = null;
let redisUnavailable = false;

function ttlMs(ttlSeconds) {
  return Math.max(Number(ttlSeconds || 0), 0) * 1000;
}

function readMemory(key) {
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt <= Date.now()) {
    memory.delete(key);
    return null;
  }
  return entry.value;
}

function writeMemory(key, value, ttlSeconds) {
  const duration = ttlMs(ttlSeconds);
  memory.set(key, { value, expiresAt: duration ? Date.now() + duration : null });
  return value;
}

function clearMemory(prefix) {
  for (const key of memory.keys()) {
    if (!prefix || key.startsWith(prefix)) {
      memory.delete(key);
    }
  }
}

async function getRedisClient() {
  if (redisUnavailable || (!process.env.REDIS_URL && !process.env.REDIS_HOST)) {
    return null;
  }

  if (!redisClientPromise) {
    redisClientPromise = (async () => {
      try {
        const { createClient } = require("redis");
        const client = createClient({
          url: process.env.REDIS_URL || undefined,
          socket: process.env.REDIS_URL ? undefined : {
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT || 6379),
          },
          password: process.env.REDIS_PASSWORD || undefined,
        });
        client.on("error", () => {
          redisUnavailable = true;
        });
        await client.connect();
        return client;
      } catch (_error) {
        redisUnavailable = true;
        return null;
      }
    })();
  }

  return redisClientPromise;
}

async function getJson(key) {
  const cached = readMemory(key);
  if (cached !== null) return cached;
  const client = await getRedisClient();
  if (!client) return null;
  const value = await client.get(key).catch(() => null);
  if (!value) return null;
  const parsed = JSON.parse(value);
  writeMemory(key, parsed, Number(process.env.COMMUNICATION_CACHE_TTL_SECONDS || 30));
  return parsed;
}

async function setJson(key, value, ttlSeconds) {
  writeMemory(key, value, ttlSeconds);
  const client = await getRedisClient();
  if (!client) return value;
  const payload = JSON.stringify(value);
  const ttl = Math.max(Number(ttlSeconds || 0), 0);
  if (ttl) {
    await client.set(key, payload, { EX: ttl }).catch(() => null);
  } else {
    await client.set(key, payload).catch(() => null);
  }
  return value;
}

async function deleteKey(key) {
  memory.delete(key);
  const client = await getRedisClient();
  if (client) {
    await client.del(key).catch(() => null);
  }
}

async function deletePrefix(prefix) {
  clearMemory(prefix);
  const client = await getRedisClient();
  if (!client) return;
  const keys = client.scanIterator ? [] : await client.keys(`${prefix}*`).catch(() => []);
  if (client.scanIterator) {
    for await (const key of client.scanIterator({ MATCH: `${prefix}*`, COUNT: 50 })) {
      keys.push(key);
    }
  }
  if (keys.length) {
    await client.del(keys).catch(() => null);
  }
}

module.exports = {
  deleteKey,
  deletePrefix,
  getJson,
  setJson,
};
