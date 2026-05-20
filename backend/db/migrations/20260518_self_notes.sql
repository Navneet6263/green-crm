-- Self Notes Module Migration
-- Creates tables for personal notes system

-- Notes table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'notes')
BEGIN
    CREATE TABLE notes (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id BIGINT NOT NULL,
        title NVARCHAR(255) NOT NULL,
        content NVARCHAR(MAX), -- JSON format for TipTap editor
        color NVARCHAR(20) NULL,
        is_pinned BIT DEFAULT 0,
        is_archived BIT DEFAULT 0,
        word_count INT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_notes_user FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Indexes for performance
    CREATE INDEX IX_notes_user_id ON notes(user_id);
    CREATE INDEX IX_notes_is_pinned ON notes(is_pinned);
    CREATE INDEX IX_notes_is_archived ON notes(is_archived);
    CREATE INDEX IX_notes_created_at ON notes(created_at DESC);
END
GO

-- Note tags table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'note_tags')
BEGIN
    CREATE TABLE note_tags (
        id INT PRIMARY KEY IDENTITY(1,1),
        note_id UNIQUEIDENTIFIER NOT NULL,
        tag NVARCHAR(50) NOT NULL,
        CONSTRAINT FK_note_tags_note FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );

    -- Indexes
    CREATE INDEX IX_note_tags_note_id ON note_tags(note_id);
    CREATE INDEX IX_note_tags_tag ON note_tags(tag);
END
GO
