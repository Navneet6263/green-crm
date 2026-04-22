-- Add number_of_units to leads for SQL Server

IF COL_LENGTH('dbo.leads', 'number_of_units') IS NULL
BEGIN
  ALTER TABLE [dbo].[leads] ADD [number_of_units] INT NULL;
END
GO
