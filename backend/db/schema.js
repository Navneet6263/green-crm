const connection = require("./connection");

const PLATFORM_COMPANY_ID = process.env.PLATFORM_COMPANY_ID || "platform-root";

function wrapIdentifier(value) {
  return `[${String(value).replace(/]/g, "]]")}]`;
}

function formatIdentifierColumns(columns) {
  return columns
    .split(",")
    .map((column) => column.trim())
    .filter(Boolean)
    .map(wrapIdentifier)
    .join(", ");
}

function normalizePrimaryKey(line) {
  return line.replace(/\(([^)]+)\)/, (_match, columns) => `(${formatIdentifierColumns(columns)})`);
}

function normalizeColumn(line) {
  const match = line.match(/^([a-zA-Z0-9_]+)\s+(.+)$/);

  if (!match) {
    return line;
  }

  const [, columnName, rawDefinition] = match;
  const definition = rawDefinition
    .replace(/\bVARCHAR\((\d+)\)/gi, "NVARCHAR($1)")
    .replace(/\bLONGTEXT\b/gi, "NVARCHAR(MAX)")
    .replace(/\bJSON\b/gi, "NVARCHAR(MAX)")
    .replace(/\bTINYINT\s*\(\s*1\s*\)/gi, "BIT")
    .replace(/\bDATETIME\b/gi, "DATETIME2")
    .replace(/\s+AUTO_INCREMENT\b/gi, " IDENTITY(1,1)")
    .replace(/\s+ON UPDATE CURRENT_TIMESTAMP\b/gi, "");

  return `${wrapIdentifier(columnName)} ${definition}`;
}

function buildIndexStatement(tableName, indexName, columns, unique) {
  return `
IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'${indexName}' AND object_id = OBJECT_ID(N'dbo.${tableName}')
)
BEGIN
  CREATE ${unique ? "UNIQUE " : ""}INDEX ${wrapIdentifier(indexName)}
  ON [dbo].${wrapIdentifier(tableName)} (${formatIdentifierColumns(columns)});
END`;
}

function buildCreateTableStatements(statement) {
  const match = statement.match(
    /CREATE TABLE IF NOT EXISTS\s+([a-zA-Z0-9_]+)\s*\(([\s\S]*)\)\s*ENGINE=InnoDB[\s\S]*$/i
  );

  if (!match) {
    return [statement];
  }

  const [, tableName, rawBody] = match;
  const definitions = rawBody
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/,$/, ""));
  const columnDefinitions = [];
  const followUpStatements = [];

  definitions.forEach((line) => {
    if (/^PRIMARY KEY\b/i.test(line)) {
      columnDefinitions.push(normalizePrimaryKey(line));
      return;
    }

    const uniqueMatch = line.match(/^UNIQUE KEY\s+([a-zA-Z0-9_]+)\s+\((.+)\)$/i);
    if (uniqueMatch) {
      followUpStatements.push(buildIndexStatement(tableName, uniqueMatch[1], uniqueMatch[2], true));
      return;
    }

    const indexMatch = line.match(/^KEY\s+([a-zA-Z0-9_]+)\s+\((.+)\)$/i);
    if (indexMatch) {
      followUpStatements.push(buildIndexStatement(tableName, indexMatch[1], indexMatch[2], false));
      return;
    }

    if (/^FULLTEXT KEY\b/i.test(line)) {
      return;
    }

    columnDefinitions.push(normalizeColumn(line));
  });

  return [
    `
IF OBJECT_ID(N'dbo.${tableName}', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].${wrapIdentifier(tableName)} (
    ${columnDefinitions.join(",\n    ")}
  );
END`,
    ...followUpStatements,
  ];
}

function getSchemaStatements() {
  return schemaStatements.flatMap(buildCreateTableStatements);
}

