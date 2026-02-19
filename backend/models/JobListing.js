const mongoose = require('mongoose');

const jobListingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  company: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    website: {
      type: String,
      trim: true
    },
    logo: {
      type: String // Cloudinary URL
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  description: {
    type: String,
    required: true,
    maxlength: 5000
  },
  requirements: [{
    type: String,
    maxlength: 500
  }],
  responsibilities: [{
    type: String,
    maxlength: 1000
  }],
  salary: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'USD',
      uppercase: true
    },
    negotiable: {
      type: Boolean,
      default: false
    }
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  employmentType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'temporary', 'remote', 'hybrid'],
    required: true
  },
  experienceLevel: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'executive']
  },
  industry: {
    type: String,
    trim: true
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  postedDate: {
    type: Date,
    default: Date.now
  },
  expirationDate: {
    type: Date
  },
  contactInfo: {
    email: String,
    phone: String,
    website: String,
    address: String
  },
  applicationUrl: {
    type: String,
    trim: true
  },
  applicationEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  isRemote: {
    type: Boolean,
    default: false
  },
  benefits: [{
    type: String,
    trim: true
  }],
  views: {
    type: Number,
    default: 0
  },
  applications: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appliedDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'accepted', 'rejected'],
      default: 'pending'
    }
  }],
  flagged: {
    type: Boolean,
    default: false
  },
  flaggedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      trim: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  scamProbability: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  scamReasons: [{
    type: String
  }],
  scamDetection: {
    isScam: {
      type: Boolean,
      default: false
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    detectedBy: {
      type: String,
      enum: ['ml_model', 'user_report', 'admin_review', 'rule_engine']
    },
    detectionDate: {
      type: Date
    },
    details: {
      type: Map,
      of: Object
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'scam', 'expired'],
    default: 'active'
  },
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    applications: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    saves: {
      type: Number,
      default: 0
    },
    reportCount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Index for search functionality
jobListingSchema.index({ 
  title: 'text', 
  description: 'text', 
  company: 'text',
  location: 'text',
  tags: 'text'
});

// Index for location-based searches
jobListingSchema.index({ location: 1 });

// Index for company name searches
jobListingSchema.index({ 'company.name': 1 });

// Index for employment type filtering
jobListingSchema.index({ employmentType: 1 });

// Index for scam detection
jobListingSchema.index({ 'scamDetection.isScam': 1 });
jobListingSchema.index({ scamProbability: -1 });

module.exports = mongoose.model('JobListing', jobListingSchema);