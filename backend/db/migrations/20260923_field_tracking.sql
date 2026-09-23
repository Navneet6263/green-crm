-- SQL Server. Additive, explicit migration; run against the intended CRM DB.
-- Does not alter existing CRM records. Back up and test in staging first.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID(N'dbo.field_tracking_sessions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.field_tracking_sessions (
    company_id NVARCHAR(20) NOT NULL, user_id NVARCHAR(20) NOT NULL,
    session_id UNIQUEIDENTIFIER NOT NULL, device_id UNIQUEIDENTIFIER NOT NULL,
    started_at DATETIME2 NOT NULL, stopped_at DATETIME2 NULL,
    consent_version INT NOT NULL, received_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_field_tracking_sessions PRIMARY KEY(company_id,user_id,session_id)
  );
  CREATE INDEX ix_field_sessions_time ON dbo.field_tracking_sessions(company_id,user_id,started_at DESC);
END;
IF OBJECT_ID(N'dbo.field_tracking_events', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.field_tracking_events (
    company_id NVARCHAR(20) NOT NULL, user_id NVARCHAR(20) NOT NULL,
    event_id UNIQUEIDENTIFIER NOT NULL, session_id UNIQUEIDENTIFIER NOT NULL,
    kind VARCHAR(10) NOT NULL, captured_at DATETIME2 NOT NULL,
    latitude FLOAT NULL, longitude FLOAT NULL, accuracy FLOAT NULL,
    mocked BIT NOT NULL DEFAULT 0, label NVARCHAR(160) NULL,
    payload_hash CHAR(64) NOT NULL, received_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_field_tracking_events PRIMARY KEY(company_id,user_id,event_id),
    CONSTRAINT FK_field_tracking_session FOREIGN KEY(company_id,user_id,session_id)
      REFERENCES dbo.field_tracking_sessions(company_id,user_id,session_id),
    CONSTRAINT CK_field_event_kind CHECK(kind IN ('start','point','reach','stop')),
    CONSTRAINT CK_field_event_coordinates CHECK(latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  );
  CREATE INDEX ix_field_events_trip ON dbo.field_tracking_events(company_id,user_id,session_id,captured_at,event_id);
END;
IF OBJECT_ID(N'dbo.lead_field_photos', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.lead_field_photos (
    company_id NVARCHAR(20) NOT NULL, photo_id UNIQUEIDENTIFIER NOT NULL,
    lead_id NVARCHAR(20) NOT NULL, uploaded_by NVARCHAR(20) NOT NULL,
    file_name VARCHAR(140) NOT NULL, content_type VARCHAR(30) NOT NULL,
    file_size INT NOT NULL, content_hash CHAR(64) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_lead_field_photos PRIMARY KEY(company_id,photo_id)
  );
  CREATE INDEX ix_lead_field_photos_lead ON dbo.lead_field_photos(company_id,lead_id,created_at);
END;
COMMIT;
