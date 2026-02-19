const express = require('express');
const router = express.Router();
const { 
  monitorSocialMedia, 
  monitorUserAccounts, 
  getTrendingTopics, 
  getRecentAlerts, 
  getActivityStats, 
  getSuspiciousActivities, 
  getSuspiciousActivityById, 
  updateActivityStatus,
  createSuspiciousActivity
} = require('../controllers/socialMediaController');
const { protect, authorize } = require('../middleware/auth');

// Social media monitoring routes
router.route('/monitor')
  .post(protect, monitorSocialMedia);

router.route('/monitor-users')
  .post(protect, monitorUserAccounts);

router.route('/trends')
  .get(protect, getTrendingTopics);

router.route('/alerts')
  .get(protect, getRecentAlerts);

router.route('/stats')
  .get(protect, getActivityStats);

router.route('/activities')
  .get(protect, getSuspiciousActivities)
  .post(protect, createSuspiciousActivity);

router.route('/activities/:id')
  .get(protect, getSuspiciousActivityById)
  .put(protect, updateActivityStatus);

module.exports = router;