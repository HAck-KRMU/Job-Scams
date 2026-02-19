// MongoDB initialization script for Job Scam Detection Platform

// Create the jobscamdb database and populate with initial data
db = db.getSiblingDB('jobscamdb');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });

db.joblistings.createIndex({ 
  "title": "text", 
  "description": "text", 
  "company.name": "text",
  "location": "text",
  "tags": "text"
});

db.joblistings.createIndex({ "scamDetection.isScam": 1 });
db.joblistings.createIndex({ "scamProbability": -1 });
db.joblistings.createIndex({ "postedBy": 1 });
db.joblistings.createIndex({ "status": 1 });
db.joblistings.createIndex({ "createdAt": -1 });

db.scamreports.createIndex({ "status": 1 });
db.scamreports.createIndex({ "reportType": 1 });
db.scamreports.createIndex({ "category": 1 });
db.scamreports.createIndex({ "severity": 1 });
db.scamreports.createIndex({ "priority": -1 });
db.scamreports.createIndex({ "aiAnalysis.isScam": 1 });

db.suspiciousactivities.createIndex({ "activityType": 1 });
db.suspiciousactivities.createIndex({ "platform": 1 });
db.suspiciousactivities.createIndex({ "source": 1 });
db.suspiciousactivities.createIndex({ "threatLevel": 1 });
db.suspiciousactivities.createIndex({ "status": 1 });
db.suspiciousactivities.createIndex({ "priority": -1 });
db.suspiciousactivities.createIndex({ "aiAnalysis.isScam": 1 });
db.suspiciousactivities.createIndex({ "confidenceScore": -1 });

db.modelperformances.createIndex({ "modelName": 1, "modelVersion": 1 });
db.modelperformances.createIndex({ "modelType": 1 });
db.modelperformances.createIndex({ "status": 1 });
db.modelperformances.createIndex({ "metrics.accuracy": -1 });

// Create default admin user
db.users.insertOne({
  username: "admin",
  email: "admin@jobscamdetect.com",
  password: "$2a$12$J6ZyzXVJ.vFE4lO4pYSGkeE8.UY.XoE.ez.W.XoE.ez.W.XoE.ez.W.", // This is a bcrypt hash for 'admin123'
  firstName: "Admin",
  lastName: "User",
  role: "admin",
  verified: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

print("MongoDB initialization completed for Job Scam Detection Platform");