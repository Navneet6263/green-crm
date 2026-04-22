IF OBJECT_ID(N'dbo.company_integrations', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[company_integrations] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [company_id] NVARCHAR(20) NOT NULL,
    [channel] NVARCHAR(30) NOT NULL,
    [enabled] BIT NOT NULL DEFAULT 0,
    [provider] NVARCHAR(60) NOT NULL DEFAULT 'custom',
    [mode] NVARCHAR(40) NOT NULL DEFAULT 'own_credentials',
    [config_json] NVARCHAR(MAX) NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ([id])
  );
END

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'uq_company_integrations_company_channel'
    AND object_id = OBJECT_ID(N'dbo.company_integrations')
)
BEGIN
  CREATE UNIQUE INDEX [uq_company_integrations_company_channel]
  ON [dbo].[company_integrations] ([company_id], [channel]);
END

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'idx_company_integrations_company_enabled'
    AND object_id = OBJECT_ID(N'dbo.company_integrations')
)
BEGIN
  CREATE INDEX [idx_company_integrations_company_enabled]
  ON [dbo].[company_integrations] ([company_id], [enabled], [channel]);
END

IF OBJECT_ID(N'dbo.company_permissions', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[company_permissions] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [company_id] NVARCHAR(20) NOT NULL,
    [can_use_platform_call] BIT NOT NULL DEFAULT 0,
    [can_use_platform_whatsapp] BIT NOT NULL DEFAULT 0,
    [can_use_platform_sms] BIT NOT NULL DEFAULT 0,
    [can_use_attendance] BIT NOT NULL DEFAULT 0,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ([id])
  );
END

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'uq_company_permissions_company'
    AND object_id = OBJECT_ID(N'dbo.company_permissions')
)
BEGIN
  CREATE UNIQUE INDEX [uq_company_permissions_company]
  ON [dbo].[company_permissions] ([company_id]);
END

IF OBJECT_ID(N'dbo.attendance_events', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[attendance_events] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [attendance_event_id] NVARCHAR(20) NOT NULL,
    [company_id] NVARCHAR(20) NOT NULL,
    [user_id] NVARCHAR(20) NOT NULL,
    [event_type] NVARCHAR(20) NOT NULL,
    [ip_address] NVARCHAR(45) NOT NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ([id])
  );
END

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'uq_attendance_events_event_id'
    AND object_id = OBJECT_ID(N'dbo.attendance_events')
)
BEGIN
  CREATE UNIQUE INDEX [uq_attendance_events_event_id]
  ON [dbo].[attendance_events] ([attendance_event_id]);
END

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'idx_attendance_events_company_user_created'
    AND object_id = OBJECT_ID(N'dbo.attendance_events')
)
BEGIN
  CREATE INDEX [idx_attendance_events_company_user_created]
  ON [dbo].[attendance_events] ([company_id], [user_id], [created_at]);
END
