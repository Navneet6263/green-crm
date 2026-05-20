const { query } = require('../db/connection');

class NoteTagRepository {
  /**
   * Add tags to a note
   */
  async addTags(noteId, tags) {
    if (!tags || tags.length === 0) return [];

    // Build bulk insert values
    const placeholders = tags.map(() => '(?, ?)').join(', ');
    const params = [];
    tags.forEach(tag => {
      params.push(noteId, tag);
    });

    const queryText = `
      INSERT INTO note_tags (note_id, tag)
      VALUES ${placeholders}
    `;

    await query(queryText, params);
    
    // Return inserted tags
    return this.getTagsByNoteId(noteId);
  }

  /**
   * Remove all tags from a note
   */
  async removeAllTags(noteId) {
    const queryText = `DELETE FROM note_tags WHERE note_id = ?`;
    await query(queryText, [noteId]);
  }

  /**
   * Replace tags for a note
   */
  async replaceTags(noteId, tags) {
    await this.removeAllTags(noteId);
    if (tags && tags.length > 0) {
      return this.addTags(noteId, tags);
    }
    return [];
  }

  /**
   * Get tags for a note
   */
  async getTagsByNoteId(noteId) {
    const queryText = `
      SELECT id, note_id, tag
      FROM note_tags
      WHERE note_id = ?
      ORDER BY tag ASC
    `;

    const [rows] = await query(queryText, [noteId]);
    return rows;
  }
}

module.exports = new NoteTagRepository();
