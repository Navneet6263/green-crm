const sql = require('mssql');
const { query } = require('../db/connection');

class NoteRepository {
  /**
   * Get all notes for a user with filters
   */
  async findByUser(userId, filters = {}) {
    const { search, tag, pinned, archived } = filters;

    let queryText = `
      SELECT DISTINCT
        n.id,
        n.user_id,
        n.title,
        n.content,
        n.color,
        n.is_pinned,
        n.is_archived,
        n.word_count,
        n.created_at,
        n.updated_at,
        (
          SELECT tag
          FROM note_tags nt
          WHERE nt.note_id = n.id
          FOR JSON PATH
        ) as tags
      FROM notes n
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      WHERE n.user_id = ?
    `;

    const params = [userId];

    if (search) {
      queryText += ` AND (n.title LIKE ? OR n.content LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (tag) {
      queryText += ` AND nt.tag = ?`;
      params.push(tag);
    }

    if (pinned !== undefined) {
      queryText += ` AND n.is_pinned = ?`;
      params.push(pinned ? 1 : 0);
    }

    if (archived !== undefined) {
      queryText += ` AND n.is_archived = ?`;
      params.push(archived ? 1 : 0);
    } else {
      // Default: exclude archived
      queryText += ` AND n.is_archived = 0`;
    }

    queryText += ` ORDER BY n.is_pinned DESC, n.updated_at DESC`;

    const [rows] = await query(queryText, params);
    return rows.map(note => ({
      ...note,
      tags: note.tags ? JSON.parse(note.tags).map(t => t.tag) : []
    }));
  }

  /**
   * Find note by ID and user
   */
  async findByIdAndUser(noteId, userId) {
    const queryText = `
      SELECT
        n.id,
        n.user_id,
        n.title,
        n.content,
        n.color,
        n.is_pinned,
        n.is_archived,
        n.word_count,
        n.created_at,
        n.updated_at,
        (
          SELECT tag
          FROM note_tags nt
          WHERE nt.note_id = n.id
          FOR JSON PATH
        ) as tags
      FROM notes n
      WHERE n.id = ? AND n.user_id = ?
    `;

    const [rows] = await query(queryText, [noteId, userId]);
    if (rows.length === 0) return null;

    const note = rows[0];
    return {
      ...note,
      tags: note.tags ? JSON.parse(note.tags).map(t => t.tag) : []
    };
  }

  /**
   * Create a new note
   */
  async create(noteData) {
    // First insert the note
    const insertQuery = `
      INSERT INTO notes (user_id, title, content, color, word_count)
      OUTPUT INSERTED.id
      VALUES (?, ?, ?, ?, ?)
    `;

    const params = [
      noteData.userId,
      noteData.title,
      noteData.content || '',
      noteData.color || null,
      noteData.wordCount || 0
    ];

    const [insertResult] = await query(insertQuery, params);
    
    if (!Array.isArray(insertResult) || insertResult.length === 0) {
      throw new Error('Failed to create note - no ID returned');
    }
    
    const noteId = insertResult[0].id;
    
    // Then fetch the complete note
    const selectQuery = `SELECT * FROM notes WHERE id = ?`;
    const [selectResult] = await query(selectQuery, [noteId]);
    
    if (!Array.isArray(selectResult) || selectResult.length === 0) {
      throw new Error('Failed to fetch created note');
    }
    
    return selectResult[0];
  }

  /**
   * Update note
   */
  async update(noteId, userId, updateData) {
    const fields = [];
    const params = [];

    if (updateData.title !== undefined) {
      fields.push('title = ?');
      params.push(updateData.title);
    }

    if (updateData.content !== undefined) {
      fields.push('content = ?');
      params.push(updateData.content);
    }

    if (updateData.color !== undefined) {
      fields.push('color = ?');
      params.push(updateData.color);
    }

    if (updateData.isPinned !== undefined) {
      fields.push('is_pinned = ?');
      params.push(updateData.isPinned ? 1 : 0);
    }

    if (updateData.isArchived !== undefined) {
      fields.push('is_archived = ?');
      params.push(updateData.isArchived ? 1 : 0);
    }

    if (updateData.wordCount !== undefined) {
      fields.push('word_count = ?');
      params.push(updateData.wordCount);
    }

    if (fields.length === 0) return null;

    fields.push('updated_at = GETDATE()');

    const queryText = `
      UPDATE notes
      SET ${fields.join(', ')}
      WHERE id = ? AND user_id = ?
    `;

    params.push(noteId, userId);

    await query(queryText, params);

    // Get updated note
    const [rows] = await query('SELECT TOP 1 * FROM notes WHERE id = ? AND user_id = ?', [noteId, userId]);
    return rows[0] || null;
  }

  /**
   * Delete note (soft delete by archiving)
   */
  async softDelete(noteId, userId) {
    return this.update(noteId, userId, { isArchived: true });
  }

  /**
   * Toggle pin status
   */
  async togglePin(noteId, userId) {
    const queryText = `
      UPDATE notes
      SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END,
          updated_at = GETDATE()
      WHERE id = ? AND user_id = ?
    `;

    await query(queryText, [noteId, userId]);

    const [rows] = await query('SELECT TOP 1 * FROM notes WHERE id = ? AND user_id = ?', [noteId, userId]);
    return rows[0] || null;
  }

  /**
   * Get all unique tags for a user
   */
  async getUserTags(userId) {
    const queryText = `
      SELECT DISTINCT nt.tag, COUNT(*) as count
      FROM note_tags nt
      INNER JOIN notes n ON nt.note_id = n.id
      WHERE n.user_id = ? AND n.is_archived = 0
      GROUP BY nt.tag
      ORDER BY count DESC, nt.tag ASC
    `;

    const [rows] = await query(queryText, [userId]);
    return rows;
  }
}

module.exports = new NoteRepository();
