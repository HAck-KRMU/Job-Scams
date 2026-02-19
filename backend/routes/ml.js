const express = require('express');
const router = express.Router();
const { analyzeJob, batchAnalyze, getMLStats, retrainModel, getModelPerformance, analyzeActivity } = require('../controllers/mlController');
const { protect, authorize } = require('../middleware/auth');

// All ML routes are protected
router.route('/analyze-job')
  .post(protect, analyzeJob);

router.route('/batch-analyze')
  .post(protect, batchAnalyze);

router.route('/stats')
  .get(protect, getMLStats);

router.route('/retrain')
  .post(protect, authorize('admin'), retrainModel);

router.route('/performance')
  .get(protect, getModelPerformance);

router.route('/analyze-activity')
  .post(protect, analyzeActivity);

module.exports = router;