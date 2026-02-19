const axios = require('axios');
const natural = require('natural');
const Sentiment = require('sentiment');
const stopword = require('stopword');
const SuspiciousActivity = require('../models/SuspiciousActivity');
const ScamReport = require('../models/ScamReport');
const User = require('../models/User');
const scamDetectionService = require('./ml/scamDetectionService');

class SocialMediaMonitoringService {
  constructor() {
    this.sentiment = new Sentiment();
    this.socialMediaPlatforms = ['twitter', 'facebook', 'instagram', 'linkedin', 'tiktok', 'youtube', 'reddit'];
    this.suspiciousKeywords = [
      // Job scam keywords
      'work from home', 'earn money online', 'make money from home', 'easy money',
      'quick cash', 'no experience needed', 'urgent hiring', 'international job',
      'visa processing', 'flight tickets paid', 'work abroad', 'remote job',
      
      // Financial scam keywords
      'investment opportunity', 'guaranteed returns', 'high profit', 'no risk',
      'get rich quick', 'money making', 'passive income', 'side hustle',
      
      // Phishing/social engineering keywords
      'click here', 'limited time', 'act now', 'urgent', 'winner', 'congratulations',
      'free money', 'prize', 'lottery', 'inheritance', 'claim now',
      
      // Fraudulent schemes
      'pyramid scheme', 'multi-level marketing', 'referral program', 'affiliate',
      'binary options', 'crypto investment', 'bitcoin mining', 'forex trading'
    ];
    
    this.suspiciousPatterns = [
      /(?:\$|€|£|¥|Rs\.?)\s*\d+(?:\.\d+)?\s*(?:fee|charge|cost|investment)/gi,
      /(?:paypal|bitcoin|cryptocurrency|western union|moneygram)/gi,
      /(?:work from home|work remotely|home based|online work)/gi,
      /(?:no experience|no skills|anyone can apply|beginners welcome)/gi,
      /(?:urgent|immediate|now|hurry|today|deadline|last day)/gi,
      /(?:sign up fee|training fee|certification fee|processing fee)/gi,
      /(?:visa|flight|travel expenses covered)/gi,
      /(?:guarantee|guaranteed|risk free|no risk)/gi
    ];
    
    this.socialMediaAPIs = {
      twitter: {
        baseUrl: 'https://api.twitter.com/2',
        bearerToken: process.env.TWITTER_BEARER_TOKEN
      },
      facebook: {
        baseUrl: 'https://graph.facebook.com/v18.0',
        accessToken: process.env.FACEBOOK_ACCESS_TOKEN
      },
      instagram: {
        baseUrl: 'https://graph.instagram.com/v18.0',
        accessToken: process.env.INSTAGRAM_ACCESS_TOKEN
      },
      linkedin: {
        baseUrl: 'https://api.linkedin.com/v2',
        accessToken: process.env.LINKEDIN_ACCESS_TOKEN
      }
    };
  }

