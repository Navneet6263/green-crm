const recentActivityRepository = require('../repositories/recentActivityRepository');
const customerNoteRepository = require('../repositories/customerNoteRepository');
const { MANAGER_ROLES } = require('../constants/roles');

class RecentActivityController {
  /**
   * GET /api/recent-activity/notes
   * Get recent notes across leads and customers
   */
  async getRecentNotes(req, res, next) {
    try {
      const companyId = req.auth.companyId;
      const userRole = req.auth.role;
      const isManagerOrAbove = MANAGER_ROLES.includes(userRole);
      const { limit = 20, page = 1, type = 'all', myNotesOnly = 'false', users, products } = req.query;

      // Non-managers can ONLY see their own notes
      const allowedUsers = isManagerOrAbove
        ? (users ? users.split(',').filter(Boolean) : [])
        : [req.auth.userId];

      const options = {
        limit: Math.min(parseInt(limit) || 20, 10000), // Max 10,000 for exports
        page: Math.max(parseInt(page) || 1, 1),
        type: ['all', 'leads', 'customers'].includes(type) ? type : 'all',
        userId: isManagerOrAbove ? (myNotesOnly === 'true' ? req.auth.userId : null) : req.auth.userId,
        userIds: allowedUsers,
        productIds: products ? products.split(',').filter(Boolean) : [],
        fromDate: req.query.fromDate ? `${req.query.fromDate} 00:00:00` : null,
        toDate: req.query.toDate ? `${req.query.toDate} 23:59:59` : null,
        search: req.query.search || '',
        sort: req.query.sort || 'recent'
      };

      const result = await recentActivityRepository.getRecentNotes(companyId, options);
      const items = result.items || [];

      res.json({
        success: true,
        data: items,
        items,
        total: result.total || 0,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        },
        meta: {
          count: items.length,
          total: result.total,
          limit: options.limit,
          page: options.page,
          type: options.type,
          myNotesOnly: myNotesOnly === 'true',
          userIds: options.userIds,
          productIds: options.productIds
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/recent-activity/stats
   * Get activity statistics
   */
  async getActivityStats(req, res, next) {
    try {
      const companyId = req.auth.companyId;
      const { days = 7 } = req.query;

      const stats = await recentActivityRepository.getActivityStats(
        companyId,
        parseInt(days) || 7
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/customers/:customerId/notes
   * Create a note for a customer
   */
  async createCustomerNote(req, res, next) {
    try {
      const { customerId } = req.params;
      const { content } = req.body;
      const companyId = req.auth.companyId;
      const userId = req.auth.userId;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Note content is required'
        });
      }

      const note = await customerNoteRepository.create({
        companyId,
        customerId,
        content: content.trim(),
        createdBy: userId
      });

      res.status(201).json({
        success: true,
        data: note,
        message: 'Customer note created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/customers/:customerId/notes
   * Get all notes for a customer
   */
  async getCustomerNotes(req, res, next) {
    try {
      const { customerId } = req.params;

      const notes = await customerNoteRepository.findByCustomer(customerId);

      res.json({
        success: true,
        data: notes
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/customers/:customerId/notes/:noteId
   * Delete a customer note
   */
  async deleteCustomerNote(req, res, next) {
    try {
      const { noteId } = req.params;
      const companyId = req.auth.companyId;

      const deleted = await customerNoteRepository.delete(noteId, companyId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Note not found'
        });
      }

      res.json({
        success: true,
        message: 'Customer note deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RecentActivityController();
