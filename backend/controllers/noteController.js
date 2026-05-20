const noteService = require('../services/noteService');

class NoteController {
  /**
   * GET /api/notes - List all notes with filters
   */
  async listNotes(req, res, next) {
    try {
      const userId = req.auth.userId;
      const { search, tag, pinned, archived } = req.query;

      const filters = {
        search,
        tag,
        pinned: pinned !== undefined ? pinned === 'true' : undefined,
        archived: archived !== undefined ? archived === 'true' : undefined
      };

      const notes = await noteService.getUserNotes(userId, filters);

      res.json({
        success: true,
        data: notes
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/notes/:id - Get single note
   */
  async getNote(req, res, next) {
    try {
      const userId = req.auth.userId;
      const { id } = req.params;

      const note = await noteService.getNoteById(id, userId);

      res.json({
        success: true,
        data: note
      });
    } catch (error) {
      if (error.message === 'Note not found') {
        return res.status(404).json({
          success: false,
          message: 'Note not found'
        });
      }
      next(error);
    }
  }

  /**
   * POST /api/notes - Create new note
   */
  async createNote(req, res, next) {
    try {
      const userId = req.auth.userId;
      const { title, content, color, tags } = req.body;

      const note = await noteService.createNote(userId, {
        title,
        content,
        color,
        tags
      });

      res.status(201).json({
        success: true,
        data: note,
        message: 'Note created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/notes/:id - Update note
   */
  async updateNote(req, res, next) {
    try {
      const userId = req.auth.userId;
      const { id } = req.params;
      const { title, content, color, isPinned, tags } = req.body;

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (color !== undefined) updateData.color = color;
      if (isPinned !== undefined) updateData.isPinned = isPinned;
      if (tags !== undefined) updateData.tags = tags;

      const note = await noteService.updateNote(id, userId, updateData);

      res.json({
        success: true,
        data: note,
        message: 'Note updated successfully'
      });
    } catch (error) {
      if (error.message === 'Note not found or update failed') {
        return res.status(404).json({
          success: false,
          message: 'Note not found'
        });
      }
      next(error);
    }
  }

  /**
   * DELETE /api/notes/:id - Delete note (soft delete)
   */
  async deleteNote(req, res, next) {
    try {
      const userId = req.auth.userId;
      const { id } = req.params;

      await noteService.deleteNote(id, userId);

      res.json({
        success: true,
        message: 'Note archived successfully'
      });
    } catch (error) {
      if (error.message === 'Note not found') {
        return res.status(404).json({
          success: false,
          message: 'Note not found'
        });
      }
      next(error);
    }
  }

  /**
   * POST /api/notes/:id/pin - Toggle pin status
   */
  async togglePin(req, res, next) {
    try {
      const userId = req.auth.userId;
      const { id } = req.params;

      const note = await noteService.togglePin(id, userId);

      res.json({
        success: true,
        data: note,
        message: note.is_pinned ? 'Note pinned' : 'Note unpinned'
      });
    } catch (error) {
      if (error.message === 'Note not found') {
        return res.status(404).json({
          success: false,
          message: 'Note not found'
        });
      }
      next(error);
    }
  }

  /**
   * GET /api/notes/tags/all - Get all user tags
   */
  async getUserTags(req, res, next) {
    try {
      const userId = req.auth.userId;
      const tags = await noteService.getUserTags(userId);

      res.json({
        success: true,
        data: tags
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NoteController();
