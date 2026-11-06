const dns = require("node:dns").promises;
const net = require("node:net");
const AppError = require("../../utils/appError");

// Webhooks may only call public HTTPS addresses, never the CRM's own server or office network.
// Checked when the webhook is saved and again before every call (the name could change).

function isPrivateV4(ip) {
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}

function isPrivate(ip) {
  if (net.isIPv4(ip)) return isPrivateV4(ip);
  const low = ip.toLowerCase();
  if (low.startsWith("::ffff:")) return isPrivate(low.slice(7));
  return low === "::" || low === "::1" || low.startsWith("fc") || low.startsWith("fd") || low.startsWith("fe8") || low.startsWith("fe9") || low.startsWith("fea") || low.startsWith("feb") || low.startsWith("ff");
}

function parseUrl(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch (_error) {
    throw new AppError("Enter the full web address, starting with https://", 400, null, "WEBHOOK_URL_INVALID");
  }
  if (url.protocol !== "https:") throw new AppError("The webhook address must start with https://", 400, null, "WEBHOOK_URL_INVALID");
  if (url.username || url.password) throw new AppError("Do not put a user name or password in the address.", 400, null, "WEBHOOK_URL_INVALID");
  if (url.port && url.port !== "443") throw new AppError("Use the normal HTTPS port (443).", 400, null, "WEBHOOK_URL_INVALID");
  if (url.toString().length > 500) throw new AppError("The address is too long.", 400, null, "WEBHOOK_URL_INVALID");
  return url;
}

/** Throws unless every address the name points to is public. */
async function assertPublicUrl(value, lookup = dns.lookup) {
  const url = parseUrl(value);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) throw new AppError("That address is inside a private network.", 400, null, "WEBHOOK_URL_PRIVATE");
  const addresses = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => {
    throw new AppError("That web address could not be found.", 400, null, "WEBHOOK_URL_UNKNOWN");
  });
  if (!addresses.length || addresses.some((entry) => isPrivate(entry.address))) {
    throw new AppError("That address is inside a private network.", 400, null, "WEBHOOK_URL_PRIVATE");
  }
  return url;
}

module.exports = { assertPublicUrl, isPrivate, parseUrl };
