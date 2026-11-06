// Tables for the Developer page: API keys, lead capture links and the request log.
// Created on start-up if missing; every change only adds tables or indexes.

async function ensureDeveloperTables(pool) {
  await pool.request().query(`
    IF OBJECT_ID('developer_api_keys', 'U') IS NULL
    BEGIN
      CREATE TABLE developer_api_keys (
        key_id         VARCHAR(40)    NOT NULL PRIMARY KEY,
        company_id     VARCHAR(20)    NOT NULL,
        name           NVARCHAR(120)  NOT NULL,
        key_prefix     VARCHAR(24)    NOT NULL,
        key_hash       CHAR(64)       NOT NULL,
        scopes         VARCHAR(200)   NOT NULL,
        created_by     VARCHAR(20)    NOT NULL,
        created_at     DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
        expires_at     DATETIME2      NULL,
        last_used_at   DATETIME2      NULL,
        last_used_ip   VARCHAR(64)    NULL,
        request_count  INT            NOT NULL DEFAULT 0,
        revoked_at     DATETIME2      NULL,
        revoked_by     VARCHAR(20)    NULL
      );
      CREATE UNIQUE INDEX uq_developer_api_keys_hash ON developer_api_keys (key_hash);
      CREATE INDEX idx_developer_api_keys_company ON developer_api_keys (company_id, created_at);
    END;

    IF OBJECT_ID('lead_capture_forms', 'U') IS NULL
    BEGIN
      CREATE TABLE lead_capture_forms (
        form_id        VARCHAR(40)    NOT NULL PRIMARY KEY,
        company_id     VARCHAR(20)    NOT NULL,
        name           NVARCHAR(120)  NOT NULL,
        token          VARCHAR(64)    NOT NULL,
        lead_source    NVARCHAR(60)   NOT NULL DEFAULT 'website',
        product_id     VARCHAR(40)    NULL,
        owner_ids      NVARCHAR(1000) NULL,
        next_owner     INT            NOT NULL DEFAULT 0,
        redirect_url   NVARCHAR(500)  NULL,
        is_active      BIT            NOT NULL DEFAULT 1,
        lead_count     INT            NOT NULL DEFAULT 0,
        repeat_count   INT            NOT NULL DEFAULT 0,
        last_lead_at   DATETIME2      NULL,
        created_by     VARCHAR(20)    NOT NULL,
        created_at     DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at     DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
      );
      CREATE UNIQUE INDEX uq_lead_capture_forms_token ON lead_capture_forms (token);
      CREATE INDEX idx_lead_capture_forms_company ON lead_capture_forms (company_id, created_at);
    END;

    IF OBJECT_ID('developer_request_log', 'U') IS NULL
    BEGIN
      CREATE TABLE developer_request_log (
        id             BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        company_id     VARCHAR(20)    NOT NULL,
        kind           VARCHAR(10)    NOT NULL,
        source_id      VARCHAR(40)    NULL,
        source_name    NVARCHAR(120)  NULL,
        method         VARCHAR(8)     NOT NULL,
        path           NVARCHAR(300)  NOT NULL,
        status         INT            NOT NULL,
        duration_ms    INT            NULL,
        ip             VARCHAR(64)    NULL,
        message        NVARCHAR(300)  NULL,
        lead_id        VARCHAR(40)    NULL,
        created_at     DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
      );
      CREATE INDEX idx_developer_request_log_company ON developer_request_log (company_id, created_at);
    END;

    -- Optional list of addresses a key may be used from.
    IF COL_LENGTH('developer_api_keys', 'allowed_ips') IS NULL
      ALTER TABLE developer_api_keys ADD allowed_ips NVARCHAR(500) NULL;

    -- A repeated POST/PATCH with the same Idempotency-Key gets the first answer back.
    IF OBJECT_ID('developer_idempotency', 'U') IS NULL
    BEGIN
      CREATE TABLE developer_idempotency (
        company_id     VARCHAR(20)    NOT NULL,
        idem_key       NVARCHAR(100)  NOT NULL,
        request_hash   CHAR(64)       NOT NULL,
        status         INT            NOT NULL DEFAULT 0,
        response_json  NVARCHAR(MAX)  NULL,
        created_at     DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_developer_idempotency PRIMARY KEY (company_id, idem_key)
      );
      CREATE INDEX idx_developer_idempotency_created ON developer_idempotency (created_at);
    END;

    IF OBJECT_ID('developer_webhooks', 'U') IS NULL
    BEGIN
      CREATE TABLE developer_webhooks (
        webhook_id        VARCHAR(40)    NOT NULL PRIMARY KEY,
        company_id        VARCHAR(20)    NOT NULL,
        name              NVARCHAR(120)  NOT NULL,
        url               NVARCHAR(500)  NOT NULL,
        events            VARCHAR(300)   NOT NULL,
        secret            VARCHAR(80)    NOT NULL,
        is_active         BIT            NOT NULL DEFAULT 1,
        failure_streak    INT            NOT NULL DEFAULT 0,
        disabled_reason   NVARCHAR(300)  NULL,
        last_success_at   DATETIME2      NULL,
        last_failure_at   DATETIME2      NULL,
        created_by        VARCHAR(20)    NOT NULL,
        created_at        DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at        DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
      );
      CREATE INDEX idx_developer_webhooks_company ON developer_webhooks (company_id, is_active);
    END;

    IF OBJECT_ID('developer_webhook_deliveries', 'U') IS NULL
    BEGIN
      CREATE TABLE developer_webhook_deliveries (
        id                BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        webhook_id        VARCHAR(40)    NOT NULL,
        company_id        VARCHAR(20)    NOT NULL,
        event_id          VARCHAR(40)    NOT NULL,
        event             VARCHAR(40)    NOT NULL,
        payload           NVARCHAR(MAX)  NOT NULL,
        state             VARCHAR(12)    NOT NULL DEFAULT 'pending',
        attempts          INT            NOT NULL DEFAULT 0,
        response_status   INT            NULL,
        error             NVARCHAR(300)  NULL,
        duration_ms       INT            NULL,
        next_attempt_at   DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
        created_at        DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
        sent_at           DATETIME2      NULL
      );
      CREATE INDEX idx_webhook_deliveries_due ON developer_webhook_deliveries (state, next_attempt_at);
      CREATE INDEX idx_webhook_deliveries_hook ON developer_webhook_deliveries (webhook_id, created_at);
    END;

    -- One alert email per problem every few hours.
    IF OBJECT_ID('developer_alerts', 'U') IS NULL
      CREATE TABLE developer_alerts (
        company_id     VARCHAR(20)    NOT NULL,
        alert_key      VARCHAR(80)    NOT NULL,
        sent_at        DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_developer_alerts PRIMARY KEY (company_id, alert_key)
      );
  `);
}

module.exports = { ensureDeveloperTables };
