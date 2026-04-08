const { writeFileSync } = require("node:fs");
const { join } = require("node:path");

const { getPerformanceStatements, getSchemaStatements } = require("./schema");

const outputPath = join(__dirname, "sqlserver-bootstrap.sql");
const statements = [
  "-- GreenCRM SQL Server bootstrap",
  "-- Run this file in SSMS against the target database",
  "",
  ...getSchemaStatements(),
  "",
  "-- Performance indexes",
  ...getPerformanceStatements(),
  "",
].join("\nGO\n\n");

writeFileSync(outputPath, `${statements}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
