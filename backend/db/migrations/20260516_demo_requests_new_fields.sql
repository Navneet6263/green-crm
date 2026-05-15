-- Add company_size, demo_date, notes to demo_requests (SQL Server)
ALTER TABLE demo_requests ADD company_size VARCHAR(30) NULL;
ALTER TABLE demo_requests ADD demo_date DATETIME NULL;
ALTER TABLE demo_requests ADD notes NVARCHAR(MAX) NULL;
