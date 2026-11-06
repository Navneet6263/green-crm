require("dotenv").config();

const createApp = require("./app");
const { initializeDatabase } = require("./db/connection");

const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  const app = createApp();

  app.listen(PORT, () => {
    console.log(`GreenCRM API listening on port ${PORT}`);
  });

  // DB connect in background — server already running
  try {
    await initializeDatabase();
    console.log("Database connected.");
  } catch (error) {
    console.error("DB connection failed (server still running):", error.message);
  }

  // Start background jobs
  try {
    const { startCleanupJob } = require("./jobs/cleanupJob");
    startCleanupJob();
    // Plan renewals (won leads and customer subscriptions) are reminded by the renewal job below.
    require("./jobs/inboxSyncJob").startInboxSyncJob();
    require("./jobs/renewalReminderJob").startRenewalReminderJob();
    require("./jobs/reminderEmailJob").startReminderEmailJob();
    require("./jobs/developerJob").startDeveloperJob();
  } catch (jobError) {
    console.error("Failed to start background jobs:", jobError.message);
  }
}

startServer().catch((error) => {
  console.error("Failed to start GreenCRM API", error);
  process.exit(1);
});
