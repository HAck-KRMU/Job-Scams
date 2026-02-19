const express = require('express');
const router = express.Router();
const { 
  getDashboardAnalytics, 
  getScamReports, 
  getPerformanceAnalytics, 
  getUserActivityReport, 
  getSuspiciousActivityReport, 
  getComprehensiveReport,
  exportReport
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

// Dashboard analytics route
router.route('/dashboard')
  .get(protect, getDashboardAnalytics);

// Scam reports routes
router.route('/scams')
  .get(protect, getScamReports);

// Performance analytics routes
router.route('/performance')
  .get(protect, getPerformanceAnalytics);

// User activity reports
router.route('/users')
  .get(protect, getUserActivityReport);

// Suspicious activity reports
router.route('/activities')
  .get(protect, getSuspiciousActivityReport);

// Comprehensive platform report (admin only)
router.route('/comprehensive')
  .get(protect, authorize('admin'), getComprehensiveReport);

// Export reports (admin only)
router.route('/export/:type')
  .get(protect, authorize('admin'), exportReport);

module.exports = router;