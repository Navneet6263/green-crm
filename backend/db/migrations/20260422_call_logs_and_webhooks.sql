IF OBJECT_ID(N'dbo.call_logs', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[call_logs] (
    [id] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [call_log_id] NVARCHAR(20) NOT NULL,
    [company_id] NVARCHAR(20) NOT NULL,
    [entity_type] NVARCHAR(20) NOT NULL,
    [entity_id] NVARCHAR(20) NOT NULL,
    [lead_id] NVARCHAR(20) NULL,
    [customer_id] NVARCHAR(20) NULL,
    [provider] NVARCHAR(60) NOT NULL,
    [call_sid] NVARCHAR(191) NULL,
    [reference_id] NVARCHAR(191) NULL,
    [from_number] NVARCHAR(30) NULL,
    [to_number] NVARCHAR(30) NOT NULL,
    [duration_seconds] INT NULL,
    [status] NVARCHAR(40) NOT NULL CONSTRAINT [df_call_logs_status] DEFAULT N'initiated',
    [recording_url] NVARCHAR(1024) NULL,
    [provider_payload] NVARCHAR(MAX) NULL,
    [started_at] DATETIME2 NULL,
    [ended_at] DATETIME2 NULL,
    [created_by] NVARCHAR(20) NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_call_logs_created_at] DEFAULT GETDATE(),
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [df_call_logs_updated_at] DEFAULT GETDATE()
  );
END

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'uq_call_logs_call_log_id' AND object_id = OBJECT_ID(N'dbo.call_logs')
)
BEGIN
  CREATE UNIQUE INDEX [uq_call_logs_call_log_id]
  ON [dbo].[call_logs] ([call_log_id]);
END

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'idx_call_logs_company_lead_created' AND object_id = OBJECT_ID(N'dbo.call_logs')
)
BEGIN
  CREATE INDEX [idx_call_logs_company_lead_created]
  ON [dbo].[call_logs] ([company_id], [lead_id], [created_at]);
END

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'idx_call_logs_company_entity_created' AND object_id = OBJECT_ID(N'dbo.call_logs')
)
BEGIN
  CREATE INDEX [idx_call_logs_company_entity_created]
  ON [dbo].[call_logs] ([company_id], [entity_type], [entity_id], [created_at]);
END

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'idx_call_logs_provider_call_sid' AND object_id = OBJECT_ID(N'dbo.call_logs')
)
BEGIN
  CREATE INDEX [idx_call_logs_provider_call_sid]
  ON [dbo].[call_logs] ([provider], [call_sid]);
END

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'idx_call_logs_provider_reference_id' AND object_id = OBJECT_ID(N'dbo.call_logs')
)
BEGIN
  CREATE INDEX [idx_call_logs_provider_reference_id]
  ON [dbo].[call_logs] ([provider], [reference_id]);
END
