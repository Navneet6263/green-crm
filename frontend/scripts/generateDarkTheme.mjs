// Builds app/styles/dark.css: the dark theme for the whole app, from the colours the app already uses.
// Run again after adding new hard-coded colours:  node scripts/generateDarkTheme.mjs
//
// How it works: Tailwind v4 classes read colours from CSS variables (bg-white -> var(--color-white)),
// so under html.dark the palette is swapped: light shades become dark and dark shades become light.
// Hard-coded colours like bg-[#f8fafc] do not use variables, so each one found in the code gets its own rule.
// Anything inside .theme-light (the navy sidebar) or .marketing-root (landing, blog, login) keeps the light colours.
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];
const MIRROR = { 50: "950", 100: "900", 200: "800", 300: "700", 400: "500", 500: "400", 600: "400", 700: "300", 800: "200", 900: "100", 950: "50" };
const NEUTRAL_DARK = {
  white: "#111a2e", black: "#000",
  50: "#0b1222", 100: "#1a2540", 200: "#26324d", 300: "#36425e", 400: "#6d7b97", 500: "#8b98b1",
  600: "#a6b1c6", 700: "#c3ccdb", 800: "#dbe2ec", 900: "#eef2f7", 950: "#f8fafc",
};
const NEUTRALS = ["slate", "gray"];

function readPalette(css) {
  const out = {};
  for (const m of css.matchAll(/--color-([a-z]+)-(\d+):\s*([^;]+);/g)) (out[m[1]] ||= {})[m[2]] = m[3].trim();
  return out;
}
const palette = { ...readPalette(readFileSync(join(root, "node_modules/tailwindcss/theme.css"), "utf8")), ...readPalette(readFileSync(join(root, "app/tailwind.css"), "utf8")) };

const darkVars = [];
const lightVars = [];
for (const [name, shades] of Object.entries(palette)) {
  for (const step of STEPS) {
    if (!shades[step]) continue;
    lightVars.push(`--color-${name}-${step}: ${shades[step]};`);
    darkVars.push(`--color-${name}-${step}: ${NEUTRALS.includes(name) ? NEUTRAL_DARK[step] : colouredDark(shades, step)};`);
  }
}

/** The mirrored shade (the nearest one when a palette stops at 900). Tinted backgrounds (50–200) are blended into the card colour so they stay calm. */
function colouredDark(shades, step) {
  const order = STEPS.indexOf(MIRROR[step]);
  const towards = order > STEPS.indexOf(step) ? -1 : 1;
  let mirrored = null;
  for (let i = order; i >= 0 && i < STEPS.length && !mirrored; i += towards) mirrored = shades[STEPS[i]];
  mirrored ||= shades[step];
  const blend = { 50: 45, 100: 60, 200: 75 }[step];
  return blend ? `color-mix(in oklab, ${mirrored} ${blend}%, ${NEUTRAL_DARK.white})` : mirrored;
}
darkVars.push(`--color-white: ${NEUTRAL_DARK.white};`, "--color-cream: #131c30;");
lightVars.push("--color-white: #fff;", "--color-cream: #fbf9f3;");

// ---- hard-coded colours --------------------------------------------------
function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".next"].includes(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (/\.(jsx?|tsx?)$/.test(entry)) files.push(path);
  }
  return files;
}
const classes = new Set();
for (const file of [...walk(join(root, "app")), ...walk(join(root, "components"))]) {
  for (const m of readFileSync(file, "utf8").matchAll(/(?<![\w:-])(bg|text|border|ring|divide|outline|fill|stroke)-\[#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\]/g)) classes.add(`${m[1]}|${m[2]}`);
}

const hexToRgb = (h) => { const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h; return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255); };
function rgbToHsl([r, g, b]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
const hsl = (h, s, l) => `hsl(${h.toFixed(0)} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%)`;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** The dark-theme colour for one hard-coded colour, by what it paints; null keeps it. */
function darkFor(kind, hex) {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  if (kind === "bg" || kind === "fill") {
    if (l > 0.82) return hsl(h, s * 0.35, clamp(0.08 + (1 - l) * 0.9, 0.08, 0.2));
    return null;
  }
  if (kind === "text" || kind === "stroke") {
    if (l < 0.5) return hsl(h, s * 0.75, clamp(1 - l * 0.85, 0.68, 0.94));
    return null;
  }
  if (l > 0.7) return hsl(h, s * 0.3, clamp(0.16 + (1 - l) * 0.5, 0.18, 0.3));
  return null;
}
const PROPERTY = { bg: "background-color", text: "color", border: "border-color", ring: "--tw-ring-color", outline: "outline-color", fill: "fill", stroke: "stroke" };
const NOT_LIGHT = ":not(:where(.theme-light, .theme-light *, .marketing-root, .marketing-root *))";
const rules = [];
for (const item of [...classes].sort()) {
  const [kind, hex] = item.split("|");
  const value = darkFor(kind, hex);
  if (!value) continue;
  const cls = `.${kind}-\\[\\#${hex}\\]`;
  rules.push(kind === "divide"
    ? `html.dark ${cls}${NOT_LIGHT} > :not(:last-child) { border-color: ${value}; }`
    : `html.dark ${cls}${NOT_LIGHT} { ${PROPERTY[kind]}: ${value}; }`);
}

const css = `/* Generated by scripts/generateDarkTheme.mjs. Do not edit by hand: change the script and run it again. */
html.dark {
  color-scheme: dark;
  ${darkVars.join("\n  ")}
}
html.dark .theme-light, html.dark .marketing-root {
  color-scheme: light;
  ${lightVars.join("\n  ")}
}
html.dark body { background-color: #0a1020; }
/* Dimmed backdrops behind panels stay dark. */
html.dark [class*="bg-slate-900/"]${NOT_LIGHT}, html.dark [class*="bg-slate-950/"]${NOT_LIGHT}, html.dark [class*="bg-black/"]${NOT_LIGHT} { background-color: rgb(2 6 23 / 0.6); }
/* Charts */
html.dark .recharts-cartesian-grid line { stroke: #26324d; }
html.dark .recharts-text, html.dark .recharts-cartesian-axis-tick-value { fill: #8b98b1; }
html.dark .recharts-tooltip-wrapper .recharts-default-tooltip { background-color: #111a2e !important; border-color: #26324d !important; }
html.dark img${NOT_LIGHT} { opacity: 0.95; }
${rules.join("\n")}
`;
writeFileSync(join(root, "app/styles/dark.css"), css);
console.log(`dark.css: ${darkVars.length} colours, ${rules.length} hard-coded colour rules`);
