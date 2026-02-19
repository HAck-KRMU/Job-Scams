const SocialMediaMonitoringService = require('../services/socialMediaMonitoringService');
const SuspiciousActivity = require('../models/SuspiciousActivity');
const ScamReport = require('../models/ScamReport');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc      Monitor social media for suspicious activities
// @route     POST /api/social-media/monitor
// @access    Private
exports.monitorSocialMedia = asyncHandler(async (req, res, next) => {
  const { platforms, keywords, dateRange } = req.body;

  const results = await SocialMediaMonitoringService.monitorSocialMedia({
    platforms,
    keywords,
    dateRange
  });

  res.status(200).json({
    success: true,
    data: {
      results,
      count: results.length
    }
  });
});

// @desc      Monitor specific user accounts
// @route     POST /api/social-media/monitor-users
// @access    Private
exports.monitorUserAccounts = asyncHandler(async (req, res, next) => {
  const { usernames, platform } = req.body;

  if (!usernames || !platform) {
    return next(
      new ErrorResponse('usernames and platform are required', 400)
    );
  }

  const results = await SocialMediaMonitoringService.monitorUserAccounts(usernames, platform);

  res.status(200).json({
    success: true,
    data: {
      results,
      count: results.length
    }
  });
});

// @desc      Get trending suspicious topics
// @route     GET /api/social-media/trends
// @access    Private
exports.getTrendingTopics = asyncHandler(async (req, res, next) => {
  const { days = 7 } = req.query;

  const trends = await SocialMediaMonitoringService.getTrendingSuspiciousTopics(parseInt(days));

  res.status(200).json({
    success: true,
    data: trends
  });
});

// @desc      Get recent alerts
// @route     GET /api/social-media/alerts
// @access    Private
exports.getRecentAlerts = asyncHandler(async (req, res, next) => {
  const { hours = 1, minConfidence = 0.6, threatLevels } = req.query;

  const options = {
    hoursBack: parseInt(hours),
    minConfidence: parseFloat(minConfidence)
  };

  if (threatLevels) {
    options.threatLevels = threatLevels.split(',');
  }

  const alerts = await SocialMediaMonitoringService.generateAlerts(options);

  res.status(200).json({
    success: true,
    data: {
      alerts,
      count: alerts.length
    }
  });
});

// @desc      Get suspicious activity statistics
// @route     GET /api/social-media/stats
// @access    Private
exports.getActivityStats = asyncHandler(async (req, res, next) => {
  const totalActivities = await SuspiciousActivity.countDocuments();
  const suspiciousActivities = await SuspiciousActivity.countDocuments({ 
    'aiAnalysis.isScam': true 
  });
  const highRiskActivities = await SuspiciousActivity.countDocuments({ 
    threatLevel: { $in: ['high', 'critical'] } 
  });
  const byPlatform = await SuspiciousActivity.aggregate([
    {
      $group: {
        _id: '$platform',
        count: { $sum: 1 }
      }
    }
  ]);
  const byCategory = await SuspiciousActivity.aggregate([
    {
      $group: {
        _id: '$activityType',
        count: { $sum: 1 }
      }
    }
  ]);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentActivities = await SuspiciousActivity.countDocuments({
    createdAt: { $gte: thirtyDaysAgo }
  });

  res.status(200).json({
    success: true,
    data: {
      totalActivities,
      suspiciousActivities,
      highRiskActivities,
      byPlatform,
      byCategory,
      recentActivities,
      suspiciousRate: totalActivities > 0 ? (suspiciousActivities / totalActivities) * 100 : 0,
      highRiskRate: totalActivities > 0 ? (highRiskActivities / totalActivities) * 100 : 0
    }
  });
});

// @desc      Get suspicious activities
// @route     GET /api/social-media/activities
// @access    Private
exports.getSuspiciousActivities = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 25, platform, threatLevel, status, startDate, endDate } = req.query;

  // Build query object
  const query = {};

  if (platform) {
    query.platform = platform;
  }

  if (threatLevel) {
    query.threatLevel = threatLevel;
  }

  if (status) {
    query.status = status;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Pagination
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const total = await SuspiciousActivity.countDocuments(query);

  // Execute query with pagination
  const activities = await SuspiciousActivity.find(query)
    .populate('detectedBy', 'username firstName lastName')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(parseInt(limit));

  // Pagination result
  const pagination = {};
  const totalPages = Math.ceil(total / limit);
  if (parseInt(page) < totalPages) {
    pagination.next = {
      page: parseInt(page) + 1,
      limit: parseInt(limit)
    };
  }

  if (parseInt(page) > 1) {
    pagination.previous = {
      page: parseInt(page) - 1,
      limit: parseInt(limit)
    };
  }

  res.status(200).json({
    success: true,
    count: activities.length,
    pagination,
    data: activities
  });
});

// @desc      Get suspicious activity by ID
// @route     GET /api/social-media/activities/:id
// @access    Private
exports.getSuspiciousActivityById = asyncHandler(async (req, res, next) => {
  const activity = await SuspiciousActivity.findById(req.params.id)
    .populate([
      { path: 'detectedBy', select: 'username firstName lastName' },
      { path: 'involvedUsers', select: 'username firstName lastName email' },
      { path: 'relatedJobListings', select: 'title company' }
    ]);

  if (!activity) {
    return next(
      new ErrorResponse(`Suspicious activity not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: activity
  });
});

// @desc      Update suspicious activity status
// @route     PUT /api/social-media/activities/:id
// @access    Private
exports.updateActivityStatus = asyncHandler(async (req, res, next) => {
  const { status, reviewNotes, actionTaken } = req.body;

  const activity = await SuspiciousActivity.findById(req.params.id);

  if (!activity) {
    return next(
      new ErrorResponse(`Suspicious activity not found with id of ${req.params.id}`, 404)
    );
  }

  // Only allow admins and moderators to update status
  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return next(
      new ErrorResponse('Only admins and moderators can update activity status', 403)
    );
  }

  activity.moderation.reviewed = true;
  activity.moderation.reviewedBy = req.user.id;
  activity.moderation.reviewDate = new Date();
  activity.moderation.reviewNotes = reviewNotes;
  activity.moderation.actionTaken = actionTaken;
  activity.status = status;

  await activity.save();

  res.status(200).json({
    success: true,
    data: activity
  });
});

// @desc      Create manual suspicious activity report
// @route     POST /api/social-media/activities
// @access    Private
exports.createSuspiciousActivity = asyncHandler(async (req, res, next) => {
  const {
    activityType,
    platform,
    source,
    sourceUrl,
    title,
    content,
    author
  } = req.body;

  const activity = await SuspiciousActivity.create({
    activityType,
    platform,
    source,
    sourceUrl,
    title,
    content,
    author,
    detectedBy: req.user.id,
    detectionMethod: 'manual_report'
  });

  res.status(201).json({
    success: true,
    data: activity
  });
});