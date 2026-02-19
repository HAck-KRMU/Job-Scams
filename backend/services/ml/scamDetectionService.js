const natural = require('natural');
const Sentiment = require('sentiment');
const stopword = require('stopword');
const TfIdf = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const BayesClassifier = require('natural').BayesClassifier;

class ScamDetectionService {
  constructor() {
    this.sentiment = new Sentiment();
    this.tfidf = new TfIdf();
    this.bayesClassifier = null;
    this.suspiciousKeywords = [
      // Payment-related suspicious terms
      'money', 'payment', 'fee', 'deposit', 'investment', 'cash', 'wire transfer',
      'paypal', 'bitcoin', 'cryptocurrency', 'bank transfer', 'credit card', 
      'urgent payment', 'immediate payment', 'sign up fee', 'training fee',
      
      // Work-from-home scams
      'work from home', 'remote work', 'earn money from home', 'home based',
      'make money online', 'easy money', 'quick cash', 'no experience needed',
      'work online', 'stay at home', 'extra income', 'side hustle',
      
      // Recruitment fraud
      'international', 'abroad', 'overseas', 'travel expenses', 'visa processing',
      'flight tickets', 'passport', 'background check fee', 'documentation fee',
      'screening fee', 'interview fee', 'processing fee', 'handling fee',
      
      // High pressure tactics
      'limited time', 'act now', 'urgent', 'immediate', 'today only', 'last chance',
      'exclusive opportunity', 'once in lifetime', 'must apply now', 'deadline',
      'hurry', 'rush', 'expedited', 'priority', 'first come first served',
      
      // Vague job descriptions
      'various duties', 'miscellaneous tasks', 'data entry', 'customer service',
      'representative', 'coordinator', 'assistant', 'agent', 'associate',
      'clerk', 'operator', 'specialist', 'manager', 'director',
      
      // Red flag phrases
      'guaranteed', 'risk free', 'no risk', 'huge profits', 'guaranteed income',
      'no loss', 'profit guarantee', 'money back', 'satisfaction guaranteed',
      'free trial', 'no commitment', 'cancel anytime', 'no strings attached'
    ];

    this.suspiciousPatterns = [
      /(?:\$|€|£|¥|Rs\.?)\s*\d+(?:\.\d+)?\s*(?:fee|charge|cost|payment)/gi,
      /(?:paypal|bitcoin|cryptocurrency|western union|moneygram)/gi,
      /(?:work from home|work remotely|home based|online work)/gi,
      /(?:no experience|no skills|anyone can apply|beginners welcome)/gi,
      /(?:urgent|immediate|now|hurry|today|deadline|last day)/gi,
      /(?:sign up fee|training fee|certification fee|processing fee)/gi,
      /(?:visa|flight|travel expenses covered)/gi,
      /(?:guarantee|guaranteed|risk free|no risk)/gi
    ];

    this.initializeBayesClassifier();
  }

  initializeBayesClassifier() {
    // Training data for scam detection
    const trainingData = [
      // Scam examples
      { text: "Work from home making $5000 per week! No experience needed. Sign up fee required.", label: 'scam' },
      { text: "Earn money online! Send $200 to get started. Easy payments. Urgent!", label: 'scam' },
      { text: "International company hiring! Pay processing fee of $150 for visa. Act now!", label: 'scam' },
      { text: "Make money from home! No skills required! Wire transfer payment only!", label: 'scam' },
      { text: "Earn big money fast! Investment required. Risk free guarantee!", label: 'scam' },
      
      // Legitimate examples
      { text: "Software Engineer position. 3+ years experience required. Competitive salary.", label: 'legitimate' },
      { text: "Marketing coordinator needed. Bachelor's degree required. Benefits included.", label: 'legitimate' },
      { text: "Join our team of professionals. Great work environment. Apply today.", label: 'legitimate' },
      { text: "Senior developer role. Experience with React and Node.js. Remote work available.", label: 'legitimate' },
      { text: "Customer service representative. Excellent communication skills needed. Full-time.", label: 'legitimate' }
    ];

    this.bayesClassifier = new BayesClassifier();
    
    // Prepare training data
    trainingData.forEach(item => {
      this.bayesClassifier.addDocument(item.text, item.label);
    });
    
    this.bayesClassifier.train();
  }

