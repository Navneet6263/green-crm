require("dotenv").config({ path: "./.env" });
const db = require("./db/connection");

async function run() {
  try {
    await db.query("ALTER TABLE attendance_events ADD location NVARCHAR(500) NULL");
    console.log("Added location column successfully.");
  } catch (err) {
    console.log("Error or already exists:", err.message);
  }
  process.exit(0);
}

run();
