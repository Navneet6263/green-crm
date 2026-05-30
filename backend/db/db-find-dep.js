// file: c:/Users/Naveent Kumar/Downloads/GreenCrm/backend/db/db-find-dep.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const db = require("./connection");

async function run() {
  try {
    console.log("Checking definition of remaining_payment...");
    const [cols] = await db.query(`
      SELECT name, definition, is_persisted
      FROM sys.computed_columns
      WHERE object_id = OBJECT_ID('leads') AND name = 'remaining_payment'
    `);
    console.table(cols);

  } catch (error) {
    console.error("Diagnostic failed:", error);
  }
  process.exit(0);
}

run();
