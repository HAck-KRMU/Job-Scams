const mongoose = require('mongoose');

const suspiciousActivitySchema = new mongoose.Schema({
  activityType: {
    type: String,
    enum: ['job_posting', 'profile_creation', 'application_submission', 'message_sending', 
           'social_media_post', 'account_login', 'data_access', 'report_submission', 'other'],
    required: true
  },
  platform: {
    type: String,
    enum: ['job_board', 'social_media', 'email', 'website', 'mobile_app', 'other'],
    required: true
  },
  source: {
    type: String,
    enum: ['linkedin', 'indeed', 'glassdoor', 'facebook', 'twitter', 'instagram', 'tiktok', 'youtube', 'reddit', 'other'],
    required: true
  },
  sourceUrl: {
    type: String,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  author: {
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    username: {
      type: String,
      trim: true
    },
    profileUrl: {
      type: String,
      trim: true
    },
    ipAddresses: [{
      type: String
    }]
  },
  involvedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  relatedJobListings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobListing'
  }],
  detectedScamTypes: [{
    type: String,
    enum: [
      'fake_job_listing', 'salary_misrepresentation', 'company_impersonation', 
      'identity_theft', 'financial_fraud', 'work_from_home_scam',
      'pyramid_scheme', 'advance_fee_fraud', 'recruitment_fraud',
      'harassment', 'bullying', 'impersonation', 'misinformation',
      'copyright_violation', 'spam', 'phishing', 'other'
    ]
  }],
  flaggedKeywords: [{
    type: String
  }],
  flaggedPatterns: [{
    type: String
  }],
  threatLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  confidenceScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  detectionMethod: {
    type: String,
    enum: ['ml_model', 'rule_engine', 'user_report', 'pattern_matching', 'anomaly_detection', 'combined'],
    required: true
  },
  detectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  aiAnalysis: {
    isScam: {
      type: Boolean,
      default: false
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
    sentiment: {
      score: Number,
      label: String // positive, negative, neutral
    },
    entities: {
      persons: [String],
      organizations: [String],
      locations: [String],
      dates: [String]
    },
    analysisDetails: {
      type: Map,
      of: Object
    }
  },
  socialMediaAnalysis: {
    engagementMetrics: {
      likes: Number,
      shares: Number,
      comments: Number,
      saves: Number
    },
    reachEstimate: Number,
    sentiment: {
      score: Number,
      label: String
    },
    viralPotential: {
      score: Number,
      riskLevel: String
    }
  },
  automatedResponse: {
    triggeredActions: [{
      action: {
        type: String,
        enum: ['flag_content', 'block_user', 'remove_content', 'alert_moderator', 'quarantine', 'analyze_deep']
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      confidence: Number
    }],
    escalationRequired: {
      type: Boolean,
      default: false
    },
    escalationReason: {
      type: String
    }
  },
  moderation: {
    reviewed: {
      type: Boolean,
      default: false
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewDate: {
      type: Date
    },
    reviewNotes: {
      type: String
    },
    finalVerdict: {
      type: String,
      enum: ['benign', 'suspicious', 'scam', 'threat']
    },
    actionTaken: {
      type: String,
      enum: ['none', 'warning_issued', 'content_removed', 'account_suspended', 'reported_to_authorities']
    }
  },
  reports: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScamReport'
  }],
  tags: [{
    type: String,
    trim: true
  }],
  metadata: {
    userAgent: String,
    deviceInfo: String,
    browser: String,
    os: String,
    referrer: String,
    additionalInfo: {
      type: Map,
      of: Object
    }
  },
  status: {
    type: String,
    enum: ['new', 'analyzed', 'reviewed', 'resolved', 'closed'],
    default: 'new'
  },
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  }
}, {
  timestamps: true
});

// Index for activity type
suspiciousActivitySchema.index({ activityType: 1 });

// Index for platform and source
suspiciousActivitySchema.index({ platform: 1, source: 1 });

// Index for threat level
suspiciousActivitySchema.index({ threatLevel: 1 });

// Index for detection method
suspiciousActivitySchema.index({ detectionMethod: 1 });

// Index for status
suspiciousActivitySchema.index({ status: 1 });

// Index for priority
suspiciousActivitySchema.index({ priority: -1 });

// Index for AI analysis
suspiciousActivitySchema.index({ 'aiAnalysis.isScam': 1 });
suspiciousActivitySchema.index({ confidenceScore: -1 });

module.exports = mongoose.model('SuspiciousActivity', suspiciousActivitySchema);