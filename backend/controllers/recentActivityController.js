const recentActivityRepository = require('../repositories/recentActivityRepository');
const customerNoteRepository = require('../repositories/customerNoteRepository');
const { MANAGER_ROLES } = require('../constants/roles');
const { resolveTeamScope, parseRequestedTeamIds } = require('../services/accessScopeService');
const auditRepository = require('../repositories/auditRepository');
const { createPrefixedId } = require('../utils/ids');
const AppError = require('../utils/appError');
const { buildUpdatesWorkbook, reportCatalog } = require('../services/recentUpdates/updatesWorkbook');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REPORT_MAX_DAYS = 370;

// Notes are stored in UTC; the dates people pick are Indian calendar days.
const istBound = (date, endOfDay) => {
  if (!date) return null;
  if (!DATE_RE.test(String(date))) throw new AppError('Invalid date. Use YYYY-MM-DD.', 400);
  return new Date(`${date}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+05:30`);
};

async function noteOptions(req, { maxLimit = 10000 } = {}) {
  const companyId = req.auth.companyId;
  const isManagerOrAbove = MANAGER_ROLES.includes(req.auth.role);
  const { limit = 20, page = 1, type = 'all', myNotesOnly = 'false', users, products } = req.query;
  // Non-managers can ONLY see their own notes
  const allowedUsers = isManagerOrAbove ? (users ? String(users).split(',').filter(Boolean) : []) : [req.auth.userId];
  return {
    teamIds: (await resolveTeamScope(req.auth, companyId, parseRequestedTeamIds(req.query))).teamIds,
    limit: Math.max(1, Math.min(parseInt(limit) || 20, maxLimit)), // Max 10,000 for exports
    page: Math.max(parseInt(page) || 1, 1),
    type: ['all', 'leads', 'customers'].includes(type) ? type : 'all',
    userId: isManagerOrAbove ? (myNotesOnly === 'true' ? req.auth.userId : null) : req.auth.userId,
    userIds: allowedUsers,
    productIds: products ? String(products).split(',').filter(Boolean) : [],
    fromDate: istBound(req.query.fromDate, false),
    toDate: istBound(req.query.toDate, true),
    search: req.query.search || '',
    sort: req.query.sort || 'recent'
  };
}

class RecentActivityController {
  /**
   * GET /api/recent-activity/notes
   * Get recent notes across leads and customers
   */
  async getRecentNotes(req, res, next) {
    try {
      const companyId = req.auth.companyId;
      const { myNotesOnly = 'false' } = req.query;
      const options = await noteOptions(req);

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
          productIds: options.productIds,
          teamIds: options.teamIds
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/recent-activity/report/columns
   * Sheets and columns that can be chosen for the Excel report.
   */
  async getReportColumns(req, res) {
    res.json({ success: true, data: reportCatalog() });
  }

  /**
   * GET /api/recent-activity/report
   * Excel report of the filtered updates (same filters and scope as /notes).
   */
  async getReport(req, res, next) {
    try {
      const from = req.query.fromDate;
      const to = req.query.toDate;
      if (!from || !to) throw new AppError('Choose a from and to date for the report.', 400);
      const options = await noteOptions(req);
      if (options.fromDate > options.toDate) throw new AppError('The from date must be before the to date.', 400);
      if ((options.toDate - options.fromDate) / 86400000 > REPORT_MAX_DAYS) throw new AppError('Reports can cover up to one year.', 400);
      options.limit = 10000;
      options.page = 1;

      const result = await recentActivityRepository.getRecentNotes(req.auth.companyId, options);
      const rows = result.items || [];
      const filters = [];
      if (options.type !== 'all') filters.push(options.type === 'leads' ? 'Leads only' : 'Customers only');
      if (rows.length && rows.every((r) => r.team_name === rows[0].team_name) && req.query.team_id) filters.push(`Team: ${rows[0].team_name}`);
      if (MANAGER_ROLES.includes(req.auth.role) && options.userIds.length) {
        filters.push(options.userIds.length === 1 && rows[0] ? `Person: ${rows[0].created_by_name}` : `${options.userIds.length} people`);
      }
      if (options.productIds.length) filters.push(`${options.productIds.length} product${options.productIds.length > 1 ? 's' : ''}`);
      if (options.search) filters.push(`Search: "${String(options.search).slice(0, 40)}"`);

      const sheets = String(req.query.sheets || '').split(',').map((s) => s.trim()).filter(Boolean);
      const appUrl = String(process.env.FRONTEND_URL || '').split(',')[0].trim().replace(/\/$/, '');
      const buffer = await buildUpdatesWorkbook(rows, { from, to, filters, total: result.total || rows.length, appUrl,
        generatedBy: req.auth.name || req.auth.email || 'GreenCRM user' }, req.query);

      await auditRepository.createLog({
        audit_id: await createPrefixedId('aud'),
        company_id: req.auth.companyId,
        action: 'recent_updates.exported',
        performed_by: req.auth.userId,
        user_email: req.auth.email,
        user_role: req.auth.role,
        target_user: null,
        details: { from, to, rows: rows.length, sheets, team_ids: options.teamIds }
      });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="GreenCRM-updates-${from}-to-${to}.xlsx"`);
      res.setHeader('Cache-Control', 'no-store');
      res.send(Buffer.from(buffer));
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
        parseInt(days) || 7,
        (await resolveTeamScope(req.auth, companyId, parseRequestedTeamIds(req.query))).teamIds
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
