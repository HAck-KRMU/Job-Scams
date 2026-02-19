const JobListing = require('../models/JobListing');
const ScamReport = require('../models/ScamReport');
const User = require('../models/User');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc      Get all job listings
// @route     GET /api/jobs
// @access    Public
exports.getJobs = asyncHandler(async (req, res, next) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await JobListing.countDocuments();

  // Filtering
  const queryObj = { ...req.query };
  const excludedFields = ['page', 'limit', 'sort', 'fields'];
  excludedFields.forEach(param => delete queryObj[param]);

  // Advanced filtering
  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  let query = JobListing.find(JSON.parse(queryStr));

  // Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Selecting fields
  if (req.query.fields) {
    const fields = req.query.fields.split(',').join(' ');
    query = query.select(fields);
  }

  // Execute query with pagination
  const results = await query.skip(startIndex).limit(limit);

  // Pagination result
  const pagination = {};
  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.previous = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: results.length,
    pagination,
    data: results
  });
});

// @desc      Get single job listing
// @route     GET /api/jobs/:id
// @access    Public
exports.getJob = asyncHandler(async (req, res, next) => {
  const job = await JobListing.findById(req.params.id).populate([
    { path: 'postedBy', select: 'username firstName lastName profilePicture' }
  ]);

  if (!job) {
    return next(
      new ErrorResponse(`Job not found with id of ${req.params.id}`, 404)
    );
  }

  // Increment view count
  job.analytics.views += 1;
  await job.save();

  res.status(200).json({
    success: true,
    data: job
  });
});

// @desc      Create new job listing
// @route     POST /api/jobs
// @access    Private
exports.createJob = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.postedBy = req.user.id;

  // Check if user has permission to post jobs
  if (req.user.role !== 'admin' && req.user.role !== 'moderator' && req.user.role !== 'user') {
    return next(
      new ErrorResponse(`User role ${req.user.role} is not authorized to post jobs`, 403)
    );
  }

  const job = await JobListing.create(req.body);

  res.status(201).json({
    success: true,
    data: job
  });
});

// @desc      Update job listing
// @route     PUT /api/jobs/:id
// @access    Private
exports.updateJob = asyncHandler(async (req, res, next) => {
  let job = await JobListing.findById(req.params.id);

  if (!job) {
    return next(
      new ErrorResponse(`Job not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is the job owner or admin/moderator
  if (job.postedBy.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this job`,
        403
      )
    );
  }

  job = await JobListing.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: job
  });
});

// @desc      Delete job listing
// @route     DELETE /api/jobs/:id
// @access    Private
exports.deleteJob = asyncHandler(async (req, res, next) => {
  const job = await JobListing.findById(req.params.id);

  if (!job) {
    return next(
      new ErrorResponse(`Job not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is the job owner or admin/moderator
  if (job.postedBy.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this job`,
        403
      )
    );
  }

  await job.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc      Apply to job
// @route     POST /api/jobs/:id/apply
// @access    Private
exports.applyToJob = asyncHandler(async (req, res, next) => {
  const job = await JobListing.findById(req.params.id);

  if (!job) {
    return next(
      new ErrorResponse(`Job not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user has already applied
  const alreadyApplied = job.applications.some(
    application => application.userId.toString() === req.user.id
  );

  if (alreadyApplied) {
    return next(
      new ErrorResponse(`User ${req.user.id} has already applied to this job`, 400)
    );
  }

  // Add application
  job.applications.push({
    userId: req.user.id,
    appliedDate: Date.now()
  });

  job.analytics.applications += 1;
  await job.save();

  res.status(200).json({
    success: true,
    message: 'Application submitted successfully'
  });
});

// @desc      Flag job as suspicious
// @route     POST /api/jobs/:id/flag
// @access    Private
exports.flagJob = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;
  const job = await JobListing.findById(req.params.id);

  if (!job) {
    return next(
      new ErrorResponse(`Job not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user has already flagged this job
  const alreadyFlagged = job.flaggedBy.some(
    flag => flag.user.toString() === req.user.id
  );

  if (alreadyFlagged) {
    return next(
      new ErrorResponse(`User ${req.user.id} has already flagged this job`, 400)
    );
  }

  // Add flag
  job.flaggedBy.push({
    user: req.user.id,
    reason,
    date: Date.now()
  });

  job.analytics.reportCount += 1;

  // If flagged multiple times, mark as suspicious
  if (job.flaggedBy.length >= 3) {
    job.flagged = true;
  }

  await job.save();

  // Create scam report
  const scamReport = await ScamReport.create({
    reporter: req.user.id,
    jobListing: job._id,
    reportType: 'job_scam',
    category: 'other', // This would be determined by the reason
    title: `Flagged Job: ${job.title}`,
    description: `Job "${job.title}" by ${job.company.name} was flagged by user for: ${reason}`,
    severity: 'medium',
    sources: [{
      type: 'user_report',
      url: `/api/jobs/${job._id}`
    }]
  });

  res.status(200).json({
    success: true,
    message: 'Job flagged successfully',
    data: scamReport
  });
});

// @desc      Search jobs
// @route     GET /api/jobs/search
// @access    Public
exports.searchJobs = asyncHandler(async (req, res, next) => {
  const { keyword, location, salaryMin, salaryMax, employmentType, experienceLevel } = req.query;

  // Build query object
  const query = {};

  if (keyword) {
    query.$text = { $search: keyword };
  }

  if (location) {
    query.location = { $regex: location, $options: 'i' };
  }

  if (employmentType) {
    query.employmentType = employmentType;
  }

  if (experienceLevel) {
    query.experienceLevel = experienceLevel;
  }

  if (salaryMin || salaryMax) {
    query.salary = {};
    if (salaryMin) query.salary.min = { $gte: Number(salaryMin) };
    if (salaryMax) query.salary.max = { $lte: Number(salaryMax) };
  }

  // Execute query
  const jobs = await JobListing.find(query).populate([
    { path: 'postedBy', select: 'username firstName lastName profilePicture' }
  ]).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: jobs.length,
    data: jobs
  });
});

// @desc      Get user's job applications
// @route     GET /api/jobs/my-applications
// @access    Private
exports.getMyApplications = asyncHandler(async (req, res, next) => {
  const jobs = await JobListing.find({
    'applications.userId': req.user.id
  }).populate([
    { path: 'postedBy', select: 'username firstName lastName profilePicture' }
  ]);

  res.status(200).json({
    success: true,
    count: jobs.length,
    data: jobs
  });
});

// @desc      Get user's posted jobs
// @route     GET /api/jobs/my-jobs
// @access    Private
exports.getMyJobs = asyncHandler(async (req, res, next) => {
  const jobs = await JobListing.find({ postedBy: req.user.id });

  res.status(200).json({
    success: true,
    count: jobs.length,
    data: jobs
  });
});