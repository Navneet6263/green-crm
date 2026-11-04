// Tables for admin emails, their replies, and Discuss (group chat). Created on start-up if missing,
// the same way the chat tables are; every change only adds tables or nullable columns.

async function ensureEmailTables(pool) {
  await pool.request().query(`
    IF OBJECT_ID('email_nudges', 'U') IS NULL
    BEGIN
      CREATE TABLE email_nudges (
        id              UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        company_id      VARCHAR(20)    NOT NULL,
        kind            VARCHAR(20)    NOT NULL,
        lead_id         VARCHAR(40)    NULL,
        about_user_id   VARCHAR(20)    NULL,
        sent_by         VARCHAR(20)    NOT NULL,
        sent_by_name    NVARCHAR(191)  NULL,
        to_user_ids     NVARCHAR(1000) NULL,
        to_emails       NVARCHAR(2000) NOT NULL,
        cc_emails       NVARCHAR(2000) NULL,
        subject         NVARCHAR(300)  NOT NULL,
        body            NVARCHAR(MAX)  NULL,
        link_path       NVARCHAR(400)  NULL,
        ref_code        VARCHAR(20)    NOT NULL,
        message_id      NVARCHAR(400)  NULL,
        delivery        VARCHAR(30)    NOT NULL,
        error           NVARCHAR(400)  NULL,
        has_screenshot  BIT            NOT NULL DEFAULT 0,
        reply_count     INT            NOT NULL DEFAULT 0,
        last_reply_at   DATETIME2      NULL,
        created_at      DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
      );
      CREATE INDEX idx_email_nudges_company ON email_nudges (company_id, created_at);
      CREATE INDEX idx_email_nudges_lead ON email_nudges (company_id, lead_id);
      CREATE INDEX idx_email_nudges_ref ON email_nudges (ref_code);
    END;

    -- Customer emails from the Email page are kept here too, so their replies can be matched.
    IF OBJECT_ID('email_nudges', 'U') IS NOT NULL AND COL_LENGTH('email_nudges', 'customer_id') IS NULL
      ALTER TABLE email_nudges ADD customer_id VARCHAR(40) NULL;

    IF OBJECT_ID('email_replies', 'U') IS NULL
    BEGIN
      CREATE TABLE email_replies (
        id                UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        company_id        VARCHAR(20)    NOT NULL,
        nudge_id          UNIQUEIDENTIFIER NOT NULL,
        source_message_id NVARCHAR(400)  NOT NULL,
        from_email        NVARCHAR(320)  NULL,
        from_name         NVARCHAR(191)  NULL,
        subject           NVARCHAR(400)  NULL,
        body_text         NVARCHAR(MAX)  NULL,
        received_at       DATETIME2      NOT NULL,
        created_at        DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_email_replies_nudge FOREIGN KEY (nudge_id) REFERENCES email_nudges(id) ON DELETE CASCADE
      );
      CREATE UNIQUE INDEX uq_email_replies_source ON email_replies (source_message_id);
      CREATE INDEX idx_email_replies_nudge ON email_replies (nudge_id, received_at);
    END;

    IF OBJECT_ID('mail_sync_state', 'U') IS NULL
      CREATE TABLE mail_sync_state (
        mailbox      NVARCHAR(320) NOT NULL PRIMARY KEY,
        last_synced  DATETIME2     NOT NULL,
        last_error   NVARCHAR(400) NULL,
        updated_at   DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
      );
  `);
}

