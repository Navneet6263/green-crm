-- Add onboarding tracking columns to customers table
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'dbo.customers') AND name = N'onboarding_date'
)
BEGIN
  ALTER TABLE [dbo].[customers] ADD [onboarding_date] DATETIME2 NULL;
END

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'dbo.customers') AND name = N'onboarding_status'
)
BEGIN
  ALTER TABLE [dbo].[customers] ADD [onboarding_status] NVARCHAR(30) NOT NULL DEFAULT 'pending';
END

-- Customer members table for multi-person assignment
IF OBJECT_ID(N'dbo.customer_members', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[customer_members] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [company_id] NVARCHAR(20) NOT NULL,
    [customer_id] NVARCHAR(20) NOT NULL,
    [user_id] NVARCHAR(20) NOT NULL,
    [role] NVARCHAR(30) NOT NULL DEFAULT 'collaborator',
    [added_by] NVARCHAR(20) NULL,
    [is_active] BIT NOT NULL DEFAULT 1,
    [created_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY ([id])
  );
END

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'uq_customer_members_customer_user' AND object_id = OBJECT_ID(N'dbo.customer_members')
)
BEGIN
  CREATE UNIQUE INDEX [uq_customer_members_customer_user] ON [dbo].[customer_members] ([customer_id], [user_id]);
END

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'idx_customer_members_company_customer' AND object_id = OBJECT_ID(N'dbo.customer_members')
)
BEGIN
  CREATE INDEX [idx_customer_members_company_customer] ON [dbo].[customer_members] ([company_id], [customer_id], [is_active]);
END
