-- GreenCRM SQL Server bootstrap
GO

-- Run this file in SSMS against the target database
GO


GO


IF OBJECT_ID(N'dbo.companies', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[companies] (
    [id] BIGINT        NOT NULL IDENTITY(1,1),
    [company_id] NVARCHAR(20)   NOT NULL,
    [name] NVARCHAR(191)  NOT NULL,
    [slug] NVARCHAR(191)  NOT NULL,
    [contact_email] NVARCHAR(191)  NOT NULL DEFAULT '',
    [contact_phone] NVARCHAR(30)   NULL,
    [industry] NVARCHAR(120)  NULL,
    [admin_email] NVARCHAR(191)  NOT NULL DEFAULT '',
    [service_access] NVARCHAR(MAX)          NULL,
    [service_settings] NVARCHAR(MAX)          NULL,
    [usage_current_leads] INT           NOT NULL DEFAULT 0,
    [usage_current_users] INT           NOT NULL DEFAULT 0,
    [status] NVARCHAR(40)   NOT NULL DEFAULT 'trial',
    [branding_logo_url] NVARCHAR(512)  NULL,
    [branding_primary_color] NVARCHAR(20)  NOT NULL DEFAULT '#3b82f6',
    [settings_timezone] NVARCHAR(64)   NOT NULL DEFAULT 'Asia/Kolkata',
    [settings_currency] NVARCHAR(16)   NOT NULL DEFAULT 'INR',
    [settings_date_format] NVARCHAR(32)   NOT NULL DEFAULT 'DD/MM/YYYY',
    [smtp_host] NVARCHAR(255)  NULL,
    [smtp_port] SMALLINT      NULL,
    [smtp_user] NVARCHAR(255)  NULL,
    [smtp_password] NVARCHAR(255)  NULL,
    [address] NVARCHAR(255)  NULL,
    [city] NVARCHAR(120)  NULL,
    [state] NVARCHAR(120)  NULL,
    [country] NVARCHAR(120)  NOT NULL DEFAULT 'India',
    [website] NVARCHAR(255)  NULL,
    [created_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ([id])
  );
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'uq_companies_company_id' AND object_id = OBJECT_ID(N'dbo.companies')
)
BEGIN
  CREATE UNIQUE INDEX [uq_companies_company_id]
  ON [dbo].[companies] ([company_id]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'uq_companies_slug' AND object_id = OBJECT_ID(N'dbo.companies')
)
BEGIN
  CREATE UNIQUE INDEX [uq_companies_slug]
  ON [dbo].[companies] ([slug]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_companies_status' AND object_id = OBJECT_ID(N'dbo.companies')
)
BEGIN
  CREATE INDEX [idx_companies_status]
  ON [dbo].[companies] ([status]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_companies_created_at' AND object_id = OBJECT_ID(N'dbo.companies')
)
BEGIN
  CREATE INDEX [idx_companies_created_at]
  ON [dbo].[companies] ([created_at]);
END
GO


IF OBJECT_ID(N'dbo.users', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[users] (
    [id] BIGINT        NOT NULL IDENTITY(1,1),
    [user_id] NVARCHAR(20)   NOT NULL,
    [company_id] NVARCHAR(20)   NOT NULL,
    [name] NVARCHAR(191)  NOT NULL,
    [email] NVARCHAR(191)  NOT NULL,
    [password] NVARCHAR(255)  NULL,
    [role] NVARCHAR(60)   NOT NULL DEFAULT 'sales',
    [phone] NVARCHAR(30)   NULL,
    [department] NVARCHAR(120)  NULL,
    [is_active] BIT    NOT NULL DEFAULT 1,
    [login_attempts] INT           NOT NULL DEFAULT 0,
    [lock_until] DATETIME2      NULL,
    [two_factor_enabled] BIT    NOT NULL DEFAULT 0,
    [two_factor_secret] NVARCHAR(255)  NULL,
    [is_super_admin] BIT    NOT NULL DEFAULT 0,
    [super_admin_level] SMALLINT      NOT NULL DEFAULT 0,
    [can_manage_super_admins] BIT    NOT NULL DEFAULT 0,
    [password_expires_at] DATETIME2      NULL,
    [is_temporary_password] BIT    NOT NULL DEFAULT 0,
    [daily_export_count] INT           NOT NULL DEFAULT 0,
    [last_export_reset] DATETIME2      NULL,
    [deactivated_at] DATETIME2      NULL,
    [deactivated_by] NVARCHAR(20)   NULL,
    [last_login_at] DATETIME2      NULL,
    [app_preferences] NVARCHAR(MAX)          NULL,
    [notification_prefs] NVARCHAR(MAX)          NULL,
    [created_by] NVARCHAR(20)   NULL,
    [created_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ([id])
  );
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'uq_users_user_id' AND object_id = OBJECT_ID(N'dbo.users')
)
BEGIN
  CREATE UNIQUE INDEX [uq_users_user_id]
  ON [dbo].[users] ([user_id]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'uq_users_email' AND object_id = OBJECT_ID(N'dbo.users')
)
BEGIN
  CREATE UNIQUE INDEX [uq_users_email]
  ON [dbo].[users] ([email]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_users_company_role_active' AND object_id = OBJECT_ID(N'dbo.users')
)
BEGIN
  CREATE INDEX [idx_users_company_role_active]
  ON [dbo].[users] ([company_id], [is_active], [role]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_users_role_active' AND object_id = OBJECT_ID(N'dbo.users')
)
BEGIN
  CREATE INDEX [idx_users_role_active]
  ON [dbo].[users] ([role], [is_active]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_users_is_super_admin' AND object_id = OBJECT_ID(N'dbo.users')
)
BEGIN
  CREATE INDEX [idx_users_is_super_admin]
  ON [dbo].[users] ([is_super_admin]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_users_created_at' AND object_id = OBJECT_ID(N'dbo.users')
)
BEGIN
  CREATE INDEX [idx_users_created_at]
  ON [dbo].[users] ([created_at]);
END
GO


IF OBJECT_ID(N'dbo.token_blacklist', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[token_blacklist] (
    [id] BIGINT        NOT NULL IDENTITY(1,1),
    [company_id] NVARCHAR(20)   NULL,
    [user_id] NVARCHAR(20)   NOT NULL,
    [token_id] NVARCHAR(191)  NOT NULL,
    [reason] NVARCHAR(60)   NOT NULL DEFAULT 'LOGOUT',
    [deactivated_by] NVARCHAR(20)   NULL,
    [expires_at] DATETIME2      NOT NULL,
    [created_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ([id])
  );
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'uq_token_id' AND object_id = OBJECT_ID(N'dbo.token_blacklist')
)
BEGIN
  CREATE UNIQUE INDEX [uq_token_id]
  ON [dbo].[token_blacklist] ([token_id]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_tbl_user_id' AND object_id = OBJECT_ID(N'dbo.token_blacklist')
)
BEGIN
  CREATE INDEX [idx_tbl_user_id]
  ON [dbo].[token_blacklist] ([user_id], [created_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_tbl_expires_at' AND object_id = OBJECT_ID(N'dbo.token_blacklist')
)
BEGIN
  CREATE INDEX [idx_tbl_expires_at]
  ON [dbo].[token_blacklist] ([expires_at]);
END
GO


IF OBJECT_ID(N'dbo.products', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[products] (
    [id] BIGINT        NOT NULL IDENTITY(1,1),
    [product_id] NVARCHAR(20)   NOT NULL,
    [company_id] NVARCHAR(20)   NOT NULL,
    [name] NVARCHAR(191)  NOT NULL,
    [color] NVARCHAR(32)   NOT NULL DEFAULT '#22c55e',
    [is_active] BIT    NOT NULL DEFAULT 1,
    [created_by] NVARCHAR(20)   NULL,
    [created_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ([id])
  );
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'uq_products_product_id' AND object_id = OBJECT_ID(N'dbo.products')
)
BEGIN
  CREATE UNIQUE INDEX [uq_products_product_id]
  ON [dbo].[products] ([product_id]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'uq_products_company_name' AND object_id = OBJECT_ID(N'dbo.products')
)
BEGIN
  CREATE UNIQUE INDEX [uq_products_company_name]
  ON [dbo].[products] ([company_id], [name]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_products_company_active' AND object_id = OBJECT_ID(N'dbo.products')
)
BEGIN
  CREATE INDEX [idx_products_company_active]
  ON [dbo].[products] ([company_id], [is_active]);
END
GO


IF OBJECT_ID(N'dbo.leads', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[leads] (
    [id] BIGINT        NOT NULL IDENTITY(1,1),
    [lead_id] NVARCHAR(20)   NOT NULL,
    [company_id] NVARCHAR(20)   NOT NULL,
    [contact_person] NVARCHAR(191)  NOT NULL,
    [company_name] NVARCHAR(191)  NOT NULL,
    [email] NVARCHAR(191)  NOT NULL,
    [phone] NVARCHAR(30)   NOT NULL,
    [address_street] NVARCHAR(191)  NULL,
    [address_city] NVARCHAR(120)  NULL,
    [address_state] NVARCHAR(120)  NULL,
    [address_zip] NVARCHAR(32)   NULL,
    [address_country] NVARCHAR(120)  NULL,
    [industry] NVARCHAR(120)  NULL,
    [lead_source] NVARCHAR(60)   NOT NULL DEFAULT 'website',
    [follow_up_date] DATETIME2      NULL,
    [status] NVARCHAR(60)   NOT NULL DEFAULT 'new',
    [priority] NVARCHAR(20)   NOT NULL DEFAULT 'medium',
    [estimated_value] DECIMAL(15,2) NOT NULL DEFAULT 0,
    [assigned_to] NVARCHAR(20)   NULL,
    [assigned_at] DATETIME2      NULL,
    [assigned_by] NVARCHAR(20)   NULL,
    [created_by] NVARCHAR(20)   NOT NULL,
    [product_id] NVARCHAR(20)   NOT NULL,
    [requirements] NVARCHAR(MAX)      NULL,
    [workflow_stage] NVARCHAR(30)   NOT NULL DEFAULT 'sales',
    [assigned_to_legal] NVARCHAR(20)   NULL,
    [assigned_to_finance] NVARCHAR(20)   NULL,
    [agreement_status] NVARCHAR(30)   NOT NULL DEFAULT 'pending',
    [legal_approved_at] DATETIME2      NULL,
    [legal_approved_by] NVARCHAR(20)   NULL,
    [invoice_number] NVARCHAR(100)  NULL,
    [invoice_amount] DECIMAL(15,2) NULL,
    [tax_invoice_number] NVARCHAR(100)  NULL,
    [lead_score] SMALLINT      NOT NULL DEFAULT 0,
    [lead_temperature] NVARCHAR(20)   NOT NULL DEFAULT 'warm',
    [conversion_probability] SMALLINT     NOT NULL DEFAULT 0,
    [lost_reason] NVARCHAR(191)  NULL,
    [first_response_at] DATETIME2      NULL,
    [total_interactions] INT           NOT NULL DEFAULT 0,
    [emails_sent] INT           NOT NULL DEFAULT 0,
    [calls_made] INT           NOT NULL DEFAULT 0,
    [meetings_held] INT           NOT NULL DEFAULT 0,
    [is_active] BIT    NOT NULL DEFAULT 1,
    [tags] NVARCHAR(MAX)          NULL,
    [last_contacted_at] DATETIME2      NULL,
    [created_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ([id])
  );
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'uq_leads_lead_id' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE UNIQUE INDEX [uq_leads_lead_id]
  ON [dbo].[leads] ([lead_id]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_leads_company_active_created' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_company_active_created]
  ON [dbo].[leads] ([company_id], [is_active], [created_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_leads_company_assigned_active' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_company_assigned_active]
  ON [dbo].[leads] ([company_id], [assigned_to], [is_active]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_leads_company_status_priority' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_company_status_priority]
  ON [dbo].[leads] ([company_id], [status], [priority]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_leads_company_workflow' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_company_workflow]
  ON [dbo].[leads] ([company_id], [workflow_stage], [is_active]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_leads_legal' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_legal]
  ON [dbo].[leads] ([assigned_to_legal], [agreement_status]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_leads_finance' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_finance]
  ON [dbo].[leads] ([assigned_to_finance], [workflow_stage]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_leads_followup' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_followup]
  ON [dbo].[leads] ([company_id], [follow_up_date]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_leads_created_by' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_created_by]
  ON [dbo].[leads] ([created_by]);
END
GO


IF OBJECT_ID(N'dbo.lead_notes', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[lead_notes] (
    [id] BIGINT        NOT NULL IDENTITY(1,1),
    [company_id] NVARCHAR(20)   NOT NULL,
    [lead_id] NVARCHAR(20)   NOT NULL,
    [content] NVARCHAR(MAX)      NOT NULL,
    [created_by] NVARCHAR(20)   NOT NULL,
    [created_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ([id])
  );
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_ln_lead_created' AND object_id = OBJECT_ID(N'dbo.lead_notes')
)
BEGIN
  CREATE INDEX [idx_ln_lead_created]
  ON [dbo].[lead_notes] ([lead_id], [created_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_ln_company' AND object_id = OBJECT_ID(N'dbo.lead_notes')
)
BEGIN
  CREATE INDEX [idx_ln_company]
  ON [dbo].[lead_notes] ([company_id], [created_at]);
END
GO


IF OBJECT_ID(N'dbo.lead_activities', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[lead_activities] (
    [id] BIGINT        NOT NULL IDENTITY(1,1),
    [activity_id] NVARCHAR(20)   NOT NULL,
    [company_id] NVARCHAR(20)   NOT NULL,
    [lead_id] NVARCHAR(20)   NOT NULL,
    [type] NVARCHAR(40)   NOT NULL,
    [description] NVARCHAR(MAX)      NULL,
    [created_by] NVARCHAR(20)   NOT NULL,
    [created_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ([id])
  );
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'uq_activity_id' AND object_id = OBJECT_ID(N'dbo.lead_activities')
)
BEGIN
  CREATE UNIQUE INDEX [uq_activity_id]
  ON [dbo].[lead_activities] ([activity_id]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_la_lead_created' AND object_id = OBJECT_ID(N'dbo.lead_activities')
)
BEGIN
  CREATE INDEX [idx_la_lead_created]
  ON [dbo].[lead_activities] ([lead_id], [created_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_la_company_created' AND object_id = OBJECT_ID(N'dbo.lead_activities')
)
BEGIN
  CREATE INDEX [idx_la_company_created]
  ON [dbo].[lead_activities] ([company_id], [created_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_la_actor' AND object_id = OBJECT_ID(N'dbo.lead_activities')
)
BEGIN
  CREATE INDEX [idx_la_actor]
  ON [dbo].[lead_activities] ([created_by], [created_at]);
END
GO


IF OBJECT_ID(N'dbo.lead_stage_history', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[lead_stage_history] (
    [id] BIGINT        NOT NULL IDENTITY(1,1),
    [lead_id] NVARCHAR(20)   NOT NULL,
    [company_id] NVARCHAR(20)   NOT NULL,
    [stage] NVARCHAR(40)   NOT NULL,
    [entered_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [exited_at] DATETIME2      NULL,
    [duration] INT           NULL,
    PRIMARY KEY ([id])
  );
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_lsh_lead' AND object_id = OBJECT_ID(N'dbo.lead_stage_history')
)
BEGIN
  CREATE INDEX [idx_lsh_lead]
  ON [dbo].[lead_stage_history] ([lead_id], [entered_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_lsh_company' AND object_id = OBJECT_ID(N'dbo.lead_stage_history')
)
BEGIN
  CREATE INDEX [idx_lsh_company]
  ON [dbo].[lead_stage_history] ([company_id], [entered_at]);
END
GO


IF OBJECT_ID(N'dbo.lead_transfer_history', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[lead_transfer_history] (
    [id] BIGINT        NOT NULL IDENTITY(1,1),
    [lead_id] NVARCHAR(20)   NOT NULL,
    [company_id] NVARCHAR(20)   NOT NULL,
    [from_stage] NVARCHAR(30)   NOT NULL,
    [to_stage] NVARCHAR(30)   NOT NULL,
    [transferred_by] NVARCHAR(20)   NOT NULL,
    [transferred_to] NVARCHAR(20)   NULL,
    [transferred_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [notes] NVARCHAR(MAX)      NULL,
    PRIMARY KEY ([id])
  );
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_lth_lead' AND object_id = OBJECT_ID(N'dbo.lead_transfer_history')
)
BEGIN
  CREATE INDEX [idx_lth_lead]
  ON [dbo].[lead_transfer_history] ([lead_id], [transferred_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_lth_company' AND object_id = OBJECT_ID(N'dbo.lead_transfer_history')
)
BEGIN
  CREATE INDEX [idx_lth_company]
  ON [dbo].[lead_transfer_history] ([company_id], [transferred_at]);
END
GO


IF OBJECT_ID(N'dbo.lead_legal_documents', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[lead_legal_documents] (
    [id] BIGINT        NOT NULL IDENTITY(1,1),
    [company_id] NVARCHAR(20)   NOT NULL,
    [lead_id] NVARCHAR(20)   NOT NULL,
    [file_name] NVARCHAR(255)  NOT NULL,
    [file_url] NVARCHAR(512)  NOT NULL,
    [file_size] BIGINT        NULL,
    [uploaded_by] NVARCHAR(20)   NOT NULL,
    [document_type] NVARCHAR(40)   NOT NULL DEFAULT 'agreement',
    [uploaded_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ([id])
  );
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_lld_lead' AND object_id = OBJECT_ID(N'dbo.lead_legal_documents')
)
BEGIN
  CREATE INDEX [idx_lld_lead]
  ON [dbo].[lead_legal_documents] ([lead_id], [uploaded_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_lld_company' AND object_id = OBJECT_ID(N'dbo.lead_legal_documents')
)
BEGIN
  CREATE INDEX [idx_lld_company]
  ON [dbo].[lead_legal_documents] ([company_id], [uploaded_at]);
END
GO


IF OBJECT_ID(N'dbo.lead_finance_documents', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[lead_finance_documents] (
    [id] BIGINT        NOT NULL IDENTITY(1,1),
    [company_id] NVARCHAR(20)   NOT NULL,
    [lead_id] NVARCHAR(20)   NOT NULL,
    [file_name] NVARCHAR(255)  NOT NULL,
    [file_url] NVARCHAR(512)  NOT NULL,
    [file_size] BIGINT        NULL,
    [uploaded_by] NVARCHAR(20)   NOT NULL,
    [document_type] NVARCHAR(40)   NOT NULL DEFAULT 'invoice',
    [uploaded_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ([id])
  );
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_lfd_lead' AND object_id = OBJECT_ID(N'dbo.lead_finance_documents')
)
BEGIN
  CREATE INDEX [idx_lfd_lead]
  ON [dbo].[lead_finance_documents] ([lead_id], [uploaded_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_lfd_company' AND object_id = OBJECT_ID(N'dbo.lead_finance_documents')
)
BEGIN
  CREATE INDEX [idx_lfd_company]
  ON [dbo].[lead_finance_documents] ([company_id], [uploaded_at]);
END
GO


IF OBJECT_ID(N'dbo.customers', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[customers] (
    [id] BIGINT        NOT NULL IDENTITY(1,1),
    [customer_id] NVARCHAR(20)   NOT NULL,
    [company_id] NVARCHAR(20)   NOT NULL,
    [name] NVARCHAR(191)  NOT NULL,
    [company_name] NVARCHAR(191)  NOT NULL,
    [email] NVARCHAR(191)  NOT NULL,
    [phone] NVARCHAR(30)   NOT NULL,
    [converted_from_lead_id] NVARCHAR(20)   NULL,
    [total_value] DECIMAL(15,2) NOT NULL DEFAULT 0,
    [status] NVARCHAR(30)   NOT NULL DEFAULT 'active',
    [assigned_to] NVARCHAR(20)   NULL,
    [last_interaction] DATETIME2      NULL,
    [next_follow_up] DATETIME2      NULL,
    [notes] NVARCHAR(MAX)      NULL,
    [is_active] BIT    NOT NULL DEFAULT 1,
    [created_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ([id])
  );
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'uq_customers_customer_id' AND object_id = OBJECT_ID(N'dbo.customers')
)
BEGIN
  CREATE UNIQUE INDEX [uq_customers_customer_id]
  ON [dbo].[customers] ([customer_id]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_cust_company_active' AND object_id = OBJECT_ID(N'dbo.customers')
)
BEGIN
  CREATE INDEX [idx_cust_company_active]
  ON [dbo].[customers] ([company_id], [is_active]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_cust_assigned' AND object_id = OBJECT_ID(N'dbo.customers')
)
BEGIN
  CREATE INDEX [idx_cust_assigned]
  ON [dbo].[customers] ([company_id], [assigned_to]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_cust_status' AND object_id = OBJECT_ID(N'dbo.customers')
)
BEGIN
  CREATE INDEX [idx_cust_status]
  ON [dbo].[customers] ([company_id], [status]);
END
GO


IF OBJECT_ID(N'dbo.tasks', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[tasks] (
    [id] BIGINT        NOT NULL IDENTITY(1,1),
    [task_id] NVARCHAR(20)   NOT NULL,
    [company_id] NVARCHAR(20)   NOT NULL,
    [title] NVARCHAR(191)  NOT NULL,
    [type] NVARCHAR(40)   NOT NULL DEFAULT 'call',
    [status] NVARCHAR(30)   NOT NULL DEFAULT 'pending',
    [priority] NVARCHAR(20)   NOT NULL DEFAULT 'medium',
    [due_date] DATETIME2      NOT NULL,
    [assigned_to] NVARCHAR(20)   NULL,
    [related_to] NVARCHAR(30)   NULL,
    [related_id] NVARCHAR(20)   NULL,
    [created_by] NVARCHAR(20)   NOT NULL,
    [notes] NVARCHAR(MAX)      NULL,
    [created_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ([id])
  );
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'uq_tasks_task_id' AND object_id = OBJECT_ID(N'dbo.tasks')
)
BEGIN
  CREATE UNIQUE INDEX [uq_tasks_task_id]
  ON [dbo].[tasks] ([task_id]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_tasks_company_assigned_status' AND object_id = OBJECT_ID(N'dbo.tasks')
)
BEGIN
  CREATE INDEX [idx_tasks_company_assigned_status]
  ON [dbo].[tasks] ([company_id], [assigned_to], [status], [due_date]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_tasks_due_date' AND object_id = OBJECT_ID(N'dbo.tasks')
)
BEGIN
  CREATE INDEX [idx_tasks_due_date]
  ON [dbo].[tasks] ([company_id], [due_date]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_tasks_related' AND object_id = OBJECT_ID(N'dbo.tasks')
)
BEGIN
  CREATE INDEX [idx_tasks_related]
  ON [dbo].[tasks] ([related_to], [related_id]);
END
GO


IF OBJECT_ID(N'dbo.notifications', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[notifications] (
    [id] BIGINT        NOT NULL IDENTITY(1,1),
    [notif_id] NVARCHAR(20)   NOT NULL,
    [company_id] NVARCHAR(20)   NOT NULL,
    [user_id] NVARCHAR(20)   NOT NULL,
    [title] NVARCHAR(191)  NOT NULL,
    [message] NVARCHAR(MAX)      NOT NULL,
    [type] NVARCHAR(60)   NOT NULL DEFAULT 'system',
    [lead_id] NVARCHAR(20)   NULL,
    [is_read] BIT    NOT NULL DEFAULT 0,
    [priority] NVARCHAR(20)   NOT NULL DEFAULT 'medium',
    [actionable] BIT    NOT NULL DEFAULT 0,
    [action_url] NVARCHAR(255)  NULL,
    [metadata] NVARCHAR(MAX)          NULL,
    [created_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ([id])
  );
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'uq_notif_id' AND object_id = OBJECT_ID(N'dbo.notifications')
)
BEGIN
  CREATE UNIQUE INDEX [uq_notif_id]
  ON [dbo].[notifications] ([notif_id]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_notif_user_read' AND object_id = OBJECT_ID(N'dbo.notifications')
)
BEGIN
  CREATE INDEX [idx_notif_user_read]
  ON [dbo].[notifications] ([user_id], [is_read], [created_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_notif_company' AND object_id = OBJECT_ID(N'dbo.notifications')
)
BEGIN
  CREATE INDEX [idx_notif_company]
  ON [dbo].[notifications] ([company_id], [created_at]);
END
GO


IF OBJECT_ID(N'dbo.audit_logs', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[audit_logs] (
    [id] BIGINT        NOT NULL IDENTITY(1,1),
    [audit_id] NVARCHAR(20)   NOT NULL,
    [company_id] NVARCHAR(20)   NULL,
    [action] NVARCHAR(60)   NOT NULL,
    [performed_by] NVARCHAR(20)   NOT NULL,
    [target_user] NVARCHAR(20)   NULL,
    [user_email] NVARCHAR(191)  NULL,
    [user_role] NVARCHAR(60)   NULL,
    [ip_address] NVARCHAR(45)   NULL,
    [record_count] INT           NULL,
    [details] NVARCHAR(MAX)          NULL,
    [logged_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ([id])
  );
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'uq_audit_id' AND object_id = OBJECT_ID(N'dbo.audit_logs')
)
BEGIN
  CREATE UNIQUE INDEX [uq_audit_id]
  ON [dbo].[audit_logs] ([audit_id]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_audit_company_action' AND object_id = OBJECT_ID(N'dbo.audit_logs')
)
BEGIN
  CREATE INDEX [idx_audit_company_action]
  ON [dbo].[audit_logs] ([company_id], [action], [logged_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_audit_performed_by' AND object_id = OBJECT_ID(N'dbo.audit_logs')
)
BEGIN
  CREATE INDEX [idx_audit_performed_by]
  ON [dbo].[audit_logs] ([performed_by], [logged_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_audit_logged_at' AND object_id = OBJECT_ID(N'dbo.audit_logs')
)
BEGIN
  CREATE INDEX [idx_audit_logged_at]
  ON [dbo].[audit_logs] ([logged_at]);
END
GO


IF OBJECT_ID(N'dbo.analytics_cache', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[analytics_cache] (
    [company_id] NVARCHAR(20)   NOT NULL,
    [metric_key] NVARCHAR(100)  NOT NULL,
    [metric_value] NVARCHAR(MAX)          NOT NULL,
    [cached_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ([company_id], [metric_key])
  );
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_ac_cached_at' AND object_id = OBJECT_ID(N'dbo.analytics_cache')
)
BEGIN
  CREATE INDEX [idx_ac_cached_at]
  ON [dbo].[analytics_cache] ([cached_at]);
END
GO


IF OBJECT_ID(N'dbo.demo_requests', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[demo_requests] (
    [id] BIGINT        NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(191)  NOT NULL,
    [email] NVARCHAR(191)  NOT NULL,
    [phone] NVARCHAR(30)   NULL,
    [company] NVARCHAR(191)  NULL,
    [message] NVARCHAR(MAX)      NULL,
    [status] NVARCHAR(30)   NOT NULL DEFAULT 'pending',
    [created_at] DATETIME2      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ([id])
  );
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_dr_status' AND object_id = OBJECT_ID(N'dbo.demo_requests')
)
BEGIN
  CREATE INDEX [idx_dr_status]
  ON [dbo].[demo_requests] ([status], [created_at]);
END
GO


GO

-- Performance indexes
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_leads_company_lead_lookup' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_company_lead_lookup]
  ON [dbo].[leads] ([company_id], [lead_id]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_leads_company_assigned_active_created_perf' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_company_assigned_active_created_perf]
  ON [dbo].[leads] ([company_id], [assigned_to], [is_active], [created_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_leads_company_created_by_active_created_perf' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_company_created_by_active_created_perf]
  ON [dbo].[leads] ([company_id], [created_by], [is_active], [created_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_leads_company_product_active_created_perf' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_company_product_active_created_perf]
  ON [dbo].[leads] ([company_id], [product_id], [is_active], [created_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_leads_company_status_active_created_perf' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_company_status_active_created_perf]
  ON [dbo].[leads] ([company_id], [status], [is_active], [created_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_leads_company_priority_active_created_perf' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_company_priority_active_created_perf]
  ON [dbo].[leads] ([company_id], [priority], [is_active], [created_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_leads_company_active_created_id_perf' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_company_active_created_id_perf]
  ON [dbo].[leads] ([company_id], [is_active], [created_at], [id]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_leads_company_followup_active_lead_perf' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_company_followup_active_lead_perf]
  ON [dbo].[leads] ([company_id], [is_active], [follow_up_date], [lead_id]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_leads_company_source_active_perf' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_company_source_active_perf]
  ON [dbo].[leads] ([company_id], [is_active], [lead_source]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_leads_company_workflow_active_updated_perf' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_company_workflow_active_updated_perf]
  ON [dbo].[leads] ([company_id], [workflow_stage], [is_active], [updated_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_leads_company_legal_queue_perf' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_company_legal_queue_perf]
  ON [dbo].[leads] ([company_id], [assigned_to_legal], [is_active], [updated_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_leads_company_finance_queue_perf' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_company_finance_queue_perf]
  ON [dbo].[leads] ([company_id], [assigned_to_finance], [is_active], [updated_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_leads_company_followup_active_perf' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_company_followup_active_perf]
  ON [dbo].[leads] ([company_id], [is_active], [follow_up_date]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_lead_notes_company_lead_created_perf' AND object_id = OBJECT_ID(N'dbo.lead_notes')
)
BEGIN
  CREATE INDEX [idx_lead_notes_company_lead_created_perf]
  ON [dbo].[lead_notes] ([company_id], [lead_id], [created_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_lead_notes_company_lead_created_id_perf' AND object_id = OBJECT_ID(N'dbo.lead_notes')
)
BEGIN
  CREATE INDEX [idx_lead_notes_company_lead_created_id_perf]
  ON [dbo].[lead_notes] ([company_id], [lead_id], [created_at], [id]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_lead_activities_company_lead_created_perf' AND object_id = OBJECT_ID(N'dbo.lead_activities')
)
BEGIN
  CREATE INDEX [idx_lead_activities_company_lead_created_perf]
  ON [dbo].[lead_activities] ([company_id], [lead_id], [created_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_lead_activities_company_lead_created_id_perf' AND object_id = OBJECT_ID(N'dbo.lead_activities')
)
BEGIN
  CREATE INDEX [idx_lead_activities_company_lead_created_id_perf]
  ON [dbo].[lead_activities] ([company_id], [lead_id], [created_at], [id]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_lsh_company_lead_open_perf' AND object_id = OBJECT_ID(N'dbo.lead_stage_history')
)
BEGIN
  CREATE INDEX [idx_lsh_company_lead_open_perf]
  ON [dbo].[lead_stage_history] ([company_id], [lead_id], [exited_at], [entered_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_lth_company_transferred_by_perf' AND object_id = OBJECT_ID(N'dbo.lead_transfer_history')
)
BEGIN
  CREATE INDEX [idx_lth_company_transferred_by_perf]
  ON [dbo].[lead_transfer_history] ([company_id], [transferred_by], [transferred_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_lth_company_transferred_to_perf' AND object_id = OBJECT_ID(N'dbo.lead_transfer_history')
)
BEGIN
  CREATE INDEX [idx_lth_company_transferred_to_perf]
  ON [dbo].[lead_transfer_history] ([company_id], [transferred_to], [transferred_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_lld_company_lead_uploaded_perf' AND object_id = OBJECT_ID(N'dbo.lead_legal_documents')
)
BEGIN
  CREATE INDEX [idx_lld_company_lead_uploaded_perf]
  ON [dbo].[lead_legal_documents] ([company_id], [lead_id], [uploaded_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_lfd_company_lead_uploaded_perf' AND object_id = OBJECT_ID(N'dbo.lead_finance_documents')
)
BEGIN
  CREATE INDEX [idx_lfd_company_lead_uploaded_perf]
  ON [dbo].[lead_finance_documents] ([company_id], [lead_id], [uploaded_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_customers_company_assigned_active_created_perf' AND object_id = OBJECT_ID(N'dbo.customers')
)
BEGIN
  CREATE INDEX [idx_customers_company_assigned_active_created_perf]
  ON [dbo].[customers] ([company_id], [assigned_to], [is_active], [created_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_customers_company_status_active_created_perf' AND object_id = OBJECT_ID(N'dbo.customers')
)
BEGIN
  CREATE INDEX [idx_customers_company_status_active_created_perf]
  ON [dbo].[customers] ([company_id], [status], [is_active], [created_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_users_company_active_created_perf' AND object_id = OBJECT_ID(N'dbo.users')
)
BEGIN
  CREATE INDEX [idx_users_company_active_created_perf]
  ON [dbo].[users] ([company_id], [is_active], [created_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_products_company_active_created_perf' AND object_id = OBJECT_ID(N'dbo.products')
)
BEGIN
  CREATE INDEX [idx_products_company_active_created_perf]
  ON [dbo].[products] ([company_id], [is_active], [created_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_tasks_company_assigned_status_due_created_perf' AND object_id = OBJECT_ID(N'dbo.tasks')
)
BEGIN
  CREATE INDEX [idx_tasks_company_assigned_status_due_created_perf]
  ON [dbo].[tasks] ([company_id], [assigned_to], [status], [due_date], [created_at]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_tasks_company_status_priority_due_perf' AND object_id = OBJECT_ID(N'dbo.tasks')
)
BEGIN
  CREATE INDEX [idx_tasks_company_status_priority_due_perf]
  ON [dbo].[tasks] ([company_id], [status], [priority], [due_date]);
END
GO


IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_notifications_company_user_read_created_perf' AND object_id = OBJECT_ID(N'dbo.notifications')
)
BEGIN
  CREATE INDEX [idx_notifications_company_user_read_created_perf]
  ON [dbo].[notifications] ([company_id], [user_id], [is_read], [created_at]);
END
GO


