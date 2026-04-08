require("dotenv").config();
process.env.DB_CREATE_IF_MISSING = "false";
const db = require("./db/connection");
const { hashPassword } = require("./utils/auth");
const { createPrefixedId } = require("./utils/ids");
const { ROLES } = require("./constants/roles");

async function runSchema() {
  console.log("Creating tables on SQL Server...\n");

  const tables = [

    // companies
    `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'companies')
    CREATE TABLE companies (
      id                    BIGINT IDENTITY(1,1) PRIMARY KEY,
      company_id            NVARCHAR(20)   NOT NULL,
      name                  NVARCHAR(255)  NOT NULL,
      slug                  NVARCHAR(191)  NOT NULL,
      contact_email         NVARCHAR(191)  NOT NULL DEFAULT '',
      contact_phone         NVARCHAR(30)   NULL,
      industry              NVARCHAR(120)  NULL,
      admin_email           NVARCHAR(191)  NOT NULL DEFAULT '',
      service_access        NVARCHAR(MAX)  NULL,
      service_settings      NVARCHAR(MAX)  NULL,
      usage_current_leads   INT            NOT NULL DEFAULT 0,
      usage_current_users   INT            NOT NULL DEFAULT 0,
      status                NVARCHAR(40)   NOT NULL DEFAULT 'trial',
      branding_logo_url     NVARCHAR(512)  NULL,
      branding_primary_color NVARCHAR(20)  NOT NULL DEFAULT '#3b82f6',
      settings_timezone     NVARCHAR(64)   NOT NULL DEFAULT 'Asia/Kolkata',
      settings_currency     NVARCHAR(16)   NOT NULL DEFAULT 'INR',
      settings_date_format  NVARCHAR(32)   NOT NULL DEFAULT 'DD/MM/YYYY',
      smtp_host             NVARCHAR(255)  NULL,
      smtp_port             SMALLINT       NULL,
      smtp_user             NVARCHAR(255)  NULL,
      smtp_password         NVARCHAR(255)  NULL,
      address               NVARCHAR(255)  NULL,
      city                  NVARCHAR(120)  NULL,
      state                 NVARCHAR(120)  NULL,
      country               NVARCHAR(120)  NOT NULL DEFAULT 'India',
      website               NVARCHAR(255)  NULL,
      created_at            DATETIME2      NOT NULL DEFAULT GETDATE(),
      updated_at            DATETIME2      NOT NULL DEFAULT GETDATE(),
      CONSTRAINT uq_companies_company_id UNIQUE (company_id),
      CONSTRAINT uq_companies_slug UNIQUE (slug)
    )`,

    // users
    `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'users')
    CREATE TABLE users (
      id                        BIGINT IDENTITY(1,1) PRIMARY KEY,
      user_id                   NVARCHAR(20)   NOT NULL,
      company_id                NVARCHAR(20)   NOT NULL,
      name                      NVARCHAR(191)  NOT NULL,
      email                     NVARCHAR(191)  NOT NULL,
      password                  NVARCHAR(255)  NULL,
      role                      NVARCHAR(60)   NOT NULL DEFAULT 'sales',
      talent_id                 NVARCHAR(40)   NULL,
      phone                     NVARCHAR(30)   NULL,
      department                NVARCHAR(120)  NULL,
      is_active                 TINYINT        NOT NULL DEFAULT 1,
      login_attempts            INT            NOT NULL DEFAULT 0,
      lock_until                DATETIME2      NULL,
      two_factor_enabled        TINYINT        NOT NULL DEFAULT 0,
      two_factor_secret         NVARCHAR(255)  NULL,
      is_super_admin            TINYINT        NOT NULL DEFAULT 0,
      super_admin_level         SMALLINT       NOT NULL DEFAULT 0,
      can_manage_super_admins   TINYINT        NOT NULL DEFAULT 0,
      password_expires_at       DATETIME2      NULL,
      is_temporary_password     TINYINT        NOT NULL DEFAULT 0,
      daily_export_count        INT            NOT NULL DEFAULT 0,
      last_export_reset         DATETIME2      NULL,
      deactivated_at            DATETIME2      NULL,
      deactivated_by            NVARCHAR(20)   NULL,
      last_login_at             DATETIME2      NULL,
      app_preferences           NVARCHAR(MAX)  NULL,
      notification_prefs        NVARCHAR(MAX)  NULL,
      created_by                NVARCHAR(20)   NULL,
      created_at                DATETIME2      NOT NULL DEFAULT GETDATE(),
      updated_at                DATETIME2      NOT NULL DEFAULT GETDATE(),
      CONSTRAINT uq_users_user_id UNIQUE (user_id),
      CONSTRAINT uq_users_email UNIQUE (email)
    )`,

    // token_blacklist
    `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'token_blacklist')
    CREATE TABLE token_blacklist (
      id              BIGINT IDENTITY(1,1) PRIMARY KEY,
      company_id      NVARCHAR(20)   NULL,
      user_id         NVARCHAR(20)   NOT NULL,
      token_id        NVARCHAR(191)  NOT NULL,
      reason          NVARCHAR(60)   NOT NULL DEFAULT 'LOGOUT',
      deactivated_by  NVARCHAR(20)   NULL,
      expires_at      DATETIME2      NOT NULL,
      created_at      DATETIME2      NOT NULL DEFAULT GETDATE(),
      CONSTRAINT uq_token_id UNIQUE (token_id)
    )`,

    // products
    `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'products')
    CREATE TABLE products (
      id          BIGINT IDENTITY(1,1) PRIMARY KEY,
      product_id  NVARCHAR(20)   NOT NULL,
      company_id  NVARCHAR(20)   NOT NULL,
      name        NVARCHAR(191)  NOT NULL,
      color       NVARCHAR(32)   NOT NULL DEFAULT '#22c55e',
      is_active   TINYINT        NOT NULL DEFAULT 1,
      created_by  NVARCHAR(20)   NULL,
      created_at  DATETIME2      NOT NULL DEFAULT GETDATE(),
      updated_at  DATETIME2      NOT NULL DEFAULT GETDATE(),
      CONSTRAINT uq_products_product_id UNIQUE (product_id),
      CONSTRAINT uq_products_company_name UNIQUE (company_id, name)
    )`,

    // leads
    `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'leads')
    CREATE TABLE leads (
      id                    BIGINT IDENTITY(1,1) PRIMARY KEY,
      lead_id               NVARCHAR(20)   NOT NULL,
      company_id            NVARCHAR(20)   NOT NULL,
      contact_person        NVARCHAR(191)  NOT NULL,
      company_name          NVARCHAR(191)  NOT NULL,
      email                 NVARCHAR(191)  NOT NULL,
      phone                 NVARCHAR(30)   NOT NULL,
      address_street        NVARCHAR(191)  NULL,
      address_city          NVARCHAR(120)  NULL,
      address_state         NVARCHAR(120)  NULL,
      address_zip           NVARCHAR(32)   NULL,
      address_country       NVARCHAR(120)  NULL,
      industry              NVARCHAR(120)  NULL,
      lead_source           NVARCHAR(60)   NOT NULL DEFAULT 'website',
      follow_up_date        DATETIME2      NULL,
      status                NVARCHAR(60)   NOT NULL DEFAULT 'new',
      priority              NVARCHAR(20)   NOT NULL DEFAULT 'medium',
      estimated_value       DECIMAL(15,2)  NOT NULL DEFAULT 0,
      assigned_to           NVARCHAR(20)   NULL,
      assigned_at           DATETIME2      NULL,
      assigned_by           NVARCHAR(20)   NULL,
      created_by            NVARCHAR(20)   NOT NULL,
      product_id            NVARCHAR(20)   NOT NULL,
      requirements          NVARCHAR(MAX)  NULL,
      workflow_stage        NVARCHAR(30)   NOT NULL DEFAULT 'sales',
      assigned_to_legal     NVARCHAR(20)   NULL,
      assigned_to_finance   NVARCHAR(20)   NULL,
      agreement_status      NVARCHAR(30)   NOT NULL DEFAULT 'pending',
      legal_approved_at     DATETIME2      NULL,
      legal_approved_by     NVARCHAR(20)   NULL,
      invoice_number        NVARCHAR(100)  NULL,
      invoice_amount        DECIMAL(15,2)  NULL,
      tax_invoice_number    NVARCHAR(100)  NULL,
      lead_score            SMALLINT       NOT NULL DEFAULT 0,
      lead_temperature      NVARCHAR(20)   NOT NULL DEFAULT 'warm',
      conversion_probability SMALLINT      NOT NULL DEFAULT 0,
      lost_reason           NVARCHAR(191)  NULL,
      first_response_at     DATETIME2      NULL,
      total_interactions    INT            NOT NULL DEFAULT 0,
      emails_sent           INT            NOT NULL DEFAULT 0,
      calls_made            INT            NOT NULL DEFAULT 0,
      meetings_held         INT            NOT NULL DEFAULT 0,
      is_active             TINYINT        NOT NULL DEFAULT 1,
      tags                  NVARCHAR(MAX)  NULL,
      last_contacted_at     DATETIME2      NULL,
      created_at            DATETIME2      NOT NULL DEFAULT GETDATE(),
      updated_at            DATETIME2      NOT NULL DEFAULT GETDATE(),
      CONSTRAINT uq_leads_lead_id UNIQUE (lead_id)
    )`,

    // lead_notes
    `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'lead_notes')
    CREATE TABLE lead_notes (
      id          BIGINT IDENTITY(1,1) PRIMARY KEY,
      company_id  NVARCHAR(20)   NOT NULL,
      lead_id     NVARCHAR(20)   NOT NULL,
      content     NVARCHAR(MAX)  NOT NULL,
      created_by  NVARCHAR(20)   NOT NULL,
      created_at  DATETIME2      NOT NULL DEFAULT GETDATE(),
      updated_at  DATETIME2      NOT NULL DEFAULT GETDATE()
    )`,

    // lead_activities
    `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'lead_activities')
    CREATE TABLE lead_activities (
      id          BIGINT IDENTITY(1,1) PRIMARY KEY,
      activity_id NVARCHAR(20)   NOT NULL,
      company_id  NVARCHAR(20)   NOT NULL,
      lead_id     NVARCHAR(20)   NOT NULL,
      type        NVARCHAR(40)   NOT NULL,
      description NVARCHAR(MAX)  NULL,
      created_by  NVARCHAR(20)   NOT NULL,
      created_at  DATETIME2      NOT NULL DEFAULT GETDATE(),
      CONSTRAINT uq_activity_id UNIQUE (activity_id)
    )`,

    // lead_stage_history
    `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'lead_stage_history')
    CREATE TABLE lead_stage_history (
      id          BIGINT IDENTITY(1,1) PRIMARY KEY,
      lead_id     NVARCHAR(20)   NOT NULL,
      company_id  NVARCHAR(20)   NOT NULL,
      stage       NVARCHAR(40)   NOT NULL,
      entered_at  DATETIME2      NOT NULL DEFAULT GETDATE(),
      exited_at   DATETIME2      NULL,
      duration    INT            NULL
    )`,

    // lead_transfer_history
    `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'lead_transfer_history')
    CREATE TABLE lead_transfer_history (
      id              BIGINT IDENTITY(1,1) PRIMARY KEY,
      lead_id         NVARCHAR(20)   NOT NULL,
      company_id      NVARCHAR(20)   NOT NULL,
      from_stage      NVARCHAR(30)   NOT NULL,
      to_stage        NVARCHAR(30)   NOT NULL,
      transferred_by  NVARCHAR(20)   NOT NULL,
      transferred_to  NVARCHAR(20)   NULL,
      transferred_at  DATETIME2      NOT NULL DEFAULT GETDATE(),
      notes           NVARCHAR(MAX)  NULL
    )`,

    // lead_legal_documents
    `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'lead_legal_documents')
    CREATE TABLE lead_legal_documents (
      id            BIGINT IDENTITY(1,1) PRIMARY KEY,
      company_id    NVARCHAR(20)   NOT NULL,
      lead_id       NVARCHAR(20)   NOT NULL,
      file_name     NVARCHAR(255)  NOT NULL,
      file_url      NVARCHAR(512)  NOT NULL,
      file_size     BIGINT         NULL,
      uploaded_by   NVARCHAR(20)   NOT NULL,
      document_type NVARCHAR(40)   NOT NULL DEFAULT 'agreement',
      uploaded_at   DATETIME2      NOT NULL DEFAULT GETDATE()
    )`,

    // lead_finance_documents
    `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'lead_finance_documents')
    CREATE TABLE lead_finance_documents (
      id            BIGINT IDENTITY(1,1) PRIMARY KEY,
      company_id    NVARCHAR(20)   NOT NULL,
      lead_id       NVARCHAR(20)   NOT NULL,
      file_name     NVARCHAR(255)  NOT NULL,
      file_url      NVARCHAR(512)  NOT NULL,
      file_size     BIGINT         NULL,
      uploaded_by   NVARCHAR(20)   NOT NULL,
      document_type NVARCHAR(40)   NOT NULL DEFAULT 'invoice',
      uploaded_at   DATETIME2      NOT NULL DEFAULT GETDATE()
    )`,

    // customers
    `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'customers')
    CREATE TABLE customers (
      id                      BIGINT IDENTITY(1,1) PRIMARY KEY,
      customer_id             NVARCHAR(20)   NOT NULL,
      company_id              NVARCHAR(20)   NOT NULL,
      name                    NVARCHAR(191)  NOT NULL,
      company_name            NVARCHAR(191)  NOT NULL,
      email                   NVARCHAR(191)  NOT NULL,
      phone                   NVARCHAR(30)   NOT NULL,
      converted_from_lead_id  NVARCHAR(20)   NULL,
      total_value             DECIMAL(15,2)  NOT NULL DEFAULT 0,
      status                  NVARCHAR(30)   NOT NULL DEFAULT 'active',
      assigned_to             NVARCHAR(20)   NULL,
      last_interaction        DATETIME2      NULL,
      next_follow_up          DATETIME2      NULL,
      notes                   NVARCHAR(MAX)  NULL,
      is_active               TINYINT        NOT NULL DEFAULT 1,
      created_at              DATETIME2      NOT NULL DEFAULT GETDATE(),
      updated_at              DATETIME2      NOT NULL DEFAULT GETDATE(),
      CONSTRAINT uq_customers_customer_id UNIQUE (customer_id)
    )`,

    // tasks
    `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'tasks')
    CREATE TABLE tasks (
      id          BIGINT IDENTITY(1,1) PRIMARY KEY,
      task_id     NVARCHAR(20)   NOT NULL,
      company_id  NVARCHAR(20)   NOT NULL,
      title       NVARCHAR(191)  NOT NULL,
      type        NVARCHAR(40)   NOT NULL DEFAULT 'call',
      status      NVARCHAR(30)   NOT NULL DEFAULT 'pending',
      priority    NVARCHAR(20)   NOT NULL DEFAULT 'medium',
      due_date    DATETIME2      NOT NULL,
      assigned_to NVARCHAR(20)   NULL,
      related_to  NVARCHAR(30)   NULL,
      related_id  NVARCHAR(20)   NULL,
      created_by  NVARCHAR(20)   NOT NULL,
      notes       NVARCHAR(MAX)  NULL,
      created_at  DATETIME2      NOT NULL DEFAULT GETDATE(),
      updated_at  DATETIME2      NOT NULL DEFAULT GETDATE(),
      CONSTRAINT uq_tasks_task_id UNIQUE (task_id)
    )`,

    // notifications
    `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'notifications')
    CREATE TABLE notifications (
      id          BIGINT IDENTITY(1,1) PRIMARY KEY,
      notif_id    NVARCHAR(20)   NOT NULL,
      company_id  NVARCHAR(20)   NOT NULL,
      user_id     NVARCHAR(20)   NOT NULL,
      title       NVARCHAR(191)  NOT NULL,
      message     NVARCHAR(MAX)  NOT NULL,
      type        NVARCHAR(60)   NOT NULL DEFAULT 'system',
      lead_id     NVARCHAR(20)   NULL,
      is_read     TINYINT        NOT NULL DEFAULT 0,
      priority    NVARCHAR(20)   NOT NULL DEFAULT 'medium',
      actionable  TINYINT        NOT NULL DEFAULT 0,
      action_url  NVARCHAR(255)  NULL,
      metadata    NVARCHAR(MAX)  NULL,
      created_at  DATETIME2      NOT NULL DEFAULT GETDATE(),
      CONSTRAINT uq_notif_id UNIQUE (notif_id)
    )`,

    // audit_logs
    `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'audit_logs')
    CREATE TABLE audit_logs (
      id            BIGINT IDENTITY(1,1) PRIMARY KEY,
      audit_id      NVARCHAR(20)   NOT NULL,
      company_id    NVARCHAR(20)   NULL,
      action        NVARCHAR(60)   NOT NULL,
      performed_by  NVARCHAR(20)   NOT NULL,
      target_user   NVARCHAR(20)   NULL,
      user_email    NVARCHAR(191)  NULL,
      user_role     NVARCHAR(60)   NULL,
      ip_address    NVARCHAR(45)   NULL,
      record_count  INT            NULL,
      details       NVARCHAR(MAX)  NULL,
      logged_at     DATETIME2      NOT NULL DEFAULT GETDATE(),
      CONSTRAINT uq_audit_id UNIQUE (audit_id)
    )`,

    // analytics_cache
    `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'analytics_cache')
    CREATE TABLE analytics_cache (
      company_id    NVARCHAR(20)   NOT NULL,
      metric_key    NVARCHAR(100)  NOT NULL,
      metric_value  NVARCHAR(MAX)  NOT NULL,
      cached_at     DATETIME2      NOT NULL DEFAULT GETDATE(),
      CONSTRAINT pk_analytics_cache PRIMARY KEY (company_id, metric_key)
    )`,

    // demo_requests
    `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'demo_requests')
    CREATE TABLE demo_requests (
      id          BIGINT IDENTITY(1,1) PRIMARY KEY,
      name        NVARCHAR(191)  NOT NULL,
      email       NVARCHAR(191)  NOT NULL,
      phone       NVARCHAR(30)   NULL,
      company     NVARCHAR(191)  NULL,
      message     NVARCHAR(MAX)  NULL,
      status      NVARCHAR(30)   NOT NULL DEFAULT 'pending',
      created_at  DATETIME2      NOT NULL DEFAULT GETDATE()
    )`,
  ];

  for (const sql of tables) {
    const tableName = sql.match(/TABLE_NAME = '(\w+)'/)?.[1] || "unknown";
    try {
      await db.query(sql);
      console.log(`✓ ${tableName}`);
    } catch (e) {
      console.error(`✗ ${tableName}: ${e.message}`);
    }
  }

  console.log("\nSeeding superadmin...");

  // Platform company
  const [existing] = await db.query("SELECT company_id FROM companies WHERE company_id = 'platform-root'");
  if (!existing.length) {
    await db.query(
      `INSERT INTO companies (company_id, name, slug, contact_email, admin_email, status, settings_currency, settings_timezone, country)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ["platform-root", "GreenCRM Platform", "platform", "navneet@greencrm.local", "navneet@greencrm.local", "active", "INR", "Asia/Kolkata", "India"]
    );
    console.log("✓ Platform company created");
  } else {
    console.log("- Platform company already exists");
  }

  // Superadmin user
  const email = process.env.SUPER_ADMIN_EMAIL || "navneet@greencrm.local";
  const pass  = process.env.SUPER_ADMIN_PASSWORD || "navneet1";
  const [userEx] = await db.query("SELECT user_id FROM users WHERE email = ?", [email]);

  const appPrefs = JSON.stringify({ currency: "INR", dateFormat: "DD/MM/YYYY", language: "en", timezone: "Asia/Kolkata" });
  const notifPrefs = JSON.stringify({ emailNotifications: true, leadAlerts: true, pushNotifications: true, taskReminders: true, weeklyReports: true, marketingEmails: true });

  if (!userEx.length) {
    const uid = await createPrefixedId("usr");
    await db.query(
      `INSERT INTO users (user_id, company_id, name, email, phone, password, role, is_active, is_super_admin, super_admin_level, can_manage_super_admins, app_preferences, notification_prefs)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uid, "platform-root", "Navneet Kumar", email, "7004023078", await hashPassword(pass), "super-admin", 1, 1, 1, 1, appPrefs, notifPrefs]
    );
    console.log(`✓ Superadmin created: ${email}`);
  } else {
    await db.query(
      "UPDATE users SET password = ?, is_super_admin = 1, super_admin_level = 1, can_manage_super_admins = 1 WHERE email = ?",
      [await hashPassword(pass), email]
    );
    console.log(`- Superadmin updated: ${email}`);
  }

  console.log("\n✅ Schema complete!");
  console.log("─────────────────────────────────────");
  console.log(`Login: ${email}`);
  console.log(`Pass:  ${pass}`);
  console.log("─────────────────────────────────────");
  process.exit(0);
}

runSchema().catch(e => { console.error("Failed:", e.message); process.exit(1); });
