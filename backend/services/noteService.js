const noteRepository = require('../repositories/noteRepository');
const noteTagRepository = require('../repositories/noteTagRepository');
const userRepository = require('../repositories/userRepository');

class NoteService {
  /**
   * Get all notes for user with filters
   */
  async getUserNotes(userId, filters) {
    // Get user's numeric id from user_id string
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return noteRepository.findByUser(user.id, filters);
  }

  /**
   * Get single note by ID
   */
  async getNoteById(noteId, userId) {
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const note = await noteRepository.findByIdAndUser(noteId, user.id);
    if (!note) {
      throw new Error('Note not found');
    }
    return note;
  }

  /**
   * Create a new note
   */
  async createNote(userId, noteData) {
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const { title, content, color, tags } = noteData;

    // Calculate word count from content
    const wordCount = this.calculateWordCount(content);

    const note = await noteRepository.create({
      userId: user.id,
      title: title || 'Untitled Note',
      content: content || '',
      color,
      wordCount
    });

    if (!note) {
      throw new Error('Failed to create note');
    }

    // Add tags if provided
    if (tags && tags.length > 0) {
      await noteTagRepository.addTags(note.id, tags);
      note.tags = tags;
    } else {
      note.tags = [];
    }

    return note;
  }

  /**
   * Update note
   */
  async updateNote(noteId, userId, updateData) {
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const { tags, ...noteFields } = updateData;

    // Calculate word count if content is being updated
    if (noteFields.content !== undefined) {
      noteFields.wordCount = this.calculateWordCount(noteFields.content);
    }

    const updatedNote = await noteRepository.update(noteId, user.id, noteFields);
    if (!updatedNote) {
      throw new Error('Note not found or update failed');
    }

    // Update tags if provided
    if (tags !== undefined) {
      await noteTagRepository.replaceTags(noteId, tags);
      updatedNote.tags = tags;
    } else {
      const noteTags = await noteTagRepository.getTagsByNoteId(noteId);
      updatedNote.tags = noteTags.map(t => t.tag);
    }

    return updatedNote;
  }

  /**
   * Delete note (soft delete)
   */
  async deleteNote(noteId, userId) {
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const deletedNote = await noteRepository.softDelete(noteId, user.id);
    if (!deletedNote) {
      throw new Error('Note not found');
    }
    return deletedNote;
  }

  /**
   * Toggle pin status
   */
  async togglePin(noteId, userId) {
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const note = await noteRepository.togglePin(noteId, user.id);
    if (!note) {
      throw new Error('Note not found');
    }

    const noteTags = await noteTagRepository.getTagsByNoteId(noteId);
    note.tags = noteTags.map(t => t.tag);

    return note;
  }

  /**
   * Get all tags for user
   */
  async getUserTags(userId) {
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return noteRepository.getUserTags(user.id);
  }

  /**
   * Calculate word count from TipTap JSON content
   */
  calculateWordCount(content) {
    if (!content) return 0;

    try {
      // If content is JSON string, parse it
      const contentObj = typeof content === 'string' ? JSON.parse(content) : content;
      
      // Extract text from TipTap JSON structure
      const text = this.extractTextFromTipTap(contentObj);
      
      // Count words
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
      return words.length;
    } catch (error) {
      // If parsing fails, treat as plain text
      const words = content.trim().split(/\s+/).filter(word => word.length > 0);
      return words.length;
    }
  }

  /**
   * Recursively extract text from TipTap JSON
   */
  extractTextFromTipTap(node) {
    if (!node) return '';

    let text = '';

    if (node.text) {
      text += node.text;
    }

    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        text += ' ' + this.extractTextFromTipTap(child);
      }
    }

    return text;
  }
}

module.exports = new NoteService();
