const JobListing = require('../models/JobListing');
const ScamReport = require('../models/ScamReport');
const SuspiciousActivity = require('../models/SuspiciousActivity');
const User = require('../models/User');
const ModelPerformance = require('../models/ModelPerformance');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc      Get platform analytics dashboard
// @route     GET /api/reports/dashboard
// @access    Private
exports.getDashboardAnalytics = asyncHandler(async (req, res, next) => {
  // Overall platform statistics
  const totalUsers = await User.countDocuments({ isActive: true });
  const totalJobs = await JobListing.countDocuments();
  const totalReports = await ScamReport.countDocuments();
  const totalActivities = await SuspiciousActivity.countDocuments();
  
  // Job statistics
  const activeJobs = await JobListing.countDocuments({ status: 'active' });
  const scamJobs = await JobListing.countDocuments({ 'scamDetection.isScam': true });
  const flaggedJobs = await JobListing.countDocuments({ flagged: true });
  
  // Report statistics
  const pendingReports = await ScamReport.countDocuments({ status: 'pending' });
  const verifiedReports = await ScamReport.countDocuments({ isVerified: true });
  const resolvedReports = await ScamReport.countDocuments({ status: 'resolved' });
  
  // Activity statistics
  const suspiciousActivities = await SuspiciousActivity.countDocuments({ 'aiAnalysis.isScam': true });
  const highRiskActivities = await SuspiciousActivity.countDocuments({ threatLevel: { $in: ['high', 'critical'] } });
  
  // Recent activity (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentJobs = await JobListing.countDocuments({ 
    createdAt: { $gte: thirtyDaysAgo } 
  });
  const recentReports = await ScamReport.countDocuments({ 
    createdAt: { $gte: thirtyDaysAgo } 
  });
  const recentActivities = await SuspiciousActivity.countDocuments({ 
    createdAt: { $gte: thirtyDaysAgo } 
  });
  
  // Top scam categories
  const topScamCategories = await ScamReport.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);
  
  // Platform growth trend
  const growthTrend = await User.aggregate([
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);
  
  res.status(200).json({
    success: true,
    data: {
      platformStats: {
        totalUsers,
        totalJobs,
        totalReports,
        totalActivities
      },
      jobStats: {
        activeJobs,
        scamJobs,
        flaggedJobs,
        scamRate: totalJobs > 0 ? (scamJobs / totalJobs) * 100 : 0
      },
      reportStats: {
        pendingReports,
        verifiedReports,
        resolvedReports,
        verificationRate: totalReports > 0 ? (verifiedReports / totalReports) * 100 : 0
      },
      activityStats: {
        suspiciousActivities,
        highRiskActivities,
        suspiciousRate: totalActivities > 0 ? (suspiciousActivities / totalActivities) * 100 : 0
      },
      recentActivity: {
        recentJobs,
        recentReports,
        recentActivities
      },
      topScamCategories,
      growthTrend
    }
  });
});

// @desc      Get detailed scam reports
// @route     GET /api/reports/scams
// @access    Private
exports.getScamReports = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 25, status, category, severity, startDate, endDate } = req.query;

  // Build query object
  const query = {};

  if (status) {
    query.status = status;
  }

  if (category) {
    query.category = category;
  }

  if (severity) {
    query.severity = severity;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Pagination
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const total = await ScamReport.countDocuments(query);

  // Execute query with pagination
  const reports = await ScamReport.find(query)
    .populate([
      { path: 'reporter', select: 'username firstName lastName' },
      { path: 'jobListing', select: 'title company' }
    ])
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
    count: reports.length,
    pagination,
    data: reports
  });
});

// @desc      Get scam detection performance
// @route     GET /api/reports/performance
// @access    Private
exports.getPerformanceAnalytics = asyncHandler(async (req, res, next) => {
  // Get model performance data
  const modelPerformances = await ModelPerformance.find({})
    .sort({ createdAt: -1 })
    .limit(10);

  // Get job listing analytics
  const jobAnalytics = await JobListing.aggregate([
    {
      $group: {
        _id: null,
        totalViews: { $sum: '$analytics.views' },
        totalApplications: { $sum: '$analytics.applications' },
        totalShares: { $sum: '$analytics.shares' },
        totalSaves: { $sum: '$analytics.saves' },
        avgScamProbability: { $avg: '$scamProbability' },
        totalReportCount: { $sum: '$analytics.reportCount' }
      }
    }
  ]);

  // Get scam report analytics
  const reportAnalytics = await ScamReport.aggregate([
    {
      $group: {
        _id: null,
        totalReports: { $sum: 1 },
        verifiedReports: { $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] } },
        resolvedReports: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        avgResolutionTime: { $avg: { $subtract: ['$closedAt', '$createdAt'] } }
      }
    }
  ]);

  // Analytics by time period
  const weeklyAnalytics = await JobListing.aggregate([
    {
      $group: {
        _id: {
          week: { $week: "$createdAt" },
          year: { $year: "$createdAt" }
        },
        jobCount: { $sum: 1 },
        scamCount: { $sum: { $cond: [{ $eq: ['$scamDetection.isScam', true] }, 1, 0] } },
        avgScamProbability: { $avg: '$scamProbability' }
      }
    },
    { $sort: { '_id.year': -1, '_id.week': -1 } },
    { $limit: 12 }
  ]);

  res.status(200).json({
    success: true,
    data: {
      modelPerformances,
      jobAnalytics: jobAnalytics[0] || {},
      reportAnalytics: reportAnalytics[0] || {},
      weeklyAnalytics
    }
  });
});

