-- Migration: Customer Notes and Recent Activity View
-- Date: 2026-05-20
-- Description: Add customer_notes table and create view for recent notes across leads and customers

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Create customer_notes table
-- ══════════════════════════════════════════════════════════════════════════════

IF OBJECT_ID(N'dbo.customer_notes', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[customer_notes] (
    [id]          BIGINT        NOT NULL IDENTITY(1,1),
    [company_id]  NVARCHAR(20)  NOT NULL,
    [customer_id] NVARCHAR(20)  NOT NULL,
    [content]     NVARCHAR(MAX) NOT NULL,
    [created_by]  NVARCHAR(20)  NOT NULL,
    [created_at]  DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    [updated_at]  DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY ([id])
  );
  
  PRINT 'Created table: customer_notes';
END
ELSE
BEGIN
  PRINT 'Table customer_notes already exists';
END
GO

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Create indexes for customer_notes
-- ══════════════════════════════════════════════════════════════════════════════

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_cn_customer_created' AND object_id = OBJECT_ID(N'dbo.customer_notes')
)
BEGIN
  CREATE INDEX [idx_cn_customer_created]
  ON [dbo].[customer_notes] ([customer_id], [created_at]);
  PRINT 'Created index: idx_cn_customer_created';
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_cn_company' AND object_id = OBJECT_ID(N'dbo.customer_notes')
)
BEGIN
  CREATE INDEX [idx_cn_company]
  ON [dbo].[customer_notes] ([company_id], [created_at]);
  PRINT 'Created index: idx_cn_company';
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_cn_created_by' AND object_id = OBJECT_ID(N'dbo.customer_notes')
)
BEGIN
  CREATE INDEX [idx_cn_created_by]
  ON [dbo].[customer_notes] ([created_by], [created_at]);
  PRINT 'Created index: idx_cn_created_by';
END
GO

PRINT 'Migration completed: customer_notes_and_recent_activity';
