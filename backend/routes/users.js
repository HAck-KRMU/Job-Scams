const express = require('express');
const router = express.Router();
const { 
  getUsers, 
  getUserById, 
  updateUser, 
  deleteUser, 
  getProfile, 
  updateProfile,
  getMyReportedJobs,
  getMyScamReports,
  getMyActivities,
  changeRole
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// Routes that require authentication
router.use(protect);

// User profile routes
router.route('/profile')
  .get(getProfile)
  .put(updateProfile);

// User's related data routes
router.route('/my-reported-jobs')
  .get(getMyReportedJobs);

router.route('/my-scams')
  .get(getMyScamReports);

router.route('/my-activities')
  .get(getMyActivities);

// Admin and moderator routes
router.route('/')
  .get(authorize('admin'), getUsers);

router.route('/:id')
  .get(getUserById)
  .put(updateUser)
  .delete(authorize('admin'), deleteUser);

router.route('/:id/role')
  .put(authorize('admin'), changeRole);

module.exports = router;