async function ensureDiscussColumns(pool) {
  await pool.request().query(`
    IF OBJECT_ID('chat_groups', 'U') IS NOT NULL AND COL_LENGTH('chat_groups', 'company_id') IS NULL
      ALTER TABLE chat_groups ADD company_id VARCHAR(20) NULL;
    IF OBJECT_ID('chat_groups', 'U') IS NOT NULL AND COL_LENGTH('chat_groups', 'description') IS NULL
      ALTER TABLE chat_groups ADD description NVARCHAR(400) NULL;
    IF OBJECT_ID('chat_groups', 'U') IS NOT NULL AND COL_LENGTH('chat_groups', 'is_company_wide') IS NULL
      ALTER TABLE chat_groups ADD is_company_wide BIT NOT NULL CONSTRAINT DF_chat_groups_company_wide DEFAULT 0;
    IF OBJECT_ID('chat_groups', 'U') IS NOT NULL AND COL_LENGTH('chat_groups', 'last_message_at') IS NULL
      ALTER TABLE chat_groups ADD last_message_at DATETIME2 NULL;
    IF OBJECT_ID('chat_groups', 'U') IS NOT NULL AND COL_LENGTH('chat_groups', 'archived_at') IS NULL
      ALTER TABLE chat_groups ADD archived_at DATETIME2 NULL;
    IF OBJECT_ID('chat_messages', 'U') IS NOT NULL AND COL_LENGTH('chat_messages', 'company_id') IS NULL
      ALTER TABLE chat_messages ADD company_id VARCHAR(20) NULL;
    IF OBJECT_ID('chat_messages', 'U') IS NOT NULL AND COL_LENGTH('chat_messages', 'lead_id') IS NULL
      ALTER TABLE chat_messages ADD lead_id VARCHAR(40) NULL;
    IF OBJECT_ID('chat_messages', 'U') IS NOT NULL AND COL_LENGTH('chat_messages', 'lead_name') IS NULL
      ALTER TABLE chat_messages ADD lead_name NVARCHAR(255) NULL;
    IF OBJECT_ID('chat_messages', 'U') IS NOT NULL AND COL_LENGTH('chat_messages', 'reply_to') IS NULL
      ALTER TABLE chat_messages ADD reply_to UNIQUEIDENTIFIER NULL;
    IF OBJECT_ID('chat_messages', 'U') IS NOT NULL AND COL_LENGTH('chat_messages', 'edited_at') IS NULL
      ALTER TABLE chat_messages ADD edited_at DATETIME2 NULL;
    IF OBJECT_ID('chat_messages', 'U') IS NOT NULL AND COL_LENGTH('chat_messages', 'deleted_at') IS NULL
      ALTER TABLE chat_messages ADD deleted_at DATETIME2 NULL;

    IF OBJECT_ID('chat_reads', 'U') IS NULL
      CREATE TABLE chat_reads (
        user_id       BIGINT        NOT NULL,
        chat_key      VARCHAR(80)   NOT NULL,
        last_read_at  DATETIME2     NOT NULL,
        CONSTRAINT PK_chat_reads PRIMARY KEY (user_id, chat_key)
      );
  `);
}

// Customer money (payments received) and the onboarding checklist.
async function ensureCustomerTables(pool) {
  await pool.request().query(`
    IF OBJECT_ID('customers', 'U') IS NOT NULL AND COL_LENGTH('customers', 'next_payment_date') IS NULL
      ALTER TABLE customers ADD next_payment_date DATETIME2 NULL;
    IF OBJECT_ID('customers', 'U') IS NOT NULL AND COL_LENGTH('customers', 'billing_cycle') IS NULL
      ALTER TABLE customers ADD billing_cycle VARCHAR(20) NULL;
    IF OBJECT_ID('customers', 'U') IS NOT NULL AND COL_LENGTH('customers', 'onboarding_completed_at') IS NULL
      ALTER TABLE customers ADD onboarding_completed_at DATETIME2 NULL;

    IF OBJECT_ID('customer_payments', 'U') IS NULL
    BEGIN
      CREATE TABLE customer_payments (
        id           UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        company_id   VARCHAR(20)    NOT NULL,
        customer_id  VARCHAR(20)    NOT NULL,
        amount       DECIMAL(15,2)  NOT NULL,
        paid_on      DATETIME2      NOT NULL,
        mode         VARCHAR(30)    NOT NULL,
        reference    NVARCHAR(120)  NULL,
        note         NVARCHAR(500)  NULL,
        recorded_by  VARCHAR(20)    NOT NULL,
        created_at   DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
        deleted_at   DATETIME2      NULL,
        deleted_by   VARCHAR(20)    NULL
      );
      CREATE INDEX idx_customer_payments_customer ON customer_payments (company_id, customer_id, deleted_at);
      CREATE INDEX idx_customer_payments_date ON customer_payments (company_id, paid_on);
    END;

    IF OBJECT_ID('customer_onboarding_steps', 'U') IS NULL
    BEGIN
      CREATE TABLE customer_onboarding_steps (
        id           UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        company_id   VARCHAR(20)    NOT NULL,
        customer_id  VARCHAR(20)    NOT NULL,
        step_key     VARCHAR(40)    NOT NULL,
        title        NVARCHAR(160)  NOT NULL,
        sort_order   INT            NOT NULL DEFAULT 0,
        is_done      BIT            NOT NULL DEFAULT 0,
        done_at      DATETIME2      NULL,
        done_by      VARCHAR(20)    NULL,
        due_date     DATETIME2      NULL,
        owner_id     VARCHAR(20)    NULL,
        note         NVARCHAR(500)  NULL,
        is_custom    BIT            NOT NULL DEFAULT 0,
        created_at   DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
      );
      CREATE INDEX idx_customer_onboarding_customer ON customer_onboarding_steps (company_id, customer_id, sort_order);
    END;
  `);
}

