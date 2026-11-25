const STORAGE_KEY = "greencrm-session";
const COOKIE_MAX_AGE = 60 * 60 * 12;

function setCookie(name, value) {
  // Secure on https so the login cookie never travels over plain http.
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax${secure}`;
}

function clearCookie(name) {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

/** Seconds since 1970 when the login token stops working, read from the token itself (0 if unknown). */
function tokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(String(token).split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return Number(payload.exp) || 0;
  } catch (_error) {
    return 0;
  }
}

export function loadSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const session = raw ? JSON.parse(raw) : null;
    // A session whose token has run out is cleared at once, so an old browser never looks signed in.
    if (session && (!session.token || tokenExpiry(session.token) * 1000 <= Date.now())) {
      clearSession();
      return null;
    }
    return session;
  } catch (_error) {
    return null;
  }
}

export function saveSession(session) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  setCookie("authToken", session?.token || "");
  setCookie("authRole", session?.user?.role || "");
}

export function clearSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  clearCookie("authToken");
  clearCookie("authRole");
}
