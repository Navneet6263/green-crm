-- Additive migration. Run against the CRM SQL Server database before enabling OTP.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID('dbo.mobile_login_otps', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.mobile_login_otps (
    challenge_id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    email_key CHAR(64) NOT NULL,
    user_id NVARCHAR(20) NULL,
    company_id NVARCHAR(20) NULL,
    code_hash CHAR(64) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    expires_at DATETIME2 NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    consumed_at DATETIME2 NULL,
    CONSTRAINT CK_mobile_login_otp_attempts CHECK (attempts BETWEEN 0 AND 5)
  );
  CREATE INDEX IX_mobile_login_otps_email ON dbo.mobile_login_otps(email_key, created_at);
  CREATE INDEX IX_mobile_login_otps_expiry ON dbo.mobile_login_otps(expires_at);
END;
IF OBJECT_ID('dbo.mobile_login_otp_limits', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.mobile_login_otp_limits (
    scope_key CHAR(64) NOT NULL PRIMARY KEY,
    window_started_at DATETIME2 NOT NULL,
    last_requested_at DATETIME2 NOT NULL,
    request_count INT NOT NULL
  );
  CREATE INDEX IX_mobile_login_otp_limits_age ON dbo.mobile_login_otp_limits(last_requested_at);
END;
COMMIT TRANSACTION;