// One row per plan end date we remind about (a won lead's plan, or a customer's subscription).
async function ensureRenewalTable(pool) {
  await pool.request().query(`
    IF OBJECT_ID('renewal_reminders', 'U') IS NULL
    BEGIN
      CREATE TABLE renewal_reminders (
        id           UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        company_id   VARCHAR(20)    NOT NULL,
        kind         VARCHAR(20)    NOT NULL,
        entity_id    VARCHAR(40)    NOT NULL,
        end_date     DATE           NOT NULL,
        owner_id     VARCHAR(20)    NULL,
        title        NVARCHAR(300)  NOT NULL,
        related_to   VARCHAR(20)    NOT NULL,
        related_id   VARCHAR(40)    NOT NULL,
        task_id      VARCHAR(40)    NULL,
        reminded_at  DATETIME2      NULL,
        created_at   DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
      );
      CREATE INDEX idx_renewal_reminders_entity ON renewal_reminders (kind, entity_id);
      CREATE INDEX idx_renewal_reminders_due ON renewal_reminders (reminded_at, end_date);
    END;
  `);
}

// Reminder emails: meetings (one row per meeting task), the Monday summary (one row per person per week),
// and addresses never to email again (bounced, or made up for testing).
// Login email codes: a person proves their email once a month; only proven emails get reminder emails.
async function ensureReminderTables(pool) {
  await pool.request().query(`
    IF OBJECT_ID('email_suppressions', 'U') IS NULL
    BEGIN
      CREATE TABLE email_suppressions (
        email       NVARCHAR(320) NOT NULL PRIMARY KEY,
        reason      NVARCHAR(400) NULL,
        source      VARCHAR(20)   NOT NULL,
        created_at  DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END;
    IF OBJECT_ID('meeting_reminders', 'U') IS NULL
    BEGIN
      CREATE TABLE meeting_reminders (
        task_id            VARCHAR(40)  NOT NULL PRIMARY KEY,
        company_id         VARCHAR(20)  NOT NULL,
        scheduled_sent_at  DATETIME2    NULL,
        day_sent_for       DATE         NULL,
        created_at         DATETIME2    NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END;
    IF COL_LENGTH('users', 'email_verified_at') IS NULL
      ALTER TABLE users ADD email_verified_at DATETIME2 NULL;
    IF OBJECT_ID('login_email_otps', 'U') IS NULL
    BEGIN
      CREATE TABLE login_email_otps (
        challenge_id  VARCHAR(40)  NOT NULL PRIMARY KEY,
        user_id       VARCHAR(20)  NOT NULL,
        code_hash     VARCHAR(64)  NOT NULL,
        attempts      INT          NOT NULL DEFAULT 0,
        expires_at    DATETIME2    NOT NULL,
        used_at       DATETIME2    NULL,
        created_at    DATETIME2    NOT NULL DEFAULT SYSUTCDATETIME()
      );
      CREATE INDEX idx_login_email_otps_user ON login_email_otps (user_id, created_at);
    END;
    IF OBJECT_ID('task_email_reminders', 'U') IS NULL
    BEGIN
      CREATE TABLE task_email_reminders (
        task_id         VARCHAR(40)  NOT NULL PRIMARY KEY,
        company_id      VARCHAR(20)  NOT NULL,
        minutes_before  INT          NOT NULL,
        remind_at       DATETIME2    NOT NULL,
        sent_at         DATETIME2    NULL,
        created_at      DATETIME2    NOT NULL DEFAULT SYSUTCDATETIME()
      );
      CREATE INDEX idx_task_email_reminders_due ON task_email_reminders (sent_at, remind_at);
    END;
    IF OBJECT_ID('weekly_digest_log', 'U') IS NULL
    BEGIN
      CREATE TABLE weekly_digest_log (
        user_id     VARCHAR(20) NOT NULL,
        week_start  DATE        NOT NULL,
        sent_at     DATETIME2   NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT pk_weekly_digest_log PRIMARY KEY (user_id, week_start)
      );
    END;
  `);
}

async function ensureFeatureTables(pool) {
  await ensureRenewalTable(pool).catch((error) => console.warn("Renewal table check skipped:", error.message));
  await ensureReminderTables(pool).catch((error) => console.warn("Reminder tables check skipped:", error.message));
  await ensureCustomerTables(pool).catch((error) => console.warn("Customer tables check skipped:", error.message));
  await ensureEmailTables(pool).catch((error) => console.warn("Email tables check skipped:", error.message));
  await ensureDiscussColumns(pool).catch((error) => console.warn("Discuss columns check skipped:", error.message));
}

module.exports = { ensureFeatureTables };
