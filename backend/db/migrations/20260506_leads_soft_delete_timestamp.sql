-- Add deleted_at timestamp to leads for proper soft-delete audit trail.
-- Previously only is_active = 0 was set, with no record of when deletion happened.

IF NOT EXISTS (
  SELECT 1
  FROM sys.columns
  WHERE object_id = OBJECT_ID(N'dbo.leads')
    AND name = N'deleted_at'
)
BEGIN
  ALTER TABLE [dbo].[leads]
    ADD [deleted_at] DATETIME2 NULL;
END

-- Backfill: set deleted_at = updated_at for already-archived leads
UPDATE [dbo].[leads]
SET [deleted_at] = [updated_at]
WHERE [is_active] = 0
  AND [deleted_at] IS NULL;
