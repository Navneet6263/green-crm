IF OBJECT_ID(N'dbo.lead_documents', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[lead_documents] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [company_id] NVARCHAR(20) NOT NULL,
    [lead_id] NVARCHAR(20) NOT NULL,
    [file_name] NVARCHAR(255) NOT NULL,
    [file_url] NVARCHAR(512) NOT NULL,
    [file_size] BIGINT NULL,
    [content_type] NVARCHAR(191) NULL,
    [uploaded_by] NVARCHAR(20) NOT NULL,
    [uploaded_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY ([id])
  );
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_ld_lead'
    AND object_id = OBJECT_ID(N'dbo.lead_documents')
)
BEGIN
  CREATE INDEX [idx_ld_lead]
  ON [dbo].[lead_documents] ([lead_id], [uploaded_at]);
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_ld_company_lead_uploaded_perf'
    AND object_id = OBJECT_ID(N'dbo.lead_documents')
)
BEGIN
  CREATE INDEX [idx_ld_company_lead_uploaded_perf]
  ON [dbo].[lead_documents] ([company_id], [lead_id], [uploaded_at]);
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'idx_ld_company_uploader_uploaded_perf'
    AND object_id = OBJECT_ID(N'dbo.lead_documents')
)
BEGIN
  CREATE INDEX [idx_ld_company_uploader_uploaded_perf]
  ON [dbo].[lead_documents] ([company_id], [uploaded_by], [uploaded_at]);
END