  /**
   * Monitor social media platforms for suspicious activities
   */
  async monitorSocialMedia(options = {}) {
    const { platforms = this.socialMediaPlatforms, keywords = [], dateRange } = options;
    
    const results = [];
    
    for (const platform of platforms) {
      try {
        const platformResults = await this.monitorPlatform(platform, { 
          keywords: [...this.suspiciousKeywords, ...keywords], 
          dateRange 
        });
        results.push(...platformResults);
      } catch (error) {
        console.error(`Error monitoring ${platform}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Monitor a specific social media platform
   */
  async monitorPlatform(platform, options = {}) {
    const { keywords = [], dateRange } = options;
    
    let posts = [];
    
    switch (platform.toLowerCase()) {
      case 'twitter':
        posts = await this.fetchTwitterPosts(keywords, dateRange);
        break;
      case 'facebook':
        posts = await this.fetchFacebookPosts(keywords, dateRange);
        break;
      case 'instagram':
        posts = await this.fetchInstagramPosts(keywords, dateRange);
        break;
      case 'linkedin':
        posts = await this.fetchLinkedInPosts(keywords, dateRange);
        break;
      case 'tiktok':
        posts = await this.fetchTikTokPosts(keywords, dateRange);
        break;
      case 'reddit':
        posts = await this.fetchRedditPosts(keywords, dateRange);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
    
    // Filter and analyze posts
    const suspiciousActivities = [];
    
    for (const post of posts) {
      const analysis = await this.analyzeSocialMediaContent(post, platform);
      
      if (analysis.isSuspicious) {
        const suspiciousActivity = await this.createSuspiciousActivityRecord(post, platform, analysis);
        suspiciousActivities.push(suspiciousActivity);
      }
    }
    
    return suspiciousActivities;
  }

  /**
   * Analyze social media content for suspicious activity
   */
  async analyzeSocialMediaContent(content, platform) {
    const { 
      text = '', 
      author = {}, 
      url = '', 
      engagement = {},
      timestamp = new Date()
    } = content;

    const fullText = text.toLowerCase();
    
    const analysis = {
      isSuspicious: false,
      confidence: 0,
      detectedScamTypes: [],
      flaggedKeywords: [],
      flaggedPatterns: [],
      sentiment: null,
      entities: {
        persons: [],
        organizations: [],
        locations: [],
        dates: []
      },
      riskLevel: 'low'
    };

    // Check for suspicious keywords
    const foundKeywords = [];
    this.suspiciousKeywords.forEach(keyword => {
      if (fullText.includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword);
      }
    });
    analysis.flaggedKeywords = [...new Set(foundKeywords)];

    // Check for suspicious patterns
    const foundPatterns = [];
    this.suspiciousPatterns.forEach(pattern => {
      const matches = fullText.match(pattern);
      if (matches) {
        foundPatterns.push(...matches);
      }
    });
    analysis.flaggedPatterns = [...new Set(foundPatterns)];

    // Sentiment analysis
    const sentimentScore = this.sentiment.analyze(fullText);
    analysis.sentiment = {
      score: sentimentScore.score,
      comparative: sentimentScore.comparative,
      positive: sentimentScore.positive,
      negative: sentimentScore.negative
    };

    // Calculate risk score
    let riskScore = 0;
    
    // Keyword-based risk
    if (analysis.flaggedKeywords.length > 0) {
      riskScore += Math.min(analysis.flaggedKeywords.length * 0.1, 0.5);
    }
    
    // Pattern-based risk
    if (analysis.flaggedPatterns.length > 0) {
      riskScore += Math.min(analysis.flaggedPatterns.length * 0.15, 0.5);
    }
    
    // Engagement-based risk (suspicious if unusually high engagement for a small account)
    if (engagement && engagement.followers && engagement.likes) {
      const engagementRatio = engagement.likes / engagement.followers;
      if (engagementRatio > 0.5) { // More than 50% of followers liked
        riskScore += 0.2;
      }
    }
    
    // Sentiment-based risk (extremely positive sentiment can be suspicious)
    if (sentimentScore.comparative > 0.8) {
      riskScore += 0.15;
    }
    
    // Cap risk score at 1
    riskScore = Math.min(riskScore, 1);
    
    analysis.confidence = riskScore;
    
    // Determine risk level
    if (riskScore < 0.3) {
      analysis.riskLevel = 'low';
    } else if (riskScore < 0.6) {
      analysis.riskLevel = 'medium';
    } else if (riskScore < 0.8) {
      analysis.riskLevel = 'high';
    } else {
      analysis.riskLevel = 'critical';
    }
    
    analysis.isSuspicious = riskScore > 0.4; // Threshold for suspicion
    
    // Determine scam types based on keywords
    if (analysis.flaggedKeywords.some(kw => 
      ['work from home', 'earn money online', 'make money from home'].includes(kw)
    )) {
      analysis.detectedScamTypes.push('work_from_home_scam');
    }
    
    if (analysis.flaggedKeywords.some(kw => 
      ['investment', 'guaranteed returns', 'high profit', 'no risk'].includes(kw)
    )) {
      analysis.detectedScamTypes.push('investment_fraud');
    }
    
    if (analysis.flaggedKeywords.some(kw => 
      ['pyramid scheme', 'multi-level marketing', 'referral program'].includes(kw)
    )) {
      analysis.detectedScamTypes.push('pyramid_scheme');
    }
    
    return analysis;
  }

  /**
   * Create a suspicious activity record in the database
   */
  async createSuspiciousActivityRecord(content, platform, analysis) {
    const {
      text = '',
      author = {},
      url = '',
      engagement = {},
      timestamp = new Date()
    } = content;

    const suspiciousActivity = await SuspiciousActivity.create({
      activityType: 'social_media_post',
      platform,
      source: platform,
      sourceUrl: url,
      title: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      content: text,
      author: {
        name: author.name || author.username,
        username: author.username,
        profileUrl: author.profileUrl
      },
      detectedScamTypes: analysis.detectedScamTypes,
      flaggedKeywords: analysis.flaggedKeywords,
      flaggedPatterns: analysis.flaggedPatterns,
      threatLevel: analysis.riskLevel,
      confidenceScore: analysis.confidence,
      detectionMethod: 'ml_model',
      aiAnalysis: {
        isScam: analysis.isSuspicious,
        confidence: analysis.confidence,
        detectedScamTypes: analysis.detectedScamTypes,
        flaggedKeywords: analysis.flaggedKeywords,
        sentiment: analysis.sentiment
      },
      socialMediaAnalysis: {
        engagementMetrics: engagement,
        sentiment: analysis.sentiment,
        viralPotential: {
          score: engagement.shares ? engagement.shares / 100 : 0,
          riskLevel: engagement.shares > 1000 ? 'high' : 'medium'
        }
      },
      status: 'new',
      priority: analysis.riskLevel === 'critical' ? 5 : 
                analysis.riskLevel === 'high' ? 4 : 
                analysis.riskLevel === 'medium' ? 3 : 2
    });

    return suspiciousActivity;
  }

  /**
   * Fetch posts from Twitter API
   */
  async fetchTwitterPosts(keywords, dateRange) {
    if (!this.socialMediaAPIs.twitter.bearerToken) {
      console.warn('Twitter API token not configured, skipping Twitter monitoring');
      return [];
    }

    // Simulate fetching tweets (in a real implementation, this would call the Twitter API)
    // For now, return mock data
    return [
      {
        text: "Work from home making $5000 per week! No experience needed. DM for details!",
        author: {
          name: "Job Opportunities",
          username: "@jobopportunities123",
          profileUrl: "https://twitter.com/jobopportunities123"
        },
        url: "https://twitter.com/jobopportunities123/status/123456789",
        engagement: {
          likes: 250,
          retweets: 120,
          replies: 45,
          followers: 1200
        },
        timestamp: new Date()
      },
      {
        text: "Earn money online! Click the link in bio to join our program. Limited spots available!",
        author: {
          name: "Make Money Now",
          username: "@makemoneynow",
          profileUrl: "https://twitter.com/makemoneynow"
        },
        url: "https://twitter.com/makemoneynow/status/987654321",
        engagement: {
          likes: 500,
          retweets: 300,
          replies: 80,
          followers: 800
        },
        timestamp: new Date()
      }
    ];
  }

  /**
   * Fetch posts from Facebook API
   */
  async fetchFacebookPosts(keywords, dateRange) {
    if (!this.socialMediaAPIs.facebook.accessToken) {
      console.warn('Facebook API token not configured, skipping Facebook monitoring');
      return [];
    }

    // Simulate fetching Facebook posts (in a real implementation, this would call the Facebook API)
    return [
      {
        text: "Urgent hiring! International positions available. Pay processing fee of $150 for visa. Act now!",
        author: {
          name: "Global Jobs Inc",
          username: "globaljobsinc",
          profileUrl: "https://facebook.com/globaljobsinc"
        },
        url: "https://facebook.com/globaljobsinc/posts/123456789",
        engagement: {
          likes: 89,
          shares: 45,
          comments: 23,
          followers: 5000
        },
        timestamp: new Date()
      }
    ];
  }

  /**
   * Fetch posts from Instagram API
   */
  async fetchInstagramPosts(keywords, dateRange) {
    if (!this.socialMediaAPIs.instagram.accessToken) {
      console.warn('Instagram API token not configured, skipping Instagram monitoring');
      return [];
    }

    // Simulate fetching Instagram posts (in a real implementation, this would call the Instagram API)
    return [
      {
        text: "Make money from home! No skills required! Transfer payment only! #workfromhome #makemoney",
        author: {
          name: "Home Business Pro",
          username: "homebusinesspro",
          profileUrl: "https://instagram.com/homebusinesspro"
        },
        url: "https://instagram.com/p/ABCD1234567",
        engagement: {
          likes: 1200,
          shares: 89,
          comments: 67,
          followers: 15000
        },
        timestamp: new Date()
      }
    ];
  }

  /**
   * Fetch posts from LinkedIn API
   */
  async fetchLinkedInPosts(keywords, dateRange) {
    if (!this.socialMediaAPIs.linkedin.accessToken) {
      console.warn('LinkedIn API token not configured, skipping LinkedIn monitoring');
      return [];
    }

    // Simulate fetching LinkedIn posts (in a real implementation, this would call the LinkedIn API)
    return [
      {
        text: "Investment opportunity! Guaranteed returns of 20% monthly. No risk involved. Contact for details.",
        author: {
          name: "Investment Advisor",
          username: "investmentadvisor",
          profileUrl: "https://linkedin.com/in/investmentadvisor"
        },
        url: "https://linkedin.com/feed/update/urn:li:activity:123456789",
        engagement: {
          likes: 45,
          comments: 12,
          reposts: 8,
          followers: 1200
        },
        timestamp: new Date()
      }
    ];
  }

  /**
   * Fetch posts from TikTok API
   */
  async fetchTikTokPosts(keywords, dateRange) {
    // Simulate fetching TikTok posts
    return [
      {
        text: "Easy money hack! Work from home and make $1000s weekly! No experience needed! Link in bio!",
        author: {
          name: "Money Hacks",
          username: "@moneyhacks",
          profileUrl: "https://tiktok.com/@moneyhacks"
        },
        url: "https://tiktok.com/@moneyhacks/video/123456789",
        engagement: {
          likes: 50000,
          shares: 2500,
          comments: 1200,
          followers: 100000
        },
        timestamp: new Date()
      }
    ];
  }

  /**
   * Fetch posts from Reddit API
   */
  async fetchRedditPosts(keywords, dateRange) {
    // Simulate fetching Reddit posts
    return [
      {
        text: "Got scammed by this 'work from home' job. They asked for a $200 processing fee. Beware!",
        author: {
          name: "JobSeeker2023",
          username: "JobSeeker2023",
          profileUrl: "https://reddit.com/user/JobSeeker2023"
        },
        url: "https://reddit.com/r/Jobs/comments/xyz123",
        engagement: {
          upvotes: 120,
          downvotes: 5,
          comments: 25,
          subscribers: 50000
        },
        timestamp: new Date()
      }
    ];
  }

  /**
   * Monitor for specific user accounts
   */
  async monitorUserAccounts(usernames, platform) {
    if (!Array.isArray(usernames)) {
      usernames = [usernames];
    }

    const monitoredActivities = [];
    
    for (const username of usernames) {
      try {
        const userPosts = await this.fetchUserPosts(username, platform);
        
        for (const post of userPosts) {
          const analysis = await this.analyzeSocialMediaContent(post, platform);
          
          if (analysis.isSuspicious) {
            const suspiciousActivity = await this.createSuspiciousActivityRecord(post, platform, analysis);
            monitoredActivities.push(suspiciousActivity);
          }
        }
      } catch (error) {
        console.error(`Error monitoring user ${username} on ${platform}:`, error);
      }
    }
    
    return monitoredActivities;
  }

  /**
   * Fetch posts from a specific user
   */
  async fetchUserPosts(username, platform) {
    // This would implement fetching posts from a specific user on the given platform
    // For now, return mock data
    return [
      {
        text: `New post from ${username} about earning money online`,
        author: { name: username, username },
        url: `https://${platform}.com/${username}/posts/123`,
        engagement: { likes: 100, shares: 20, followers: 1000 },
        timestamp: new Date()
      }
    ];
  }

  /**
   * Get trending suspicious topics
   */
  async getTrendingSuspiciousTopics(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await SuspiciousActivity.find({
      createdAt: { $gte: startDate },
      isSuspicious: true
    }).select('flaggedKeywords detectedScamTypes threatLevel');

    // Aggregate trending keywords
    const keywordCounts = {};
    const scamTypeCounts = {};

    activities.forEach(activity => {
      activity.flaggedKeywords.forEach(keyword => {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      });

      activity.detectedScamTypes.forEach(type => {
        scamTypeCounts[type] = (scamTypeCounts[type] || 0) + 1;
      });
    });

    return {
      trendingKeywords: Object.entries(keywordCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10),
      trendingScamTypes: Object.entries(scamTypeCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10),
      totalActivities: activities.length
    };
  }

  /**
   * Generate alerts for newly detected suspicious activities
   */
  async generateAlerts(options = {}) {
    const { hoursBack = 1, minConfidence = 0.6, threatLevels = ['high', 'critical'] } = options;

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursBack);

    const alerts = await SuspiciousActivity.find({
      createdAt: { $gte: cutoffTime },
      confidenceScore: { $gte: minConfidence },
      threatLevel: { $in: threatLevels }
    }).populate('detectedBy', 'username email');

    return alerts;
  }
}

module.exports = new SocialMediaMonitoringService();