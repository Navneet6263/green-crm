const express = require('express');
const router = express.Router();
const recentActivityController = require('../controllers/recentActivityController');
const authenticate = require('../middlewares/authenticate');
const { createRateLimiter } = require('../middlewares/rateLimiter');

const reportLimiter = createRateLimiter({ windowMs: 60000, max: 6, keyGenerator: req => `recent-updates-report:${req.auth.companyId}:${req.auth.userId}` });

// All routes require authentication
router.use(authenticate);

// GET /api/recent-activity/notes - Get recent notes across leads and customers
router.get('/notes', recentActivityController.getRecentNotes.bind(recentActivityController));

// GET /api/recent-activity/report - Excel report of the filtered updates
router.get('/report/columns', recentActivityController.getReportColumns.bind(recentActivityController));
router.get('/report', reportLimiter, recentActivityController.getReport.bind(recentActivityController));

// GET /api/recent-activity/stats - Get activity statistics
router.get('/stats', recentActivityController.getActivityStats.bind(recentActivityController));

module.exports = router;