  /**
   * Analyze a job posting for scam indicators
   */
  async analyzeJobPosting(jobData) {
    const {
      title = '',
      description = '',
      company = {},
      requirements = [],
      responsibilities = [],
      salary = {},
      contactInfo = {}
    } = jobData;

    const fullText = [
      title,
      description,
      company.name || '',
      ...(requirements || []),
      ...(responsibilities || []),
      contactInfo.email || '',
      contactInfo.phone || '',
      contactInfo.website || ''
    ].join(' ').toLowerCase();

    const analysis = {
      isScam: false,
      confidence: 0,
      scamTypes: [],
      flaggedKeywords: [],
      flaggedPatterns: [],
      riskFactors: [],
      recommendations: []
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

    // Calculate keyword-based risk score
    let keywordRiskScore = 0;
    if (analysis.flaggedKeywords.length > 0) {
      keywordRiskScore = Math.min(analysis.flaggedKeywords.length / 10, 1); // Cap at 1
    }

    // Check for red flag elements
    const redFlags = [];

    // Payment-related red flags
    if (analysis.flaggedKeywords.some(kw => 
      ['fee', 'payment', 'deposit', 'investment'].includes(kw)
    )) {
      redFlags.push('payment_required');
      analysis.scamTypes.push('advance_fee_fraud');
    }

    // Work from home with payment requirement
    if (analysis.flaggedKeywords.includes('work from home') && 
        analysis.flaggedKeywords.some(kw => 
          ['fee', 'payment', 'deposit'].includes(kw)
        )) {
      redFlags.push('work_from_home_payment');
      analysis.scamTypes.push('work_from_home_scam');
    }

    // International work with fees
    if ((analysis.flaggedKeywords.some(kw => 
        ['international', 'abroad', 'overseas', 'visa', 'flight'].includes(kw)
      )) && 
      analysis.flaggedKeywords.some(kw => 
        ['fee', 'payment', 'deposit'].includes(kw)
      )) {
      redFlags.push('international_fee');
      analysis.scamTypes.push('recruitment_fraud');
    }

    // High pressure tactics
    if (analysis.flaggedKeywords.some(kw => 
      ['urgent', 'immediate', 'act now', 'limited time', 'hurry'].includes(kw)
    )) {
      redFlags.push('high_pressure');
    }

    // Vague job descriptions
    if (analysis.flaggedKeywords.some(kw => 
      ['various duties', 'miscellaneous tasks', 'data entry', 'customer service'].includes(kw)
    ) && !analysis.flaggedKeywords.some(kw => 
      ['engineer', 'developer', 'analyst', 'manager', 'specialist'].includes(kw)
    )) {
      redFlags.push('vague_description');
    }

    // Sentiment analysis
    const sentimentScore = this.sentiment.analyze(fullText);
    analysis.sentiment = {
      score: sentimentScore.score,
      comparative: sentimentScore.comparative,
      positive: sentimentScore.positive,
      negative: sentimentScore.negative
    };

    // TF-IDF analysis
    this.tfidf.addDocument(fullText);
    const tfidfScores = [];
    this.suspiciousKeywords.forEach(keyword => {
      const score = this.tfidf.tfidf(keyword, 0);
      if (score > 0) {
        tfidfScores.push({ keyword, score });
      }
    });

    // Bayes classification
    let bayesResult = null;
    try {
      bayesResult = this.bayesClassifier.getClassifications(fullText);
    } catch (error) {
      console.error('Bayes classifier error:', error);
    }

    // Calculate overall risk score
    let riskScore = keywordRiskScore;

    // Add weight for red flags
    const redFlagWeight = redFlags.length * 0.15;
    riskScore += redFlagWeight;

    // Add sentiment weight (very positive sentiment can be a red flag)
    if (sentimentScore.comparative > 0.5) {
      riskScore += 0.1;
    }

    // Adjust based on bayes result if available
    if (bayesResult && bayesResult.length > 0) {
      const scamClassification = bayesResult.find(c => c.label === 'scam');
      const scamProbability = scamClassification ? scamClassification.value : 0;
      riskScore = (riskScore + scamProbability) / 2;
    }

    // Ensure score is between 0 and 1
    riskScore = Math.min(Math.max(riskScore, 0), 1);

    analysis.confidence = riskScore;
    analysis.isScam = riskScore > 0.5;
    analysis.riskFactors = redFlags;

    // Generate recommendations
    if (analysis.isScam) {
      analysis.recommendations.push('Mark as suspicious and investigate further');
      analysis.recommendations.push('Consider removing listing if confidence is high');
      analysis.recommendations.push('Notify moderators for review');
    } else {
      analysis.recommendations.push('Appears legitimate based on current analysis');
      analysis.recommendations.push('Continue monitoring for user reports');
    }

    if (analysis.flaggedKeywords.length > 0) {
      analysis.recommendations.push(`Review flagged keywords: ${analysis.flaggedKeywords.slice(0, 5).join(', ')}`);
    }

    if (redFlags.length > 0) {
      analysis.recommendations.push(`Red flags detected: ${redFlags.join(', ')}`);
    }

    return analysis;
  }

  /**
   * Batch analyze multiple job postings
   */
  async batchAnalyze(jobPostings) {
    const results = [];
    
    for (const job of jobPostings) {
      try {
        const analysis = await this.analyzeJobPosting(job);
        results.push({
          jobId: job._id || job.id,
          analysis
        });
      } catch (error) {
        console.error('Error analyzing job:', error);
        results.push({
          jobId: job._id || job.id,
          analysis: {
            isScam: false,
            confidence: 0,
            error: error.message
          }
        });
      }
    }
    
    return results;
  }

  /**
   * Update the model with new data
   */
  async updateModel(trainingData) {
    if (!this.bayesClassifier) {
      this.initializeBayesClassifier();
    }
    
    trainingData.forEach(item => {
      this.bayesClassifier.addDocument(item.text, item.label);
    });
    
    this.bayesClassifier.train();
  }

  /**
   * Get suspicious keyword statistics
   */
  getSuspiciousKeywordStats(text) {
    const stats = {};
    this.suspiciousKeywords.forEach(keyword => {
      const count = (text.toLowerCase().match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
      if (count > 0) {
        stats[keyword] = count;
      }
    });
    return stats;
  }
}

module.exports = new ScamDetectionService();