const STORAGE_KEY = "greencrm-session";
const COOKIE_MAX_AGE = 60 * 60 * 12;

function setCookie(name, value) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

function clearCookie(name) {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

export function loadSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
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
