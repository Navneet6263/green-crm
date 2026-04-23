-- Normalize lead-related SQL Server defaults to UTC.
-- UI converts these timestamps to India time explicitly.

DECLARE @targets TABLE (
  table_name NVARCHAR(128) NOT NULL,
  column_name NVARCHAR(128) NOT NULL
);

INSERT INTO @targets (table_name, column_name)
VALUES
  (N'leads', N'created_at'),
  (N'leads', N'updated_at'),
  (N'lead_notes', N'created_at'),
  (N'lead_notes', N'updated_at'),
  (N'lead_activities', N'created_at'),
  (N'lead_stage_history', N'entered_at'),
  (N'lead_transfer_history', N'transferred_at'),
  (N'lead_assignments', N'created_at'),
  (N'lead_assignments', N'updated_at'),
  (N'call_logs', N'created_at'),
  (N'call_logs', N'updated_at');

DECLARE @table_name NVARCHAR(128);
DECLARE @column_name NVARCHAR(128);
DECLARE @sql NVARCHAR(MAX);
DECLARE @existing_constraint NVARCHAR(128);
DECLARE @target_constraint NVARCHAR(128);

DECLARE target_cursor CURSOR FAST_FORWARD FOR
SELECT table_name, column_name
FROM @targets
WHERE OBJECT_ID(N'dbo.' + table_name, N'U') IS NOT NULL;

OPEN target_cursor;
FETCH NEXT FROM target_cursor INTO @table_name, @column_name;

WHILE @@FETCH_STATUS = 0
BEGIN
  SELECT @existing_constraint = dc.name
  FROM sys.default_constraints dc
  INNER JOIN sys.columns c
    ON c.default_object_id = dc.object_id
  INNER JOIN sys.tables t
    ON t.object_id = c.object_id
  WHERE t.name = @table_name
    AND c.name = @column_name;

  IF @existing_constraint IS NOT NULL
  BEGIN
    SET @sql = N'ALTER TABLE [dbo].[' + @table_name + N'] DROP CONSTRAINT [' + @existing_constraint + N'];';
    EXEC sp_executesql @sql;
  END

  SET @target_constraint = N'df_' + @table_name + N'_' + @column_name + N'_utc';
  SET @sql =
    N'ALTER TABLE [dbo].[' + @table_name + N'] ADD CONSTRAINT [' + @target_constraint + N'] DEFAULT SYSUTCDATETIME() FOR [' + @column_name + N'];';
  EXEC sp_executesql @sql;

  SET @existing_constraint = NULL;
  FETCH NEXT FROM target_cursor INTO @table_name, @column_name;
END

CLOSE target_cursor;
DEALLOCATE target_cursor;