// @desc      Get user activity report
// @route     GET /api/reports/users
// @access    Private
exports.getUserActivityReport = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 25, role, isActive, startDate, endDate } = req.query;

  // Build query object
  const query = {};

  if (role) {
    query.role = role;
  }

  if (typeof isActive !== 'undefined') {
    query.isActive = isActive === 'true';
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Pagination
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const total = await User.countDocuments(query);

  // Execute query with pagination
  const users = await User.find(query)
    .select('-password')
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
    count: users.length,
    pagination,
    data: users
  });
});

// @desc      Get suspicious activity report
// @route     GET /api/reports/activities
// @access    Private
exports.getSuspiciousActivityReport = asyncHandler(async (req, res, next) => {
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

// @desc      Get comprehensive platform report
// @route     GET /api/reports/comprehensive
// @access    Private/Admin
exports.getComprehensiveReport = asyncHandler(async (req, res, next) => {
  // Only allow admins to access comprehensive reports
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse('Only administrators can access comprehensive reports', 403)
    );
  }

  // Gather all platform data
  const platformData = await Promise.all([
    User.countDocuments(),
    JobListing.countDocuments(),
    ScamReport.countDocuments(),
    SuspiciousActivity.countDocuments(),
    ModelPerformance.countDocuments()
  ]);

  const [totalUsers, totalJobs, totalReports, totalActivities, totalModels] = platformData;

  // Get user growth
  const userGrowth = await User.aggregate([
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Get job status distribution
  const jobStatusDistribution = await JobListing.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // Get report status distribution
  const reportStatusDistribution = await ScamReport.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // Get activity platform distribution
  const activityPlatformDistribution = await SuspiciousActivity.aggregate([
    { $group: { _id: '$platform', count: { $sum: 1 } } }
  ]);

  // Get scam category distribution
  const scamCategoryDistribution = await ScamReport.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  // Get top flagged keywords from job listings
  const topFlaggedKeywords = await JobListing.aggregate([
    { $unwind: '$scamReasons' },
    { $group: { _id: '$scamReasons', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  // Calculate platform health metrics
  const platformHealth = {
    userEngagement: totalJobs > 0 ? (totalReports + totalActivities) / totalJobs : 0,
    scamDetectionRate: totalJobs > 0 ? (await JobListing.countDocuments({ 'scamDetection.isScam': true })) / totalJobs : 0,
    reportResolutionRate: totalReports > 0 ? (await ScamReport.countDocuments({ status: 'resolved' })) / totalReports : 0,
    moderationEfficiency: totalReports > 0 ? (await ScamReport.countDocuments({ isVerified: true })) / totalReports : 0
  };

  res.status(200).json({
    success: true,
    data: {
      summary: {
        totalUsers,
        totalJobs,
        totalReports,
        totalActivities,
        totalModels
      },
      userGrowth,
      jobStatusDistribution,
      reportStatusDistribution,
      activityPlatformDistribution,
      scamCategoryDistribution,
      topFlaggedKeywords,
      platformHealth,
      generatedAt: new Date()
    }
  });
});

// @desc      Export report data
// @route     GET /api/reports/export/:type
// @access    Private/Admin
exports.exportReport = asyncHandler(async (req, res, next) => {
  // Only allow admins to export reports
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse('Only administrators can export reports', 403)
    );
  }

  const { type } = req.params;
  const { format = 'json', startDate, endDate } = req.query;

  let data;
  let filename;

  switch (type.toLowerCase()) {
    case 'users':
      data = await User.find({});
      filename = `users-report-${new Date().toISOString().split('T')[0]}.${format}`;
      break;
    case 'jobs':
      data = await JobListing.find({});
      filename = `jobs-report-${new Date().toISOString().split('T')[0]}.${format}`;
      break;
    case 'reports':
      data = await ScamReport.find({});
      filename = `scam-reports-${new Date().toISOString().split('T')[0]}.${format}`;
      break;
    case 'activities':
      data = await SuspiciousActivity.find({});
      filename = `suspicious-activities-${new Date().toISOString().split('T')[0]}.${format}`;
      break;
    default:
      return next(
        new ErrorResponse('Invalid report type', 400)
      );
  }

  // Set appropriate headers for download
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

  res.status(200).json({
    success: true,
    data
  });
});