-- Team access-control rollout migration for SQL Server
-- Run after taking a backup and before running the backfill script.

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'uq_users_company_user_id' AND object_id = OBJECT_ID(N'dbo.users')
)
BEGIN
  CREATE UNIQUE INDEX [uq_users_company_user_id]
  ON [dbo].[users] ([company_id], [user_id]);
END
GO

IF OBJECT_ID(N'dbo.teams', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[teams] (
    [id] BIGINT IDENTITY(1,1) NOT NULL,
    [team_id] NVARCHAR(20) NOT NULL,
    [company_id] NVARCHAR(20) NOT NULL,
    [name] NVARCHAR(191) NOT NULL,
    [code] NVARCHAR(40) NOT NULL,
    [description] NVARCHAR(255) NULL,
    [created_by] NVARCHAR(20) NULL,
    [is_active] BIT NOT NULL DEFAULT 1,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_teams] PRIMARY KEY ([id])
  );
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'uq_teams_team_id' AND object_id = OBJECT_ID(N'dbo.teams')
)
BEGIN
  CREATE UNIQUE INDEX [uq_teams_team_id] ON [dbo].[teams] ([team_id]);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'uq_teams_company_code' AND object_id = OBJECT_ID(N'dbo.teams')
)
BEGIN
  CREATE UNIQUE INDEX [uq_teams_company_code] ON [dbo].[teams] ([company_id], [code]);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'uq_teams_company_name' AND object_id = OBJECT_ID(N'dbo.teams')
)
BEGIN
  CREATE UNIQUE INDEX [uq_teams_company_name] ON [dbo].[teams] ([company_id], [name]);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'uq_teams_company_team_id' AND object_id = OBJECT_ID(N'dbo.teams')
)
BEGIN
  CREATE UNIQUE INDEX [uq_teams_company_team_id] ON [dbo].[teams] ([company_id], [team_id]);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'idx_teams_company_active' AND object_id = OBJECT_ID(N'dbo.teams')
)
BEGIN
  CREATE INDEX [idx_teams_company_active] ON [dbo].[teams] ([company_id], [is_active], [created_at]);
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = N'fk_teams_company' AND parent_object_id = OBJECT_ID(N'dbo.teams')
)
BEGIN
  ALTER TABLE [dbo].[teams]
  ADD CONSTRAINT [fk_teams_company]
  FOREIGN KEY ([company_id]) REFERENCES [dbo].[companies] ([company_id]);
END
GO

IF OBJECT_ID(N'dbo.team_members', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[team_members] (
    [id] BIGINT IDENTITY(1,1) NOT NULL,
    [company_id] NVARCHAR(20) NOT NULL,
    [team_id] NVARCHAR(20) NOT NULL,
    [user_id] NVARCHAR(20) NOT NULL,
    [membership_role] NVARCHAR(40) NOT NULL DEFAULT N'member',
    [is_primary] BIT NOT NULL DEFAULT 0,
    [is_active] BIT NOT NULL DEFAULT 1,
    [added_by] NVARCHAR(20) NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_team_members] PRIMARY KEY ([id])
  );
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'uq_team_members_team_user' AND object_id = OBJECT_ID(N'dbo.team_members')
)
BEGIN
  CREATE UNIQUE INDEX [uq_team_members_team_user] ON [dbo].[team_members] ([team_id], [user_id]);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'idx_team_members_company_user' AND object_id = OBJECT_ID(N'dbo.team_members')
)
BEGIN
  CREATE INDEX [idx_team_members_company_user] ON [dbo].[team_members] ([company_id], [user_id], [is_active]);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'idx_team_members_company_team' AND object_id = OBJECT_ID(N'dbo.team_members')
)
BEGIN
  CREATE INDEX [idx_team_members_company_team] ON [dbo].[team_members] ([company_id], [team_id], [is_active]);
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = N'fk_team_members_team' AND parent_object_id = OBJECT_ID(N'dbo.team_members')
)
BEGIN
  ALTER TABLE [dbo].[team_members]
  ADD CONSTRAINT [fk_team_members_team]
  FOREIGN KEY ([company_id], [team_id]) REFERENCES [dbo].[teams] ([company_id], [team_id]);
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = N'fk_team_members_user' AND parent_object_id = OBJECT_ID(N'dbo.team_members')
)
BEGIN
  ALTER TABLE [dbo].[team_members]
  ADD CONSTRAINT [fk_team_members_user]
  FOREIGN KEY ([company_id], [user_id]) REFERENCES [dbo].[users] ([company_id], [user_id]);
END
GO