const schemaStatements = [

  // ── companies ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS companies (
    id                    BIGINT        NOT NULL AUTO_INCREMENT,
    company_id            VARCHAR(20)   NOT NULL,
    name                  VARCHAR(191)  NOT NULL,
    slug                  VARCHAR(191)  NOT NULL,
    contact_email         VARCHAR(191)  NOT NULL DEFAULT '',
    contact_phone         VARCHAR(30)   NULL,
    industry              VARCHAR(120)  NULL,
    admin_email           VARCHAR(191)  NOT NULL DEFAULT '',
    service_access        JSON          NULL,
    service_settings      JSON          NULL,
    usage_current_leads   INT           NOT NULL DEFAULT 0,
    usage_current_users   INT           NOT NULL DEFAULT 0,
    status                VARCHAR(40)   NOT NULL DEFAULT 'trial',
    branding_logo_url     VARCHAR(512)  NULL,
    branding_primary_color VARCHAR(20)  NOT NULL DEFAULT '#3b82f6',
    settings_timezone     VARCHAR(64)   NOT NULL DEFAULT 'Asia/Kolkata',
    settings_currency     VARCHAR(16)   NOT NULL DEFAULT 'INR',
    settings_date_format  VARCHAR(32)   NOT NULL DEFAULT 'DD/MM/YYYY',
    smtp_host             VARCHAR(255)  NULL,
    smtp_port             SMALLINT      NULL,
    smtp_user             VARCHAR(255)  NULL,
    smtp_password         VARCHAR(255)  NULL,
    address               VARCHAR(255)  NULL,
    city                  VARCHAR(120)  NULL,
    state                 VARCHAR(120)  NULL,
    country               VARCHAR(120)  NOT NULL DEFAULT 'India',
    website               VARCHAR(255)  NULL,
    created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_companies_company_id (company_id),
    UNIQUE KEY uq_companies_slug (slug),
    KEY idx_companies_status (status),
    KEY idx_companies_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── users ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS users (
    id                      BIGINT        NOT NULL AUTO_INCREMENT,
    user_id                 VARCHAR(20)   NOT NULL,
    company_id              VARCHAR(20)   NOT NULL,
    name                    VARCHAR(191)  NOT NULL,
    email                   VARCHAR(191)  NOT NULL,
    password                VARCHAR(255)  NULL,
    role                    VARCHAR(60)   NOT NULL DEFAULT 'sales',

    phone                   VARCHAR(30)   NULL,
    department              VARCHAR(120)  NULL,
    is_active               TINYINT(1)    NOT NULL DEFAULT 1,
    login_attempts          INT           NOT NULL DEFAULT 0,
    lock_until              DATETIME      NULL,
    two_factor_enabled      TINYINT(1)    NOT NULL DEFAULT 0,
    two_factor_secret       VARCHAR(255)  NULL,
    is_super_admin          TINYINT(1)    NOT NULL DEFAULT 0,
    super_admin_level       SMALLINT      NOT NULL DEFAULT 0,
    can_manage_super_admins TINYINT(1)    NOT NULL DEFAULT 0,
    password_expires_at     DATETIME      NULL,
    is_temporary_password   TINYINT(1)    NOT NULL DEFAULT 0,
    daily_export_count      INT           NOT NULL DEFAULT 0,
    last_export_reset       DATETIME      NULL,
    deactivated_at          DATETIME      NULL,
    deactivated_by          VARCHAR(20)   NULL,
    last_login_at           DATETIME      NULL,
    app_preferences         JSON          NULL,
    notification_prefs      JSON          NULL,
    created_by              VARCHAR(20)   NULL,
    created_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_user_id (user_id),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_company_role_active (company_id, is_active, role),
    KEY idx_users_role_active (role, is_active),
    KEY idx_users_is_super_admin (is_super_admin),
    KEY idx_users_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS platform_user_company_access (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    user_id     VARCHAR(20)   NOT NULL,
    company_id  VARCHAR(20)   NOT NULL,
    created_by  VARCHAR(20)   NULL,
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_platform_user_company_access (user_id, company_id),
    KEY idx_platform_access_user (user_id, created_at),
    KEY idx_platform_access_company (company_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── token_blacklist ────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS token_blacklist (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    company_id      VARCHAR(20)   NULL,
    user_id         VARCHAR(20)   NOT NULL,
    token_id        VARCHAR(191)  NOT NULL,
    reason          VARCHAR(60)   NOT NULL DEFAULT 'LOGOUT',
    deactivated_by  VARCHAR(20)   NULL,
    expires_at      DATETIME      NOT NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_token_id (token_id),
    KEY idx_tbl_user_id (user_id, created_at),
    KEY idx_tbl_expires_at (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── products ───────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS products (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    product_id  VARCHAR(20)   NOT NULL,
    company_id  VARCHAR(20)   NOT NULL,
    name        VARCHAR(191)  NOT NULL,
    color       VARCHAR(32)   NOT NULL DEFAULT '#22c55e',
    is_active   TINYINT(1)    NOT NULL DEFAULT 1,
    created_by  VARCHAR(20)   NULL,
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_products_product_id (product_id),
    UNIQUE KEY uq_products_company_name (company_id, name),
    KEY idx_products_company_active (company_id, is_active)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── leads ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS leads (
    id                    BIGINT        NOT NULL AUTO_INCREMENT,
    lead_id               VARCHAR(20)   NOT NULL,
    company_id            VARCHAR(20)   NOT NULL,
    contact_person        VARCHAR(191)  NOT NULL,
    company_name          VARCHAR(191)  NOT NULL,
    email                 VARCHAR(191)  NOT NULL,
    phone                 VARCHAR(30)   NOT NULL,
    address_street        VARCHAR(191)  NULL,
    address_city          VARCHAR(120)  NULL,
    address_state         VARCHAR(120)  NULL,
    address_zip           VARCHAR(32)   NULL,
    address_country       VARCHAR(120)  NULL,
    industry              VARCHAR(120)  NULL,
    lead_source           VARCHAR(60)   NOT NULL DEFAULT 'website',
    follow_up_date        DATETIME      NULL,
    status                VARCHAR(60)   NOT NULL DEFAULT 'new',
    priority              VARCHAR(20)   NOT NULL DEFAULT 'medium',
    estimated_value       DECIMAL(15,2) NOT NULL DEFAULT 0,
    assigned_to           VARCHAR(20)   NULL,
    assigned_at           DATETIME      NULL,
    assigned_by           VARCHAR(20)   NULL,
    created_by            VARCHAR(20)   NOT NULL,
    product_id            VARCHAR(20)   NOT NULL,
    requirements          LONGTEXT      NULL,
    workflow_stage        VARCHAR(30)   NOT NULL DEFAULT 'sales',
    assigned_to_legal     VARCHAR(20)   NULL,
    assigned_to_finance   VARCHAR(20)   NULL,
    agreement_status      VARCHAR(30)   NOT NULL DEFAULT 'pending',
    legal_approved_at     DATETIME      NULL,
    legal_approved_by     VARCHAR(20)   NULL,
    invoice_number        VARCHAR(100)  NULL,
    invoice_amount        DECIMAL(15,2) NULL,
    tax_invoice_number    VARCHAR(100)  NULL,
    lead_score            SMALLINT      NOT NULL DEFAULT 0,
    lead_temperature      VARCHAR(20)   NOT NULL DEFAULT 'warm',
    conversion_probability SMALLINT     NOT NULL DEFAULT 0,
    lost_reason           VARCHAR(191)  NULL,
    first_response_at     DATETIME      NULL,
    total_interactions    INT           NOT NULL DEFAULT 0,
    emails_sent           INT           NOT NULL DEFAULT 0,
    calls_made            INT           NOT NULL DEFAULT 0,
    meetings_held         INT           NOT NULL DEFAULT 0,
    is_active             TINYINT(1)    NOT NULL DEFAULT 1,
    tags                  JSON          NULL,
    last_contacted_at     DATETIME      NULL,
    created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_leads_lead_id (lead_id),
    FULLTEXT KEY ft_leads_search (contact_person, company_name, email, phone),
    KEY idx_leads_company_active_created (company_id, is_active, created_at),
    KEY idx_leads_company_assigned_active (company_id, assigned_to, is_active),
    KEY idx_leads_company_status_priority (company_id, status, priority),
    KEY idx_leads_company_workflow (company_id, workflow_stage, is_active),
    KEY idx_leads_legal (assigned_to_legal, agreement_status),
    KEY idx_leads_finance (assigned_to_finance, workflow_stage),
    KEY idx_leads_followup (company_id, follow_up_date),
    KEY idx_leads_created_by (created_by)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── lead_notes ─────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS lead_notes (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    company_id  VARCHAR(20)   NOT NULL,
    lead_id     VARCHAR(20)   NOT NULL,
    content     LONGTEXT      NOT NULL,
    created_by  VARCHAR(20)   NOT NULL,
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_ln_lead_created (lead_id, created_at),
    KEY idx_ln_company (company_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── lead_activities ────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS lead_activities (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    activity_id VARCHAR(20)   NOT NULL,
    company_id  VARCHAR(20)   NOT NULL,
    lead_id     VARCHAR(20)   NOT NULL,
    type        VARCHAR(40)   NOT NULL,
    description LONGTEXT      NULL,
    created_by  VARCHAR(20)   NOT NULL,
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_activity_id (activity_id),
    KEY idx_la_lead_created (lead_id, created_at),
    KEY idx_la_company_created (company_id, created_at),
    KEY idx_la_actor (created_by, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── lead_stage_history ─────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS lead_stage_history (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    lead_id     VARCHAR(20)   NOT NULL,
    company_id  VARCHAR(20)   NOT NULL,
    stage       VARCHAR(40)   NOT NULL,
    entered_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    exited_at   DATETIME      NULL,
    duration    INT           NULL,
    PRIMARY KEY (id),
    KEY idx_lsh_lead (lead_id, entered_at),
    KEY idx_lsh_company (company_id, entered_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── lead_transfer_history ──────────────────────────────────
  `CREATE TABLE IF NOT EXISTS lead_transfer_history (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    lead_id         VARCHAR(20)   NOT NULL,
    company_id      VARCHAR(20)   NOT NULL,
    from_stage      VARCHAR(30)   NOT NULL,
    to_stage        VARCHAR(30)   NOT NULL,
    transferred_by  VARCHAR(20)   NOT NULL,
    transferred_to  VARCHAR(20)   NULL,
    transferred_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes           LONGTEXT      NULL,
    PRIMARY KEY (id),
    KEY idx_lth_lead (lead_id, transferred_at),
    KEY idx_lth_company (company_id, transferred_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── lead_legal_documents ───────────────────────────────────
  `CREATE TABLE IF NOT EXISTS lead_legal_documents (
    id            BIGINT        NOT NULL AUTO_INCREMENT,
    company_id    VARCHAR(20)   NOT NULL,
    lead_id       VARCHAR(20)   NOT NULL,
    file_name     VARCHAR(255)  NOT NULL,
    file_url      VARCHAR(512)  NOT NULL,
    file_size     BIGINT        NULL,
    uploaded_by   VARCHAR(20)   NOT NULL,
    document_type VARCHAR(40)   NOT NULL DEFAULT 'agreement',
    uploaded_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_lld_lead (lead_id, uploaded_at),
    KEY idx_lld_company (company_id, uploaded_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── lead_finance_documents ─────────────────────────────────
  `CREATE TABLE IF NOT EXISTS lead_finance_documents (
    id            BIGINT        NOT NULL AUTO_INCREMENT,
    company_id    VARCHAR(20)   NOT NULL,
    lead_id       VARCHAR(20)   NOT NULL,
    file_name     VARCHAR(255)  NOT NULL,
    file_url      VARCHAR(512)  NOT NULL,
    file_size     BIGINT        NULL,
    uploaded_by   VARCHAR(20)   NOT NULL,
    document_type VARCHAR(40)   NOT NULL DEFAULT 'invoice',
    uploaded_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_lfd_lead (lead_id, uploaded_at),
    KEY idx_lfd_company (company_id, uploaded_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── customers ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS customers (
    id                      BIGINT        NOT NULL AUTO_INCREMENT,
    customer_id             VARCHAR(20)   NOT NULL,
    company_id              VARCHAR(20)   NOT NULL,
    name                    VARCHAR(191)  NOT NULL,
    company_name            VARCHAR(191)  NOT NULL,
    email                   VARCHAR(191)  NOT NULL,
    phone                   VARCHAR(30)   NOT NULL,
    converted_from_lead_id  VARCHAR(20)   NULL,
    total_value             DECIMAL(15,2) NOT NULL DEFAULT 0,
    status                  VARCHAR(30)   NOT NULL DEFAULT 'active',
    assigned_to             VARCHAR(20)   NULL,
    last_interaction        DATETIME      NULL,
    next_follow_up          DATETIME      NULL,
    notes                   LONGTEXT      NULL,
    is_active               TINYINT(1)    NOT NULL DEFAULT 1,
    created_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_customers_customer_id (customer_id),
    FULLTEXT KEY ft_customers_search (name, company_name, email, phone),
    KEY idx_cust_company_active (company_id, is_active),
    KEY idx_cust_assigned (company_id, assigned_to),
    KEY idx_cust_status (company_id, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── tasks ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS tasks (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    task_id     VARCHAR(20)   NOT NULL,
    company_id  VARCHAR(20)   NOT NULL,
    title       VARCHAR(191)  NOT NULL,
    type        VARCHAR(40)   NOT NULL DEFAULT 'call',
    status      VARCHAR(30)   NOT NULL DEFAULT 'pending',
    priority    VARCHAR(20)   NOT NULL DEFAULT 'medium',
    due_date    DATETIME      NOT NULL,
    assigned_to VARCHAR(20)   NULL,
    related_to  VARCHAR(30)   NULL,
    related_id  VARCHAR(20)   NULL,
    created_by  VARCHAR(20)   NOT NULL,
    notes       LONGTEXT      NULL,
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tasks_task_id (task_id),
    KEY idx_tasks_company_assigned_status (company_id, assigned_to, status, due_date),
    KEY idx_tasks_due_date (company_id, due_date),
    KEY idx_tasks_related (related_to, related_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── notifications ──────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS notifications (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    notif_id    VARCHAR(20)   NOT NULL,
    company_id  VARCHAR(20)   NOT NULL,
    user_id     VARCHAR(20)   NOT NULL,
    title       VARCHAR(191)  NOT NULL,
    message     LONGTEXT      NOT NULL,
    type        VARCHAR(60)   NOT NULL DEFAULT 'system',
    lead_id     VARCHAR(20)   NULL,
    is_read     TINYINT(1)    NOT NULL DEFAULT 0,
    priority    VARCHAR(20)   NOT NULL DEFAULT 'medium',
    actionable  TINYINT(1)    NOT NULL DEFAULT 0,
    action_url  VARCHAR(255)  NULL,
    metadata    JSON          NULL,
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_notif_id (notif_id),
    KEY idx_notif_user_read (user_id, is_read, created_at),
    KEY idx_notif_company (company_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── audit_logs ─────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id            BIGINT        NOT NULL AUTO_INCREMENT,
    audit_id      VARCHAR(20)   NOT NULL,
    company_id    VARCHAR(20)   NULL,
    action        VARCHAR(60)   NOT NULL,
    performed_by  VARCHAR(20)   NOT NULL,
    target_user   VARCHAR(20)   NULL,
    user_email    VARCHAR(191)  NULL,
    user_role     VARCHAR(60)   NULL,
    ip_address    VARCHAR(45)   NULL,
    record_count  INT           NULL,
    details       JSON          NULL,
    logged_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_audit_id (audit_id),
    KEY idx_audit_company_action (company_id, action, logged_at),
    KEY idx_audit_performed_by (performed_by, logged_at),
    KEY idx_audit_logged_at (logged_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── analytics_cache ────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS analytics_cache (
    company_id    VARCHAR(20)   NOT NULL,
    metric_key    VARCHAR(100)  NOT NULL,
    metric_value  JSON          NOT NULL,
    cached_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (company_id, metric_key),
    KEY idx_ac_cached_at (cached_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── demo_requests ──────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS demo_requests (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    name        VARCHAR(191)  NOT NULL,
    email       VARCHAR(191)  NOT NULL,
    phone       VARCHAR(30)   NULL,
    company     VARCHAR(191)  NULL,
    message     LONGTEXT      NULL,
    status      VARCHAR(30)   NOT NULL DEFAULT 'pending',
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_dr_status (status, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

];

const performanceIndexDefinitions = [
  { table: "leads", name: "idx_leads_company_lead_lookup", columns: "company_id, lead_id" },
  { table: "leads", name: "idx_leads_company_assigned_active_created_perf", columns: "company_id, assigned_to, is_active, created_at" },
  { table: "leads", name: "idx_leads_company_created_by_active_created_perf", columns: "company_id, created_by, is_active, created_at" },
  { table: "leads", name: "idx_leads_company_product_active_created_perf", columns: "company_id, product_id, is_active, created_at" },
  { table: "leads", name: "idx_leads_company_status_active_created_perf", columns: "company_id, status, is_active, created_at" },
  { table: "leads", name: "idx_leads_company_priority_active_created_perf", columns: "company_id, priority, is_active, created_at" },
  { table: "leads", name: "idx_leads_company_active_created_id_perf", columns: "company_id, is_active, created_at, id" },
  { table: "leads", name: "idx_leads_company_followup_active_lead_perf", columns: "company_id, is_active, follow_up_date, lead_id" },
  { table: "leads", name: "idx_leads_company_source_active_perf", columns: "company_id, is_active, lead_source" },
  { table: "leads", name: "idx_leads_company_workflow_active_updated_perf", columns: "company_id, workflow_stage, is_active, updated_at" },
  { table: "leads", name: "idx_leads_company_legal_queue_perf", columns: "company_id, assigned_to_legal, is_active, updated_at" },
  { table: "leads", name: "idx_leads_company_finance_queue_perf", columns: "company_id, assigned_to_finance, is_active, updated_at" },
  { table: "leads", name: "idx_leads_company_followup_active_perf", columns: "company_id, is_active, follow_up_date" },
  { table: "lead_notes", name: "idx_lead_notes_company_lead_created_perf", columns: "company_id, lead_id, created_at" },
  { table: "lead_notes", name: "idx_lead_notes_company_lead_created_id_perf", columns: "company_id, lead_id, created_at, id" },
  { table: "lead_activities", name: "idx_lead_activities_company_lead_created_perf", columns: "company_id, lead_id, created_at" },
  { table: "lead_activities", name: "idx_lead_activities_company_lead_created_id_perf", columns: "company_id, lead_id, created_at, id" },
  { table: "lead_stage_history", name: "idx_lsh_company_lead_open_perf", columns: "company_id, lead_id, exited_at, entered_at" },
  { table: "lead_transfer_history", name: "idx_lth_company_transferred_by_perf", columns: "company_id, transferred_by, transferred_at" },
  { table: "lead_transfer_history", name: "idx_lth_company_transferred_to_perf", columns: "company_id, transferred_to, transferred_at" },
  { table: "lead_legal_documents", name: "idx_lld_company_lead_uploaded_perf", columns: "company_id, lead_id, uploaded_at" },
  { table: "lead_finance_documents", name: "idx_lfd_company_lead_uploaded_perf", columns: "company_id, lead_id, uploaded_at" },
  { table: "customers", name: "idx_customers_company_assigned_active_created_perf", columns: "company_id, assigned_to, is_active, created_at" },
  { table: "customers", name: "idx_customers_company_status_active_created_perf", columns: "company_id, status, is_active, created_at" },
  { table: "users", name: "idx_users_company_active_created_perf", columns: "company_id, is_active, created_at" },
  { table: "platform_user_company_access", name: "idx_platform_access_user_company_perf", columns: "user_id, company_id, created_at" },
  { table: "products", name: "idx_products_company_active_created_perf", columns: "company_id, is_active, created_at" },
  { table: "tasks", name: "idx_tasks_company_assigned_status_due_created_perf", columns: "company_id, assigned_to, status, due_date, created_at" },
  { table: "tasks", name: "idx_tasks_company_status_priority_due_perf", columns: "company_id, status, priority, due_date" },
  { table: "notifications", name: "idx_notifications_company_user_read_created_perf", columns: "company_id, user_id, is_read, created_at" },
];

function getPerformanceStatements() {
  return performanceIndexDefinitions.map((definition) =>
    buildIndexStatement(definition.table, definition.name, definition.columns, false)
  );
}

async function bootstrapSchema() {
  for (const stmt of getSchemaStatements()) {
    await connection.query(stmt);
  }
  for (const stmt of getPerformanceStatements()) {
    await connection.query(stmt);
  }
}

module.exports = {
  PLATFORM_COMPANY_ID,
  bootstrapSchema,
  getPerformanceStatements,
  getSchemaStatements,
};
