-- Add shared lead access table for SQL Server

IF OBJECT_ID(N'dbo.lead_assignments', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[lead_assignments] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [lead_id] NVARCHAR(20) NOT NULL,
    [company_id] NVARCHAR(20) NOT NULL,
    [user_id] NVARCHAR(20) NOT NULL,
    [access_type] NVARCHAR(30) NOT NULL DEFAULT 'shared',
    [created_by] NVARCHAR(20) NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [updated_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY ([id])
  );
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'uq_lead_assignments_lead_user_access'
    AND object_id = OBJECT_ID(N'dbo.lead_assignments')
)
BEGIN
  CREATE UNIQUE INDEX [uq_lead_assignments_lead_user_access]
  ON [dbo].[lead_assignments] ([lead_id], [user_id], [access_type]);
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_lead_assignments_company_lead'
    AND object_id = OBJECT_ID(N'dbo.lead_assignments')
)
BEGIN
  CREATE INDEX [idx_lead_assignments_company_lead]
  ON [dbo].[lead_assignments] ([company_id], [lead_id], [access_type]);
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_lead_assignments_company_user'
    AND object_id = OBJECT_ID(N'dbo.lead_assignments')
)
BEGIN
  CREATE INDEX [idx_lead_assignments_company_user]
  ON [dbo].[lead_assignments] ([company_id], [user_id], [access_type], [created_at]);
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_lead_assignments_user_lead'
    AND object_id = OBJECT_ID(N'dbo.lead_assignments')
)
BEGIN
  CREATE INDEX [idx_lead_assignments_user_lead]
  ON [dbo].[lead_assignments] ([user_id], [lead_id], [access_type]);
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_lead_assignments_company_lead_perf'
    AND object_id = OBJECT_ID(N'dbo.lead_assignments')
)
BEGIN
  CREATE INDEX [idx_lead_assignments_company_lead_perf]
  ON [dbo].[lead_assignments] ([company_id], [lead_id], [access_type], [user_id]);
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_lead_assignments_company_user_perf'
    AND object_id = OBJECT_ID(N'dbo.lead_assignments')
)
BEGIN
  CREATE INDEX [idx_lead_assignments_company_user_perf]
  ON [dbo].[lead_assignments] ([company_id], [user_id], [access_type], [lead_id]);
END
