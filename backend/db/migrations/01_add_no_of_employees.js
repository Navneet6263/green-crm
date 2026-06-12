require("dotenv").config({ path: "backend/.env" });
const db = require("../connection");

async function migrate() {
  try {
    console.log("Adding no_of_employees column to leads table...");
    await db.query(`
      ALTER TABLE leads 
      ADD no_of_employees VARCHAR(50) NULL;
    `);
    console.log("Migration completed successfully.");
  } catch (error) {
    if (String(error).includes("already exists") || String(error).includes("Duplicate column") || String(error).includes("Column names in each table must be unique")) {
      console.log("Column already exists. Skipping.");
    } else {
      console.error("Migration failed:", error);
    }
  } finally {
    process.exit(0);
  }
}

migrate();
