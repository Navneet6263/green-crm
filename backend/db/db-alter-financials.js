// file: c:/Users/Naveent Kumar/Downloads/GreenCrm/backend/db/db-alter-financials.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const db = require("./connection");

async function run() {
  try {
    console.log("Finding statistics on remaining_payment...");
    const [stats] = await db.query(`
      SELECT s.name AS StatName
      FROM sys.stats s
      INNER JOIN sys.stats_columns sc ON s.object_id = sc.object_id AND s.stats_id = sc.stats_id
      INNER JOIN sys.columns c ON sc.object_id = c.object_id AND sc.column_id = c.column_id
      WHERE s.object_id = OBJECT_ID('leads') AND c.name = 'remaining_payment'
    `);

    for (const r of stats) {
      console.log(`Dropping statistic leads.${r.StatName}...`);
      await db.query(`DROP STATISTICS leads.${r.StatName}`);
    }

    console.log("Dropping computed column remaining_payment...");
    try {
      await db.query("ALTER TABLE leads DROP COLUMN remaining_payment");
      console.log("Dropped successfully.");
    } catch (e) {
      console.log("Could not drop column:", e.message);
    }

    console.log("Creating computed column remaining_payment based on estimated_value...");
    await db.query("ALTER TABLE leads ADD remaining_payment AS (estimated_value - advance_received) PERSISTED");
    console.log("Created successfully.");

  } catch (error) {
    console.error("Migration failed:", error);
  }
  process.exit(0);
}

run();
