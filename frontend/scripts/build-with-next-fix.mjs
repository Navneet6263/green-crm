import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const rootDir = process.cwd();
const serverDir = resolve(rootDir, ".next", "server");
const chunkDir = resolve(serverDir, "chunks");
const pagesDir = resolve(serverDir, "pages");
const pagesManifestPath = resolve(serverDir, "pages-manifest.json");

function syncServerChunks() {
  if (!existsSync(chunkDir)) {
    return;
  }

  mkdirSync(serverDir, { recursive: true });

  for (const entry of readdirSync(chunkDir)) {
    if (!entry.endsWith(".js")) {
      continue;
    }

    const sourcePath = join(chunkDir, entry);
    const targetPath = join(serverDir, entry);

    try {
      const sourceStat = statSync(sourcePath);
      const targetStat = existsSync(targetPath) ? statSync(targetPath) : null;

      if (!targetStat || targetStat.size !== sourceStat.size) {
        copyFileSync(sourcePath, targetPath);
      }
    } catch (_error) {
      // Ignore transient files while Next is still writing build output.
    }
  }
}

function syncPagesManifest() {
  if (!existsSync(pagesDir)) {
    return;
  }

  const manifest = {};
  const pageEntries = [
    ["/_app", "_app.js"],
    ["/_document", "_document.js"],
    ["/_error", "_error.js"],
  ];

  for (const [route, fileName] of pageEntries) {
    if (existsSync(join(pagesDir, fileName))) {
      manifest[route] = `pages/${fileName}`;
    }
  }

  const tempManifestPath = `${pagesManifestPath}.tmp`;
  try {
    writeFileSync(tempManifestPath, JSON.stringify(manifest, null, 2));
    renameSync(tempManifestPath, pagesManifestPath);
  } catch (_error) {
    // Ignore transient Windows file locks while Next is still finalizing the server manifest.
  }
}

const command = process.platform === "win32" ? "node_modules\\.bin\\next.cmd build" : "node_modules/.bin/next build";
const child = spawn(command, {
  cwd: rootDir,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => {
  syncServerChunks();
  syncPagesManifest();
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