IF OBJECT_ID(N'dbo.team_managers', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[team_managers] (
    [id] BIGINT IDENTITY(1,1) NOT NULL,
    [company_id] NVARCHAR(20) NOT NULL,
    [team_id] NVARCHAR(20) NOT NULL,
    [user_id] NVARCHAR(20) NOT NULL,
    [is_active] BIT NOT NULL DEFAULT 1,
    [added_by] NVARCHAR(20) NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_team_managers] PRIMARY KEY ([id])
  );
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'uq_team_managers_team_user' AND object_id = OBJECT_ID(N'dbo.team_managers')
)
BEGIN
  CREATE UNIQUE INDEX [uq_team_managers_team_user] ON [dbo].[team_managers] ([team_id], [user_id]);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'idx_team_managers_company_user' AND object_id = OBJECT_ID(N'dbo.team_managers')
)
BEGIN
  CREATE INDEX [idx_team_managers_company_user] ON [dbo].[team_managers] ([company_id], [user_id], [is_active]);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'idx_team_managers_company_team' AND object_id = OBJECT_ID(N'dbo.team_managers')
)
BEGIN
  CREATE INDEX [idx_team_managers_company_team] ON [dbo].[team_managers] ([company_id], [team_id], [is_active]);
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = N'fk_team_managers_team' AND parent_object_id = OBJECT_ID(N'dbo.team_managers')
)
BEGIN
  ALTER TABLE [dbo].[team_managers]
  ADD CONSTRAINT [fk_team_managers_team]
  FOREIGN KEY ([company_id], [team_id]) REFERENCES [dbo].[teams] ([company_id], [team_id]);
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = N'fk_team_managers_user' AND parent_object_id = OBJECT_ID(N'dbo.team_managers')
)
BEGIN
  ALTER TABLE [dbo].[team_managers]
  ADD CONSTRAINT [fk_team_managers_user]
  FOREIGN KEY ([company_id], [user_id]) REFERENCES [dbo].[users] ([company_id], [user_id]);
END
GO

IF COL_LENGTH('dbo.products', 'team_id') IS NULL
BEGIN
  ALTER TABLE [dbo].[products] ADD [team_id] NVARCHAR(20) NULL;
END
GO

IF COL_LENGTH('dbo.leads', 'team_id') IS NULL
BEGIN
  ALTER TABLE [dbo].[leads] ADD [team_id] NVARCHAR(20) NULL;
END
GO

IF COL_LENGTH('dbo.customers', 'team_id') IS NULL
BEGIN
  ALTER TABLE [dbo].[customers] ADD [team_id] NVARCHAR(20) NULL;
END
GO

IF COL_LENGTH('dbo.tasks', 'team_id') IS NULL
BEGIN
  ALTER TABLE [dbo].[tasks] ADD [team_id] NVARCHAR(20) NULL;
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'idx_products_company_team' AND object_id = OBJECT_ID(N'dbo.products')
)
BEGIN
  CREATE INDEX [idx_products_company_team] ON [dbo].[products] ([company_id], [team_id], [is_active]);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'idx_leads_company_team_active' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_company_team_active] ON [dbo].[leads] ([company_id], [team_id], [is_active], [created_at]);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'idx_leads_team_status' AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_team_status] ON [dbo].[leads] ([team_id], [status], [is_active]);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'idx_customers_company_team' AND object_id = OBJECT_ID(N'dbo.customers')
)
BEGIN
  CREATE INDEX [idx_customers_company_team] ON [dbo].[customers] ([company_id], [team_id], [is_active], [created_at]);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'idx_tasks_company_team' AND object_id = OBJECT_ID(N'dbo.tasks')
)
BEGIN
  CREATE INDEX [idx_tasks_company_team] ON [dbo].[tasks] ([company_id], [team_id], [status], [due_date]);
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = N'fk_products_team' AND parent_object_id = OBJECT_ID(N'dbo.products')
)
BEGIN
  ALTER TABLE [dbo].[products]
  ADD CONSTRAINT [fk_products_team]
  FOREIGN KEY ([company_id], [team_id]) REFERENCES [dbo].[teams] ([company_id], [team_id]);
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = N'fk_leads_team' AND parent_object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  ALTER TABLE [dbo].[leads]
  ADD CONSTRAINT [fk_leads_team]
  FOREIGN KEY ([company_id], [team_id]) REFERENCES [dbo].[teams] ([company_id], [team_id]);
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = N'fk_customers_team' AND parent_object_id = OBJECT_ID(N'dbo.customers')
)
BEGIN
  ALTER TABLE [dbo].[customers]
  ADD CONSTRAINT [fk_customers_team]
  FOREIGN KEY ([company_id], [team_id]) REFERENCES [dbo].[teams] ([company_id], [team_id]);
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = N'fk_tasks_team' AND parent_object_id = OBJECT_ID(N'dbo.tasks')
)
BEGIN
  ALTER TABLE [dbo].[tasks]
  ADD CONSTRAINT [fk_tasks_team]
  FOREIGN KEY ([company_id], [team_id]) REFERENCES [dbo].[teams] ([company_id], [team_id]);
END
GO
