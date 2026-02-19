const mongoose = require('mongoose');

const scamReportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobListing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobListing'
  },
  suspiciousActivity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuspiciousActivity'
  },
  reportType: {
    type: String,
    enum: ['job_scam', 'social_media_crime', 'fraud', 'phishing', 'identity_theft', 'financial_scam'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'fake_job_listing', 'salary_misrepresentation', 'company_impersonation', 
      'identity_theft', 'financial_fraud', 'work_from_home_scam',
      'pyramid_scheme', 'advance_fee_fraud', 'recruitment_fraud',
      'harassment', 'bullying', 'impersonation', 'misinformation',
      'copyright_violation', 'spam', 'other'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 5000
  },
  evidence: [{
    type: String // URLs to evidence (screenshots, links, etc.)
  }],
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'verified', 'dismissed', 'resolved'],
    default: 'pending'
  },
  resolution: {
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolutionDate: {
      type: Date
    },
    resolutionNotes: {
      type: String
    },
    actionTaken: {
      type: String,
      enum: ['warning_issued', 'listing_removed', 'account_suspended', 'reported_to_authorities', 'no_action']
    }
  },
  aiAnalysis: {
    isScam: {
      type: Boolean,
      default: null
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    detectedScamTypes: [{
      type: String
    }],
    flaggedKeywords: [{
      type: String
    }],
    analysisDetails: {
      type: Map,
      of: Object
    }
  },
  sources: [{
    type: {
      type: String,
      enum: ['user_report', 'automated_detection', 'social_media_monitoring', 'external_api']
    },
    url: String,
    metadata: {
      type: Map,
      of: Object
    }
  }],
  relatedReports: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScamReport'
  }],
  tags: [{
    type: String,
    trim: true
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: {
    type: Date
  },
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  responseRequired: {
    type: Boolean,
    default: true
  },
  responseDueDate: {
    type: Date
  },
  closed: {
    type: Boolean,
    default: false
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  closedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for status filtering
scamReportSchema.index({ status: 1 });

// Index for type filtering
scamReportSchema.index({ reportType: 1 });

// Index for category filtering
scamReportSchema.index({ category: 1 });

// Index for severity sorting
scamReportSchema.index({ severity: 1 });

// Index for priority sorting
scamReportSchema.index({ priority: -1 });

// Index for AI analysis
scamReportSchema.index({ 'aiAnalysis.isScam': 1 });

module.exports = mongoose.model('ScamReport', scamReportSchema);