-- SQL Server: additive migration. Run once before deploying product sharing.
-- Does not reassign any lead, customer, product owner or team membership.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'uq_products_company_product'
  AND object_id = OBJECT_ID(N'dbo.products'))
  CREATE UNIQUE INDEX uq_products_company_product ON dbo.products(company_id, product_id);
IF OBJECT_ID(N'dbo.product_team_mappings', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.product_team_mappings (
    company_id NVARCHAR(20) NOT NULL,
    product_id NVARCHAR(20) NOT NULL,
    team_id NVARCHAR(20) NOT NULL,
    created_by NVARCHAR(20) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_product_team_mappings PRIMARY KEY(company_id, product_id, team_id),
    CONSTRAINT fk_product_mapping_product FOREIGN KEY(company_id, product_id)
      REFERENCES dbo.products(company_id, product_id),
    CONSTRAINT fk_product_mapping_team FOREIGN KEY(company_id, team_id)
      REFERENCES dbo.teams(company_id, team_id)
  );
  CREATE INDEX idx_product_mapping_team ON dbo.product_team_mappings(company_id, team_id, product_id);
END;
COMMIT;
