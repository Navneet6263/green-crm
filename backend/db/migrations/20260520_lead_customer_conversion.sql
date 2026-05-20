-- Migration: Add converted_to_customer_id to leads table
-- Date: 2026-05-20
-- Description: Track when a lead is converted to a customer

-- Add converted_to_customer_id column to leads table
IF NOT EXISTS (
  SELECT 1 
  FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'dbo.leads') 
  AND name = 'converted_to_customer_id'
)
BEGIN
  ALTER TABLE [dbo].[leads]
  ADD [converted_to_customer_id] NVARCHAR(20) NULL;
  
  PRINT 'Added converted_to_customer_id column to leads table';
END
ELSE
BEGIN
  PRINT 'Column converted_to_customer_id already exists in leads table';
END
GO

-- Create index for faster lookups
IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_leads_converted_customer' 
  AND object_id = OBJECT_ID(N'dbo.leads')
)
BEGIN
  CREATE INDEX [idx_leads_converted_customer]
  ON [dbo].[leads] ([converted_to_customer_id])
  WHERE [converted_to_customer_id] IS NOT NULL;
  
  PRINT 'Created index idx_leads_converted_customer';
END
ELSE
BEGIN
  PRINT 'Index idx_leads_converted_customer already exists';
END
GO
