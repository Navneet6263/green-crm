-- 1. Add created_by column to customers table (was missing, causing created_by_name to be NULL)
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'dbo.customers') AND name = N'created_by'
)
BEGIN
  ALTER TABLE [dbo].[customers] ADD [created_by] NVARCHAR(20) NULL;
END

-- 2. Create customer_activities table for proper activity/timeline tracking
--    Same pattern as lead_activities — every note, edit, member change gets logged here.
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.customer_activities') AND type = 'U')
BEGIN
  CREATE TABLE [dbo].[customer_activities] (
    [id]          BIGINT        NOT NULL IDENTITY(1,1),
    [company_id]  NVARCHAR(20)  NOT NULL,
    [customer_id] NVARCHAR(20)  NOT NULL,
    [type]        NVARCHAR(50)  NOT NULL DEFAULT 'updated',
    [description] NVARCHAR(MAX) NULL,
    [created_by]  NVARCHAR(20)  NULL,
    [created_at]  DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [pk_customer_activities] PRIMARY KEY ([id])
  );

  -- Index for fast lookup by customer
  CREATE INDEX [idx_cust_act_customer]
    ON [dbo].[customer_activities] ([customer_id], [company_id], [created_at] DESC);

  -- Index for user activity feed
  CREATE INDEX [idx_cust_act_created_by]
    ON [dbo].[customer_activities] ([company_id], [created_by], [created_at] DESC);
END
