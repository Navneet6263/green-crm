const express = require('express');
const router = express.Router();
const recentActivityController = require('../controllers/recentActivityController');
const authenticate = require('../middlewares/authenticate');

// All routes require authentication
router.use(authenticate);

// GET /api/recent-activity/notes - Get recent notes across leads and customers
router.get('/notes', recentActivityController.getRecentNotes.bind(recentActivityController));

// GET /api/recent-activity/stats - Get activity statistics
router.get('/stats', recentActivityController.getActivityStats.bind(recentActivityController));

module.exports = router;
