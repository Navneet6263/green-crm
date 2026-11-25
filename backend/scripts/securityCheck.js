// Checks a running GreenCRM from the outside, the way a stranger would see it. Read-only by default.
//   node scripts/securityCheck.js https://your-crm-domain
//   node scripts/securityCheck.js https://your-crm-domain --api https://your-crm-domain/api --rate-limit
// --rate-limit sends 22 wrong logins for a made-up email to prove the limit works; your address is then
// blocked from logging in for 15 minutes, so run it from a different network if you need to log in.
// Needs Node 18 or newer. Exit code 1 when anything FAILs.
const crypto = require("node:crypto");

const args = process.argv.slice(2);
const base = String(args.find((a) => /^https?:\/\//.test(a)) || "").replace(/\/$/, "");
const apiIndex = args.indexOf("--api");
const api = (apiIndex >= 0 ? args[apiIndex + 1] : `${base}/api`).replace(/\/$/, "");
const checkRateLimit = args.includes("--rate-limit");
if (!base) {
  console.log("Usage: node scripts/securityCheck.js https://your-crm-domain [--api https://api-url] [--rate-limit]");
  process.exit(2);
}

const results = [];
const add = (level, area, text) => results.push({ level, area, text });
const get = (url, options = {}) => fetch(url, { redirect: "manual", ...options }).catch((error) => ({ status: 0, error, headers: new Headers(), text: async () => "" }));
const body = async (res) => (typeof res.text === "function" ? res.text().catch(() => "") : "");

function forgeToken(secret) {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const head = `${enc({ alg: "HS256", typ: "JWT" })}.${enc({ sub: "security-check-nobody", role: "super-admin", iat: now, exp: now + 300, jti: crypto.randomUUID() })}`;
  return `${head}.${crypto.createHmac("sha256", secret).update(head).digest("base64url")}`;
}

async function checkUnauthenticated() {
  for (const path of ["/auth/profile", "/auth/me", "/leads", "/companies", "/super-admin/overview", "/developer/overview"]) {
    const res = await get(`${api}${path}`);
    if (res.status === 401) add("PASS", "Login required", `${path} → 401 without a login`);
    else add("FAIL", "Login required", `${path} → ${res.status || res.error?.message} without a login (must be 401)`);
    const cache = res.headers.get("cache-control") || "";
    if (path === "/auth/profile") {
      if (/no-store/.test(cache)) add("PASS", "No caching", `API answers say Cache-Control: ${cache}`);
      else add("FAIL", "No caching", `API answer Cache-Control is "${cache || "missing"}" (needs no-store)`);
    }
  }
  const twice = await Promise.all([get(`${api}/auth/profile`), get(`${api}/auth/profile`)]);
  if (twice.every((r) => r.status === 401)) add("PASS", "Session leak", "Repeated anonymous profile requests never return a signed-in user");
  else add("FAIL", "Session leak", "An anonymous profile request returned something other than 401: a proxy may be caching sessions");
}

async function checkForgedTokens() {
  const res = await get(`${api}/auth/profile`, { headers: { Authorization: `Bearer ${forgeToken("greencrm-dev-secret")}` } });
  const text = await body(res);
  if (/not active|not found|signed out/i.test(text)) add("FAIL", "Token secret", "The server accepts tokens signed with the public development secret. Set a strong JWT_SECRET now.");
  else if (res.status === 401) add("PASS", "Token secret", "Tokens signed with the development secret are refused");
  else add("WARN", "Token secret", `Unexpected answer ${res.status} to a forged token`);
}

async function checkFiles() {
  const paths = ["/.env", "/.env.local", "/.env.production", "/.git/config", "/.git/HEAD", "/backend/.env", "/api/.env", "/server.js", "/package.json", "/api/uploads/", "/uploads/"];
  for (const path of paths) {
    const url = path.startsWith("/api/") ? `${api}${path.slice(4)}` : `${base}${path}`;
    const res = await get(url);
    const text = (await body(res)).slice(0, 4000);
    const leaked = res.status === 200 && (/^\s*[A-Z_]{3,}\s*=/m.test(text) || /\[core\]|^ref: /m.test(text) || /"dependencies"\s*:/.test(text) || /require\(["']/.test(text));
    if (leaked) add("FAIL", "Hidden files", `${path} is publicly readable`);
    else add("PASS", "Hidden files", `${path} → ${res.status} (not exposed)`);
  }
  const doc = await get(`${api}/uploads/leads/CMP0001/LD0001/general/security-check.pdf`);
  if (doc.status === 401) add("PASS", "Documents", "Lead documents need a login (401 without one)");
  else add("FAIL", "Documents", `Lead document path answered ${doc.status} without a login (must be 401)`);
}

async function checkSourceMaps(html) {
  const scripts = [...html.matchAll(/src="([^"]*\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]).slice(0, 4);
  if (!scripts.length) return add("WARN", "Source maps", "No Next.js script found on the home page to test");
  for (const src of scripts) {
    const url = src.startsWith("http") ? src : `${base}${src}`;
    const res = await get(`${url}.map`);
    if (res.status === 200 && /"sources"/.test(await body(res))) add("FAIL", "Source maps", `${src}.map is public: readable source code is exposed`);
    else add("PASS", "Source maps", `${src.split("/").pop()}.map → ${res.status}`);
  }
}

function checkHeaders(name, res, { html }) {
  const h = (k) => res.headers.get(k) || "";
  const need = [["x-content-type-options", /nosniff/i], ["referrer-policy", /./]];
  if (html) need.push(["x-frame-options", /deny|sameorigin/i]);
  if (base.startsWith("https")) need.push(["strict-transport-security", /max-age=\d+/]);
  for (const [key, re] of need) {
    if (re.test(h(key))) add("PASS", `${name} headers`, `${key}: ${h(key)}`);
    else add("FAIL", `${name} headers`, `${key} is missing or weak ("${h(key)}")`);
  }
  if (html && !/frame-ancestors/.test(h("content-security-policy"))) add("WARN", `${name} headers`, "Content-Security-Policy has no frame-ancestors rule");
  if (h("x-powered-by")) add("WARN", `${name} headers`, `x-powered-by reveals "${h("x-powered-by")}"`);
  if (/nginx\/\d|apache\/\d/i.test(h("server"))) add("WARN", `${name} headers`, `Server header shows the version: "${h("server")}" (set server_tokens off)`);
}

async function checkCors() {
  const res = await get(`${api}/auth/profile`, { headers: { Origin: "https://evil.example" } });
  const allow = res.headers.get("access-control-allow-origin") || "";
  if (allow === "https://evil.example" || (allow === "*" && res.headers.get("access-control-allow-credentials") === "true")) add("FAIL", "CORS", `A stranger's site is allowed: ${allow}`);
  else add("PASS", "CORS", `A stranger's site gets no permission (${allow || "no header"})`);
  if (res.status >= 500) add("WARN", "CORS", `An unknown site causes a ${res.status} server error`);
}

async function checkRedirects() {
  const res = await get(`${base}/dashboard`);
  const location = res.headers.get("location") || "";
  if ([301, 302, 303, 307, 308].includes(res.status) && /\/login/.test(location)) add("PASS", "Pages", "/dashboard without a login sends you to /login");
  else add("WARN", "Pages", `/dashboard without a login answered ${res.status} ${location}`);
  const login = await body(await get(`${base}/login`));
  if (/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/.test(login)) add("FAIL", "Pages", "The login page contains a login token");
  else add("PASS", "Pages", "The login page carries no token or session data");
}

async function checkLimits() {
  if (!checkRateLimit) return add("WARN", "Rate limit", "Skipped (add --rate-limit to test; it blocks your address from logging in for 15 minutes)");
  let limited = false;
  for (let i = 0; i < 22 && !limited; i += 1) {
    const res = await get(`${api}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: `security-check-${Date.now()}@example.invalid`, password: "wrong-password" }) });
    if (res.status === 429) limited = true;
  }
  add(limited ? "PASS" : "FAIL", "Rate limit", limited ? "Repeated wrong logins are blocked (429)" : "22 wrong logins were not blocked");
}

(async () => {
  console.log(`Checking ${base} (API ${api})\n`);
  const home = await get(`${base}/`);
  const html = await body(home);
  checkHeaders("Website", home, { html: true });
  checkHeaders("API", await get(`${api}/auth/profile`), { html: false });
  await checkUnauthenticated();
  await checkForgedTokens();
  await checkFiles();
  await checkSourceMaps(html);
  await checkCors();
  await checkRedirects();
  await checkLimits();

  const icon = { PASS: "✔", WARN: "!", FAIL: "✖" };
  for (const r of results) console.log(`${icon[r.level]} ${r.level.padEnd(4)}  ${r.area.padEnd(18)} ${r.text}`);
  const fails = results.filter((r) => r.level === "FAIL").length;
  console.log(`\n${results.filter((r) => r.level === "PASS").length} passed, ${results.filter((r) => r.level === "WARN").length} warnings, ${fails} failed.`);
  process.exitCode = fails ? 1 : 0;
})();
