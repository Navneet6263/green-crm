const db = require('../db/connection');

async function migrate() {
  try {
    console.log('Running migration for customer_subscriptions...');

    const createTableQuery = `
      IF OBJECT_ID(N'dbo.customer_subscriptions', N'U') IS NULL
      BEGIN
        CREATE TABLE [dbo].[customer_subscriptions] (
          [id] BIGINT NOT NULL IDENTITY(1,1),
          [subscription_id] NVARCHAR(20) NOT NULL,
          [company_id] NVARCHAR(20) NOT NULL,
          [customer_id] NVARCHAR(20) NOT NULL,
          [product_id] NVARCHAR(20) NOT NULL,
          [amount] DECIMAL(15,2) NOT NULL DEFAULT 0,
          [duration_months] INT NOT NULL DEFAULT 1,
          [start_date] DATETIME2 NOT NULL,
          [end_date] DATETIME2 NOT NULL,
          [status] NVARCHAR(30) NOT NULL DEFAULT 'active',
          [created_by] NVARCHAR(20) NULL,
          [created_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
          [updated_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
          PRIMARY KEY ([id])
        );

        CREATE UNIQUE INDEX [uq_cust_sub_sub_id] ON [dbo].[customer_subscriptions] ([subscription_id]);
        CREATE INDEX [idx_cust_sub_company_cust] ON [dbo].[customer_subscriptions] ([company_id], [customer_id]);
        CREATE INDEX [idx_cust_sub_end_date] ON [dbo].[customer_subscriptions] ([company_id], [end_date], [status]);

        PRINT 'Table customer_subscriptions created successfully.';
      END
      ELSE
      BEGIN
        PRINT 'Table customer_subscriptions already exists.';
      END
    `;

    // Wait for the query to execute
    await db.query(createTableQuery);

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
