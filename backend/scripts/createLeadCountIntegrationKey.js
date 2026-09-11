const { randomBytes, createHash } = require("node:crypto");

// Run manually in a private terminal. No credentials are written to disk.
// The raw key goes to the trusted Python developer; only its hash goes to AWS.
const companyId = process.argv[2];
const days = Number(process.argv[3] || 30);
if (!companyId || !/^[a-zA-Z0-9_-]{1,20}$/.test(companyId)
    || !Number.isInteger(days) || days < 1 || days > 90) {
  console.error("Usage: node scripts/createLeadCountIntegrationKey.js <company_id> [days: 1-90, default 30]");
  process.exitCode = 1;
} else {
  const token = `crm_lc_${randomBytes(32).toString("hex")}`;
  const hash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
  console.log("PRIVATE: share this raw key securely, never in Git, tickets or public logs:");
  console.log(token);
  console.log("\nBackend environment configuration (restart all backend instances after setting):");
  console.log(`CRM_LEAD_COUNTS_COMPANY_ID=${companyId}`);
  console.log(`CRM_LEAD_COUNTS_KEY_SHA256=${hash}`);
  console.log(`CRM_LEAD_COUNTS_KEY_EXPIRES_AT=${expiresAt}`);
}
