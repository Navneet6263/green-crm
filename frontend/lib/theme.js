// Light or dark look for the app. Saved per browser; the layout script applies it before the page paints.
export const THEME_KEY = "greencrm-theme";

// Runs in <head> before React, so a dark page never flashes white.
export const THEME_BOOT_SCRIPT = `try{if(localStorage.getItem("${THEME_KEY}")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

export function currentTheme() {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function setTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try { localStorage.setItem(THEME_KEY, theme); } catch (_) { /* private mode: still switches for this visit */ }
  window.dispatchEvent(new CustomEvent("greencrm:theme", { detail: theme }));
}
