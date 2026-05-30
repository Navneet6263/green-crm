const fs = require("node:fs/promises");
const path = require("node:path");

const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");

async function cleanupOldFiles(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await cleanupOldFiles(fullPath);
        // If directory is now empty, delete it too!
        const subEntries = await fs.readdir(fullPath);
        if (subEntries.length === 0) {
          await fs.rmdir(fullPath);
          console.log(`[CLEANUP JOB] Removed empty directory: ${fullPath}`);
        }
      } else {
        const stats = await fs.stat(fullPath);
        const ageInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
        if (ageInDays > 20) {
          await fs.unlink(fullPath);
          console.log(`[CLEANUP JOB] Deleted expired file: ${fullPath} (Age: ${ageInDays.toFixed(1)} days)`);
        }
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(`[CLEANUP JOB ERROR] Failed in directory: ${dirPath}`, error);
    }
  }
}

function startCleanupJob() {
  console.log("[CLEANUP JOB] Starting file cleanup scheduler (runs every 24 hours, age threshold: 20 days)...");
  
  // Run once immediately on startup
  setTimeout(() => {
    cleanupOldFiles(UPLOAD_ROOT)
      .then(() => console.log("[CLEANUP JOB] Initial check completed."))
      .catch((err) => console.error("[CLEANUP JOB ERROR] Initial check failed:", err));
  }, 5000); // Wait 5 seconds after startup

  // Schedule to run every 24 hours
  const INTERVAL_24H = 24 * 60 * 60 * 1000;
  const intervalId = setInterval(() => {
    cleanupOldFiles(UPLOAD_ROOT)
      .then(() => console.log("[CLEANUP JOB] Scheduled run completed."))
      .catch((err) => console.error("[CLEANUP JOB ERROR] Scheduled run failed:", err));
  }, INTERVAL_24H);

  // Allow server shutdown to not be blocked by the interval
  intervalId.unref();
}

module.exports = {
  startCleanupJob,
};
