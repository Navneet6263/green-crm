IF COL_LENGTH(N'dbo.company_permissions', N'can_use_platform_email') IS NULL
BEGIN
  ALTER TABLE [dbo].[company_permissions]
  ADD [can_use_platform_email] BIT NOT NULL
    CONSTRAINT [df_company_permissions_can_use_platform_email] DEFAULT 0;
END
