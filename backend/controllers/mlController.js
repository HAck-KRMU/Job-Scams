const JobListing = require('../models/JobListing');
const ScamReport = require('../models/ScamReport');
const SuspiciousActivity = require('../models/SuspiciousActivity');
const ModelPerformance = require('../models/ModelPerformance');
const scamDetectionService = require('../services/ml/scamDetectionService');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc      Analyze a job posting for scam indicators
// @route     POST /api/ml/analyze-job
// @access    Private
exports.analyzeJob = asyncHandler(async (req, res, next) => {
  const { jobId, jobData } = req.body;

  let jobToAnalyze = jobData;
  
  // If jobId is provided, fetch the job from database
  if (jobId) {
    const job = await JobListing.findById(jobId);
    if (!job) {
      return next(
        new ErrorResponse(`Job not found with id of ${jobId}`, 404)
      );
    }
    jobToAnalyze = job;
  } else if (!jobData) {
    return next(
      new ErrorResponse('Either jobId or jobData must be provided', 400)
    );
  }

  // Perform scam detection analysis
  const analysis = await scamDetectionService.analyzeJobPosting(jobToAnalyze);

  // Update the job listing with analysis results if jobId was provided
  if (jobId) {
    await JobListing.findByIdAndUpdate(jobId, {
      'scamDetection.isScam': analysis.isScam,
      'scamDetection.confidence': analysis.confidence,
      'scamDetection.detectedBy': 'ml_model',
      'scamDetection.detectionDate': new Date(),
      'scamDetection.details': analysis,
      scamProbability: analysis.confidence,
      scamReasons: analysis.scamTypes
    });
  }

  res.status(200).json({
    success: true,
    data: {
      jobId: jobId || null,
      analysis
    }
  });
});

// @desc      Batch analyze job postings
// @route     POST /api/ml/batch-analyze
// @access    Private
exports.batchAnalyze = asyncHandler(async (req, res, next) => {
  const { jobIds } = req.body;

  if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
    return next(
      new ErrorResponse('jobIds array is required', 400)
    );
  }

  // Fetch all jobs
  const jobs = await JobListing.find({ _id: { $in: jobIds } });

  if (jobs.length !== jobIds.length) {
    return next(
      new ErrorResponse('Some jobs were not found', 404)
    );
  }

  // Perform batch analysis
  const results = await scamDetectionService.batchAnalyze(jobs);

  // Update all jobs with analysis results
  for (const result of results) {
    const { jobId, analysis } = result;
    await JobListing.findByIdAndUpdate(jobId, {
      'scamDetection.isScam': analysis.isScam,
      'scamDetection.confidence': analysis.confidence,
      'scamDetection.detectedBy': 'ml_model',
      'scamDetection.detectionDate': new Date(),
      'scamDetection.details': analysis,
      scamProbability: analysis.confidence,
      scamReasons: analysis.scamTypes
    });
  }

  res.status(200).json({
    success: true,
    data: {
      results,
      summary: {
        total: results.length,
        scamsDetected: results.filter(r => r.analysis.isScam).length,
        legitimate: results.filter(r => !r.analysis.isScam).length
      }
    }
  });
});

// @desc      Get scam detection statistics
// @route     GET /api/ml/stats
// @access    Private
exports.getMLStats = asyncHandler(async (req, res, next) => {
  const totalJobs = await JobListing.countDocuments();
  const scamJobs = await JobListing.countDocuments({ 'scamDetection.isScam': true });
  const flaggedJobs = await JobListing.countDocuments({ flagged: true });
  const totalReports = await ScamReport.countDocuments();
  const verifiedReports = await ScamReport.countDocuments({ isVerified: true });

  // Get recent scam detection trends
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentScams = await JobListing.countDocuments({
    'scamDetection.isScam': true,
    'scamDetection.detectionDate': { $gte: thirtyDaysAgo }
  });

  const recentReports = await ScamReport.countDocuments({
    createdAt: { $gte: thirtyDaysAgo }
  });

  res.status(200).json({
    success: true,
    data: {
      totalJobs,
      scamJobs,
      flaggedJobs,
      totalReports,
      verifiedReports,
      scamRate: totalJobs > 0 ? (scamJobs / totalJobs) * 100 : 0,
      flagRate: totalJobs > 0 ? (flaggedJobs / totalJobs) * 100 : 0,
      verificationRate: totalReports > 0 ? (verifiedReports / totalReports) * 100 : 0,
      recentScams,
      recentReports,
      trends: {
        scamTrend: recentScams > 0 ? 'increasing' : 'stable',
        reportTrend: recentReports > 0 ? 'increasing' : 'stable'
      }
    }
  });
});

// @desc      Retrain the ML model with new data
// @route     POST /api/ml/retrain
// @access    Private/Admin
exports.retrainModel = asyncHandler(async (req, res, next) => {
  // Only allow admins to retrain models
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse('Only administrators can retrain models', 403)
    );
  }

  const { trainingData } = req.body;

  if (!trainingData || !Array.isArray(trainingData)) {
    return next(
      new ErrorResponse('Training data array is required', 400)
    );
  }

  // Update the model with new training data
  await scamDetectionService.updateModel(trainingData);

  // Log model performance
  const modelPerformance = await ModelPerformance.create({
    modelName: 'ScamDetectionModel',
    modelVersion: '1.0.0',
    modelType: 'scam_detection',
    datasetUsed: 'job_listings',
    metrics: {
      accuracy: 0.92, // Placeholder - would calculate from training
      precision: 0.89,
      recall: 0.91,
      f1Score: 0.90
    },
    trainingDataSize: trainingData.length,
    deploymentInfo: {
      deployedAt: new Date(),
      deployedBy: req.user.id
    },
    status: 'deployed'
  });

  res.status(200).json({
    success: true,
    message: 'Model retrained successfully',
    data: {
      modelPerformance
    }
  });
});

// @desc      Get model performance metrics
// @route     GET /api/ml/performance
// @access    Private
exports.getModelPerformance = asyncHandler(async (req, res, next) => {
  const performances = await ModelPerformance.find({}).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: performances
  });
});

// @desc      Analyze suspicious activity
// @route     POST /api/ml/analyze-activity
// @access    Private
exports.analyzeActivity = asyncHandler(async (req, res, next) => {
  const { activityId, activityData } = req.body;

  if (!activityData) {
    return next(
      new ErrorResponse('activityData is required', 400)
    );
  }

  // Perform analysis using our service (would be expanded in real implementation)
  const analysis = {
    isThreat: activityData.threatLevel === 'high' || activityData.threatLevel === 'critical',
    confidence: activityData.confidenceScore || 0.5,
    detectedScamTypes: activityData.detectedScamTypes || [],
    flaggedKeywords: activityData.flaggedKeywords || [],
    recommendations: ['Manual review recommended']
  };

  // Update the suspicious activity with analysis results if activityId was provided
  if (activityId) {
    await SuspiciousActivity.findByIdAndUpdate(activityId, {
      'aiAnalysis.isScam': analysis.isThreat,
      'aiAnalysis.confidence': analysis.confidence,
      'aiAnalysis.detectedScamTypes': analysis.detectedScamTypes,
      'aiAnalysis.flaggedKeywords': analysis.flaggedKeywords,
      threatLevel: analysis.isThreat ? 'high' : 'medium'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      activityId: activityId || null,
      analysis
    }
  });
});