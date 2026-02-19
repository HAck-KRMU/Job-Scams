const User = require('../models/User');
const JobListing = require('../models/JobListing');
const ScamReport = require('../models/ScamReport');
const SuspiciousActivity = require('../models/SuspiciousActivity');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc      Get all users
// @route     GET /api/users
// @access    Private/Admin
exports.getUsers = asyncHandler(async (req, res, next) => {
  // Only allow admins to get all users
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse('Only administrators can access all users', 403)
    );
  }

  const { page = 1, limit = 25, role, isActive, search } = req.query;

  // Build query object
  const query = {};

  if (role) {
    query.role = role;
  }

  if (typeof isActive !== 'undefined') {
    query.isActive = isActive === 'true';
  }

  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } }
    ];
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

// @desc      Get user by ID
// @route     GET /api/users/:id
// @access    Private
exports.getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  // Only allow admin, moderator, or the user themselves to view details
  if (req.user.role !== 'admin' && 
      req.user.role !== 'moderator' && 
      req.user.id !== req.params.id) {
    return next(
      new ErrorResponse('Not authorized to access this user', 403)
    );
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc      Update user
// @route     PUT /api/users/:id
// @access    Private
exports.updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  // Only allow admin, moderator, or the user themselves to update
  if (req.user.role !== 'admin' && 
      req.user.role !== 'moderator' && 
      req.user.id !== req.params.id) {
    return next(
      new ErrorResponse('Not authorized to update this user', 403)
    );
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id, 
    req.body, 
    {
      new: true,
      runValidators: true
    }
  ).select('-password');

  res.status(200).json({
    success: true,
    data: updatedUser
  });
});

// @desc      Delete user
// @route     DELETE /api/users/:id
// @access    Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  // Only allow admins to delete users
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse('Only administrators can delete users', 403)
    );
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  // Deactivate user instead of hard delete
  user.isActive = false;
  await user.save();

  res.status(200).json({
    success: true,
    data: { message: 'User deactivated successfully' }
  });
});

// @desc      Get user's profile
// @route     GET /api/users/profile
// @access    Private
exports.getProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('-password');

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc      Update user's profile
// @route     PUT /api/users/profile
// @access    Private
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const allowedUpdates = ['firstName', 'lastName', 'email', 'bio', 'location', 'socialMediaAccounts'];
  const updates = {};

  // Only allow specific fields to be updated
  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const user = await User.findByIdAndUpdate(
    req.user.id,
    updates,
    {
      new: true,
      runValidators: true
    }
  ).select('-password');

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc      Get user's reported jobs
// @route     GET /api/users/my-reported-jobs
// @access    Private
exports.getMyReportedJobs = asyncHandler(async (req, res, next) => {
  const jobs = await JobListing.find({
    _id: { $in: req.user.reportedJobs }
  });

  res.status(200).json({
    success: true,
    count: jobs.length,
    data: jobs
  });
});

// @desc      Get user's scam reports
// @route     GET /api/users/my-scams
// @access    Private
exports.getMyScamReports = asyncHandler(async (req, res, next) => {
  const reports = await ScamReport.find({ reporter: req.user.id })
    .populate([
      { path: 'jobListing', select: 'title company' },
      { path: 'suspiciousActivity', select: 'title content' }
    ]);

  res.status(200).json({
    success: true,
    count: reports.length,
    data: reports
  });
});

// @desc      Get user's suspicious activities
// @route     GET /api/users/my-activities
// @access    Private
exports.getMyActivities = asyncHandler(async (req, res, next) => {
  const activities = await SuspiciousActivity.find({ 
    involvedUsers: req.user.id 
  });

  res.status(200).json({
    success: true,
    count: activities.length,
    data: activities
  });
});

// @desc      Change user role
// @route     PUT /api/users/:id/role
// @access    Private/Admin
exports.changeRole = asyncHandler(async (req, res, next) => {
  // Only allow admins to change roles
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse('Only administrators can change user roles', 403)
    );
  }

  const { role } = req.body;

  if (!['user', 'moderator', 'admin'].includes(role)) {
    return next(
      new ErrorResponse('Invalid role specified', 400)
    );
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  // Don't allow changing own role to prevent admin lockout
  if (req.params.id === req.user.id) {
    return next(
      new ErrorResponse('Cannot change your own role', 400)
    );
  }

  user.role = role;
  await user.save();

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});