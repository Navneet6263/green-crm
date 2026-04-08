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
}

startServer().catch((error) => {
  console.error("Failed to start GreenCRM API", error);
  process.exit(1);
});
