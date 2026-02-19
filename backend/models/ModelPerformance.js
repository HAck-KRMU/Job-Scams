const mongoose = require('mongoose');

const modelPerformanceSchema = new mongoose.Schema({
  modelName: {
    type: String,
    required: true,
    trim: true
  },
  modelVersion: {
    type: String,
    required: true
  },
  modelType: {
    type: String,
    enum: ['scam_detection', 'sentiment_analysis', 'classification', 'clustering', 'regression', 'nlp', 'computer_vision'],
    required: true
  },
  datasetUsed: {
    type: String,
    required: true
  },
  metrics: {
    accuracy: {
      type: Number,
      min: 0,
      max: 1
    },
    precision: {
      type: Number,
      min: 0,
      max: 1
    },
    recall: {
      type: Number,
      min: 0,
      max: 1
    },
    f1Score: {
      type: Number,
      min: 0,
      max: 1
    },
    auc: {
      type: Number,
      min: 0,
      max: 1
    },
    specificity: {
      type: Number,
      min: 0,
      max: 1
    },
    sensitivity: {
      type: Number,
      min: 0,
      max: 1
    },
    meanAbsoluteError: Number,
    meanSquaredError: Number,
    rootMeanSquaredError: Number,
    confusionMatrix: {
      truePositive: Number,
      trueNegative: Number,
      falsePositive: Number,
      falseNegative: Number
    }
  },
  trainingDataSize: Number,
  validationDataSize: Number,
  testDataSize: Number,
  featureCount: Number,
  hyperparameters: {
    type: Map,
    of: Object
  },
  trainingTime: Number, // in milliseconds
  inferenceTime: Number, // average inference time in milliseconds
  deploymentInfo: {
    deployedAt: Date,
    deployedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    environment: String,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  performanceHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    metrics: {
      accuracy: Number,
      precision: Number,
      recall: Number,
      f1Score: Number
    },
    sampleSize: Number
  }],
  driftDetection: {
    conceptDriftDetected: {
      type: Boolean,
      default: false
    },
    driftMagnitude: Number,
    driftTimestamp: Date,
    driftSeverity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    }
  },
  feedbackMetrics: {
    userFeedbackReceived: Number,
    userFeedbackPositive: Number,
    userFeedbackNegative: Number,
    userAccuracyRating: Number
  },
  resourceUsage: {
    cpuUsage: Number, // percentage
    memoryUsage: Number, // in MB
    gpuUsage: Number, // percentage if applicable
    networkIo: Number // in MB
  },
  status: {
    type: String,
    enum: ['training', 'validation', 'testing', 'deployed', 'deprecated', 'failed'],
    default: 'deployed'
  },
  notes: String
}, {
  timestamps: true
});

// Index for model name and version
modelPerformanceSchema.index({ modelName: 1, modelVersion: 1 });

// Index for model type
modelPerformanceSchema.index({ modelType: 1 });

// Index for status
modelPerformanceSchema.index({ status: 1 });

// Index for accuracy
modelPerformanceSchema.index({ 'metrics.accuracy': -1 });

module.exports = mongoose.model('ModelPerformance', modelPerformanceSchema);