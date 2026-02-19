const express = require('express');
const router = express.Router();
const { getJobs, getJob, createJob, updateJob, deleteJob, applyToJob, flagJob, searchJobs, getMyApplications, getMyJobs } = require('../controllers/jobController');
const { protect, authorize, ownerCheck } = require('../middleware/auth');
const JobListing = require('../models/JobListing');

router.route('/')
  .get(getJobs)
  .post(protect, createJob);

router.route('/my-jobs').get(protect, getMyJobs);
router.route('/my-applications').get(protect, getMyApplications);
router.route('/search').get(searchJobs);

router.route('/:id')
  .get(getJob)
  .put(protect, ownerCheck(JobListing, 'postedBy'), updateJob)
  .delete(protect, ownerCheck(JobListing, 'postedBy'), deleteJob);

router.route('/:id/apply').post(protect, applyToJob);
router.route('/:id/flag').post(protect, flagJob);

module.exports = router;