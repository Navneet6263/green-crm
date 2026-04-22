require("dotenv").config();

process.env.DB_CREATE_IF_MISSING = "false";

const db = require("./db/connection");
const { PLATFORM_COMPANY_ID, bootstrapSchema } = require("./db/schema");
const { initializeCompanyCommunicationControls } = require("./services/communication/companyCommunicationSetupService");
const { hashPassword } = require("./utils/auth");
const { createPrefixedId } = require("./utils/ids");

async function ensurePlatformCompany() {
  const [existing] = await db.query(
    "SELECT company_id FROM companies WHERE company_id = ?",
    [PLATFORM_COMPANY_ID]
  );

  if (existing.length) {
    console.log(`- Platform company already exists: ${PLATFORM_COMPANY_ID}`);
    return;
  }

  await db.query(
    `INSERT INTO companies (
      company_id, name, slug, contact_email, admin_email, status, settings_currency, settings_timezone, country
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      PLATFORM_COMPANY_ID,
      "GreenCRM Platform",
      "platform",
      "navneet@greencrm.local",
      "navneet@greencrm.local",
      "active",
      "INR",
      "Asia/Kolkata",
      "India",
    ]
  );

  console.log(`+ Platform company created: ${PLATFORM_COMPANY_ID}`);
}

async function ensureSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL || "navneet@greencrm.local";
  const password = process.env.SUPER_ADMIN_PASSWORD || "navneet1";
  const [existing] = await db.query("SELECT user_id FROM users WHERE email = ?", [email]);
  const hashedPassword = await hashPassword(password);
  const appPrefs = JSON.stringify({ currency: "INR", dateFormat: "DD/MM/YYYY", language: "en", timezone: "Asia/Kolkata" });
  const notifPrefs = JSON.stringify({ emailNotifications: true, leadAlerts: true, pushNotifications: true, taskReminders: true, weeklyReports: true, marketingEmails: true });

  if (!existing.length) {
    await db.query(
      `INSERT INTO users (
        user_id, company_id, name, email, phone, password, role, is_active,
        is_super_admin, super_admin_level, can_manage_super_admins, app_preferences, notification_prefs
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        await createPrefixedId("usr"),
        PLATFORM_COMPANY_ID,
        "Navneet Kumar",
        email,
        "7004023078",
        hashedPassword,
        "super-admin",
        1,
        1,
        1,
        1,
        appPrefs,
        notifPrefs,
      ]
    );
    console.log(`+ Super-admin created: ${email}`);
  } else {
    await db.query(
      `UPDATE users
       SET password = ?, is_super_admin = 1, super_admin_level = 1, can_manage_super_admins = 1
       WHERE email = ?`,
      [hashedPassword, email]
    );
    console.log(`- Super-admin updated: ${email}`);
  }

  return { email, password };
}

async function run() {
  console.log("Bootstrapping SQL Server schema...");
  await bootstrapSchema();
  console.log("+ Schema ready");

  await ensurePlatformCompany();
  await initializeCompanyCommunicationControls(PLATFORM_COMPANY_ID);
  console.log("+ Platform communication controls ready");

  const credentials = await ensureSuperAdmin();

  console.log("\nSchema complete.");
  console.log(`Login: ${credentials.email}`);
  console.log(`Pass:  ${credentials.password}`);
  process.exit(0);
}

run().catch((error) => {
  console.error("Failed:", error.message);
  process.exit(1);
});
