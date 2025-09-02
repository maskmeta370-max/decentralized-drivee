// Client-side AI analysis utility for privacy-preserving document analysis
// Uses Transformers.js for advanced NLP capabilities without sending data to external servers

import * as tf from '@tensorflow/tfjs';

// Dynamically import Transformers.js only when needed
let transformersModule = null;
const getTransformers = async () => {
  if (!transformersModule) {
    transformersModule = await import('@xenova/transformers');
    // Configure for local execution
    transformersModule.env.allowRemoteModels = false;
    transformersModule.env.allowLocalModels = true;
  }
  return transformersModule;
};

// PDF.js will be loaded dynamically when needed
let pdfjsLib = null;

// Initialize PDF.js when needed
const initPDFJS = async () => {
  if (pdfjsLib || typeof window === 'undefined') return pdfjsLib;
  
  try {
    pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
    return pdfjsLib;
  } catch (error) {
    console.warn('PDF.js failed to load:', error);
    return null;
  }
};

/**
 * Client-side AI Analysis Manager
 * Provides privacy-preserving document analysis capabilities
 */
export class ClientAIAnalyzer {
  constructor() {
    this.isInitialized = false;
    this.supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'];
    this.sentimentWords = {
      positive: ['excellent', 'great', 'amazing', 'wonderful', 'fantastic', 'good', 'nice', 'pleasant', 'satisfactory', 'love', 'like', 'enjoy', 'happy', 'pleased'],
      negative: ['bad', 'terrible', 'awful', 'horrible', 'disappointing', 'poor', 'unsatisfactory', 'inadequate', 'hate', 'dislike', 'angry', 'sad', 'upset'],
      neutral: ['okay', 'average', 'normal', 'standard', 'fine', 'acceptable']
    };
    
    // Performance optimization: Add caching for analysis results
    this.analysisCache = new Map();
    this.maxCacheSize = 50;
    
    // Performance optimization: Text chunking configuration
    this.chunkSize = 10000; // Process text in 10KB chunks
    this.maxTextLength = 100000; // Increased limit with chunking
    
    // Transformers.js pipelines - initialized lazily for performance
    this.pipelines = {
      summarization: null,
      sentiment: null,
      questionAnswering: null,
      textClassification: null,
      translation: null
    };
    
    // Transformers.js will be configured when first loaded
  }

  /**
   * Cache management for performance optimization
   */
  getCacheKey(text, options = {}) {
    const optionsStr = JSON.stringify(options);
    const textHash = this.simpleHash(text.substring(0, 1000)); // Use first 1KB for hash
    return `${textHash}_${optionsStr}`;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  getCachedResult(cacheKey) {
    return this.analysisCache.get(cacheKey);
  }

  setCachedResult(cacheKey, result) {
    if (this.analysisCache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.analysisCache.keys().next().value;
      this.analysisCache.delete(firstKey);
    }
    this.analysisCache.set(cacheKey, result);
  }

  /**
   * Split large text into manageable chunks
   */
  chunkText(text, chunkSize = this.chunkSize) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Process text chunks with progress tracking
   */
  async processChunks(chunks, processor, onProgress = null) {
    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      if (onProgress) {
        const progress = (i / chunks.length) * 100;
        onProgress(progress);
      }
      
      // Add small delay to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await processor(chunks[i]);
      results.push(result);
    }
    return results;
  }

  /**
   * Initialize the AI analyzer
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize basic browser-compatible NLP
      await this.setupBasicNLP();
      
      // Models will be loaded on-demand for better initial performance
      
      this.isInitialized = true;
      console.log('Client AI Analyzer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Client AI Analyzer:', error);
      throw new Error('AI Analyzer initialization failed');
    }
  }

  /**
   * Setup basic NLP capabilities
   */
  async setupBasicNLP() {
    // Browser-compatible NLP setup
    // No external dependencies needed for basic text analysis
    return Promise.resolve();
  }

  /**
   * Pre-load essential Transformers.js models for better performance
   */
  // Removed preloading for better initial page performance
  // Models are now loaded on-demand when features are used

  /**
   * Get or initialize sentiment analysis pipeline
   */
  async getSentimentPipeline() {
    if (!this.pipelines.sentiment) {
      const { pipeline } = await getTransformers();
      this.pipelines.sentiment = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
    }
    return this.pipelines.sentiment;
  }

  /**
   * Get or initialize summarization pipeline
   */
  async getSummarizationPipeline() {
    if (!this.pipelines.summarization) {
      const { pipeline } = await getTransformers();
      this.pipelines.summarization = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6');
    }
    return this.pipelines.summarization;
  }

  /**
   * Get or initialize question-answering pipeline
   */
  async getQuestionAnsweringPipeline() {
    if (!this.pipelines.questionAnswering) {
      const { pipeline } = await getTransformers();
      this.pipelines.questionAnswering = await pipeline('question-answering', 'Xenova/distilbert-base-cased-distilled-squad');
    }
    return this.pipelines.questionAnswering;
  }

  /**
   * Get or initialize text classification pipeline
   */
  async getTextClassificationPipeline() {
    if (!this.pipelines.textClassification) {
      const { pipeline } = await getTransformers();
      this.pipelines.textClassification = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
    }
    return this.pipelines.textClassification;
  }

  /**
   * Extract text from PDF file
   * @param {File} file - PDF file to extract text from
   * @returns {Promise<string>} Extracted text content
   */
  async extractPDFText(file) {
    try {
      const pdfjs = await initPDFJS();
      if (!pdfjs) {
        throw new Error('PDF.js failed to initialize');
      }
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }

      return fullText.trim();
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract text from text file
   * @param {File} file - Text file to read
   * @returns {Promise<string>} File content
   */
  async extractTextFile(file) {
    try {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
    } catch (error) {
      console.error('Text file reading failed:', error);
      throw new Error('Failed to read text file');
    }
  }

  /**
   * Analyze document content
   * @param {string} text - Document text content
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeDocument(text, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Performance optimization: Check cache first
    const cacheKey = this.getCacheKey(text, options);
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult) {
      console.log('Returning cached analysis result');
      if (options.onProgress) {
        options.onProgress(100, 'completed');
      }
      return cachedResult;
    }

    // Performance optimization: Handle large documents with chunking
    let processedText = text;
    let isChunked = false;
    
    if (text.length > this.maxTextLength) {
      console.warn(`Document is very large (${text.length} chars). Using chunked processing.`);
      isChunked = true;
    } else if (text.length > 50000) {
      console.warn(`Document is large (${text.length} chars). Optimizing for performance.`);
      // For medium-large documents, just truncate with better summary
      processedText = text.substring(0, 50000) + '... [truncated for performance]';
    }

    const {
      includeSummary = true,
      includeKeywords = true,
      includeSentiment = true,
      includeEntities = true,
      includeStatistics = true,
      maxSummaryLength = 200,
      onProgress = null
    } = options;

    const results = {
      timestamp: new Date().toISOString(),
      textLength: text.length,
      isChunked,
      analysis: {}
    };

    try {
      const steps = [
        { id: 'extraction', name: 'Text Extraction', enabled: true },
        { id: 'statistics', name: 'Statistical Analysis', enabled: includeStatistics },
        { id: 'keywords', name: 'Keyword Extraction', enabled: includeKeywords },
        { id: 'sentiment', name: 'Sentiment Analysis', enabled: includeSentiment },
        { id: 'entities', name: 'Entity Recognition', enabled: includeEntities },
        { id: 'summary', name: 'Summary Generation', enabled: includeSummary }
      ];
      
      const enabledSteps = steps.filter(step => step.enabled);
      let currentStepIndex = 0;
      
      const updateProgress = (stepId) => {
        if (onProgress) {
          const progress = (currentStepIndex / enabledSteps.length) * 100;
          onProgress(progress, stepId);
        }
        currentStepIndex++;
      };

      // Performance optimization: Enhanced processing with chunking support
      const processWithDelay = async (fn, delay = 50) => {
        return new Promise(resolve => {
          setTimeout(() => resolve(fn()), delay);
        });
      };
      
      // For chunked processing, prepare chunks
      const chunks = isChunked ? this.chunkText(processedText) : [processedText];

      // Text extraction step (already done)
      updateProgress('extraction');

      // Basic text statistics
      if (includeStatistics) {
        if (isChunked) {
          const chunkStats = await this.processChunks(chunks, 
            chunk => this.getTextStatistics(chunk),
            progress => onProgress && onProgress(progress * 0.2, 'statistics')
          );
          results.analysis.statistics = this.mergeStatistics(chunkStats, text.length);
        } else {
          results.analysis.statistics = await processWithDelay(() => this.getTextStatistics(processedText));
        }
        updateProgress('statistics');
      }

      // Keyword extraction
      if (includeKeywords) {
        if (isChunked) {
          const chunkKeywords = await this.processChunks(chunks,
            chunk => this.extractKeywords(chunk),
            progress => onProgress && onProgress(progress * 0.2, 'keywords')
          );
          results.analysis.keywords = this.mergeKeywords(chunkKeywords);
        } else {
          results.analysis.keywords = await processWithDelay(() => this.extractKeywords(processedText));
        }
        updateProgress('keywords');
      }

      // Sentiment analysis
      if (includeSentiment) {
        if (isChunked) {
          const chunkSentiments = await this.processChunks(chunks,
            chunk => this.analyzeSentiment(chunk),
            progress => onProgress && onProgress(progress * 0.2, 'sentiment')
          );
          results.analysis.sentiment = this.mergeSentiments(chunkSentiments);
        } else {
          results.analysis.sentiment = await processWithDelay(() => this.analyzeSentiment(processedText));
        }
        updateProgress('sentiment');
      }

      // Entity extraction
      if (includeEntities) {
        if (isChunked) {
          const chunkEntities = await this.processChunks(chunks,
            chunk => this.extractEntities(chunk),
            progress => onProgress && onProgress(progress * 0.2, 'entities')
          );
          results.analysis.entities = this.mergeEntities(chunkEntities);
        } else {
          results.analysis.entities = await processWithDelay(() => this.extractEntities(processedText));
        }
        updateProgress('entities');
      }

      // Text summarization
      if (includeSummary) {
        if (isChunked) {
          // For chunked text, create summary from first few chunks
          const summaryText = chunks.slice(0, 3).join(' ');
          results.analysis.summary = await processWithDelay(async () => await this.generateSummary(summaryText, maxSummaryLength));
        } else {
          results.analysis.summary = await processWithDelay(async () => await this.generateSummary(processedText, maxSummaryLength));
        }
        updateProgress('summary');
      }

      // Language detection (use first chunk for chunked text)
      const langText = isChunked ? chunks[0] : processedText;
      results.analysis.language = await processWithDelay(() => this.detectLanguage(langText));

      // Topic classification (use first chunk for chunked text)
      const topicText = isChunked ? chunks[0] : processedText;
      results.analysis.topics = await processWithDelay(() => this.classifyTopics(topicText));

      // Cache the results for future use
      this.setCachedResult(cacheKey, results);

      // Final progress update
      if (onProgress) {
        onProgress(100, 'completed');
      }

      return results;
    } catch (error) {
      console.error('Document analysis failed:', error);
      throw new Error('Failed to analyze document');
    }
  }

  /**
   * Merge statistics from multiple chunks
   */
  mergeStatistics(chunkStats, totalLength) {
    const merged = {
      characterCount: totalLength,
      wordCount: 0,
      sentenceCount: 0,
      paragraphCount: 0,
      readingTimeMinutes: 0,
      mostFrequentWords: []
    };

    const wordFreq = {};
    
    chunkStats.forEach(stats => {
      merged.wordCount += stats.wordCount;
      merged.sentenceCount += stats.sentenceCount;
      merged.paragraphCount += stats.paragraphCount;
      
      // Merge word frequencies
      stats.mostFrequentWords.forEach(({ word, count }) => {
        wordFreq[word] = (wordFreq[word] || 0) + count;
      });
    });

    merged.averageWordsPerSentence = merged.sentenceCount > 0 ? 
      Math.round((merged.wordCount / merged.sentenceCount) * 100) / 100 : 0;
    merged.averageSentencesPerParagraph = merged.paragraphCount > 0 ? 
      Math.round((merged.sentenceCount / merged.paragraphCount) * 100) / 100 : 0;
    merged.readingTimeMinutes = Math.ceil(merged.wordCount / 200);
    
    merged.mostFrequentWords = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    return merged;
  }

  /**
   * Merge keywords from multiple chunks
   */
  mergeKeywords(chunkKeywords) {
    const keywordFreq = {};
    
    chunkKeywords.forEach(keywords => {
      keywords.forEach(({ keyword, frequency, relevance }) => {
        if (!keywordFreq[keyword]) {
          keywordFreq[keyword] = { frequency: 0, relevance: 0, count: 0 };
        }
        keywordFreq[keyword].frequency += frequency;
        keywordFreq[keyword].relevance += relevance;
        keywordFreq[keyword].count += 1;
      });
    });

    return Object.entries(keywordFreq)
      .map(([keyword, data]) => ({
        keyword,
        frequency: data.frequency,
        relevance: data.relevance / data.count // Average relevance
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 15);
  }

  /**
   * Merge sentiment analysis from multiple chunks
   */
  mergeSentiments(chunkSentiments) {
    let totalScore = 0;
    let totalConfidence = 0;
    const labelCounts = { positive: 0, negative: 0, neutral: 0 };
    
    chunkSentiments.forEach(sentiment => {
      totalScore += sentiment.score;
      totalConfidence += sentiment.confidence;
      labelCounts[sentiment.label] += 1;
    });

    const avgScore = totalScore / chunkSentiments.length;
    const avgConfidence = totalConfidence / chunkSentiments.length;
    
    // Determine overall label based on majority
    const dominantLabel = Object.entries(labelCounts)
      .sort(([,a], [,b]) => b - a)[0][0];

    return {
      score: Math.round(avgScore * 100) / 100,
      label: dominantLabel,
      confidence: Math.round(avgConfidence * 100) / 100
    };
  }

  /**
   * Merge entities from multiple chunks
   */
  mergeEntities(chunkEntities) {
    const entityMap = {};
    
    chunkEntities.forEach(entities => {
      entities.forEach(entity => {
        const key = `${entity.text}_${entity.type}`;
        if (!entityMap[key]) {
          entityMap[key] = { ...entity, count: 0 };
        }
        entityMap[key].count += 1;
        entityMap[key].confidence = Math.max(entityMap[key].confidence, entity.confidence);
      });
    });

    return Object.values(entityMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Limit to top 20 entities
  }

  /**
   * Get basic text statistics
   * @param {string} text - Text to analyze
   * @returns {Object} Text statistics
   */
  getTextStatistics(text) {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    const wordFrequency = {};
    words.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
      if (cleanWord.length > 2) {
        wordFrequency[cleanWord] = (wordFrequency[cleanWord] || 0) + 1;
      }
    });

    const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;
    const avgSentencesPerParagraph = paragraphs.length > 0 ? sentences.length / paragraphs.length : 0;

    return {
      characterCount: text.length,
      wordCount: words.length,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      averageWordsPerSentence: Math.round(avgWordsPerSentence * 100) / 100,
      averageSentencesPerParagraph: Math.round(avgSentencesPerParagraph * 100) / 100,
      readingTimeMinutes: Math.ceil(words.length / 200), // Assuming 200 WPM
      mostFrequentWords: Object.entries(wordFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }))
    };
  }

  /**
   * Extract keywords from text
   * @param {string} text - Text to analyze
   * @returns {Promise<Array>} Array of keywords with scores
   */
  async extractKeywords(text) {
    try {
      // Simple TF-IDF-like keyword extraction
      const words = text.toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3);

      const stopWords = new Set([
        'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
        'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
        'after', 'above', 'below', 'between', 'among', 'this', 'that', 'these',
        'those', 'they', 'them', 'their', 'there', 'where', 'when', 'what',
        'which', 'who', 'whom', 'whose', 'why', 'how', 'all', 'any', 'both',
        'each', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own',
        'same', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now'
      ]);

      const wordFreq = {};
      words.forEach(word => {
        if (!stopWords.has(word) && word.length > 3) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      });

      return Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 15)
        .map(([word, frequency]) => ({
          keyword: word,
          frequency,
          relevance: Math.min(frequency / words.length * 100, 100)
        }));
    } catch (error) {
      console.error('Keyword extraction failed:', error);
      return [];
    }
  }

  /**
   * Analyze sentiment of text
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} Sentiment analysis results
   */
  async analyzeSentiment(text) {
    try {
      // Use Transformers.js for advanced sentiment analysis
      const sentimentPipeline = await this.getSentimentPipeline();
      
      // Truncate text if too long for the model
      const maxLength = 512;
      const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text;
      
      const result = await sentimentPipeline(truncatedText);
      
      // Convert Transformers.js output to our format
      const transformerResult = Array.isArray(result) ? result[0] : result;
      const label = transformerResult.label.toLowerCase();
      const score = transformerResult.score;
      
      // Map labels to our format
      let sentiment = 'neutral';
      if (label === 'positive' || label === 'pos') {
        sentiment = 'positive';
      } else if (label === 'negative' || label === 'neg') {
        sentiment = 'negative';
      }
      
      // Fallback to basic analysis if Transformers.js fails
      if (!transformerResult || score < 0.6) {
        return await this.basicSentimentAnalysis(text);
      }
      
      return {
        sentiment,
        confidence: Math.round(score * 100) / 100,
        score: sentiment === 'positive' ? score : (sentiment === 'negative' ? -score : 0),
        label: sentiment,
        model: 'transformers'
      };
    } catch (error) {
      console.warn('Advanced sentiment analysis failed, falling back to basic analysis:', error);
      return await this.basicSentimentAnalysis(text);
    }
  }

  /**
   * Fallback basic sentiment analysis
   */
  async basicSentimentAnalysis(text) {
    try {
      const words = text.toLowerCase().split(/\s+/);
      let positiveCount = 0;
      let negativeCount = 0;
      
      words.forEach(word => {
        if (this.sentimentWords.positive.some(pw => word.includes(pw))) positiveCount++;
        if (this.sentimentWords.negative.some(nw => word.includes(nw))) negativeCount++;
      });
      
      const totalSentimentWords = positiveCount + negativeCount;
      let sentiment = 'neutral';
      let confidence = 0.5;
      
      if (totalSentimentWords > 0) {
        const positiveRatio = positiveCount / totalSentimentWords;
        if (positiveRatio > 0.6) {
          sentiment = 'positive';
          confidence = positiveRatio;
        } else if (positiveRatio < 0.4) {
          sentiment = 'negative';
          confidence = 1 - positiveRatio;
        }
      }
      
      return {
        sentiment,
        confidence: Math.round(confidence * 100) / 100,
        positiveWords: positiveCount,
        negativeWords: negativeCount,
        score: (positiveCount - negativeCount) / Math.max(words.length / 100, 1),
        label: sentiment,
        model: 'basic'
      };
    } catch (error) {
      console.error('Basic sentiment analysis failed:', error);
      return { sentiment: 'neutral', confidence: 0.5, score: 0, label: 'neutral', model: 'fallback' };
    }
  }

  /**
   * Extract named entities from text
   * @param {string} text - Text to analyze
   * @returns {Promise<Array>} Array of extracted entities
   */
  async extractEntities(text) {
    try {
      // Simple regex-based entity extraction
      const entities = [];
      
      // Email addresses
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const emails = text.match(emailRegex) || [];
      emails.forEach(email => {
        entities.push({ type: 'email', value: email, confidence: 0.9 });
      });
      
      // URLs
      const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
      const urls = text.match(urlRegex) || [];
      urls.forEach(url => {
        entities.push({ type: 'url', value: url, confidence: 0.95 });
      });
      
      // Phone numbers (simple pattern)
      const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
      const phones = text.match(phoneRegex) || [];
      phones.forEach(phone => {
        entities.push({ type: 'phone', value: phone, confidence: 0.8 });
      });
      
      // Dates (simple pattern)
      const dateRegex = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g;
      const dates = text.match(dateRegex) || [];
      dates.forEach(date => {
        entities.push({ type: 'date', value: date, confidence: 0.7 });
      });
      
      return entities;
    } catch (error) {
      console.error('Entity extraction failed:', error);
      return [];
    }
  }

  /**
   * Generate a summary of the text using Transformers.js
   * @param {string} text - Text to summarize
   * @param {number} maxLength - Maximum summary length
   * @returns {Promise<string>} Generated summary
   */
  async generateSummary(text, maxLength = 200) {
    try {
      // Use Transformers.js for advanced summarization
      const summarizationPipeline = await this.getSummarizationPipeline();
      
      // Prepare text for summarization (models have input limits)
      const maxInputLength = 1024;
      let inputText = text;
      
      if (text.length > maxInputLength) {
        // Take the first part and last part to capture key information
        const firstPart = text.substring(0, maxInputLength * 0.7);
        const lastPart = text.substring(text.length - maxInputLength * 0.3);
        inputText = firstPart + ' ... ' + lastPart;
      }
      
      // Generate summary with appropriate length constraints
      const result = await summarizationPipeline(inputText, {
        max_length: Math.min(maxLength / 4, 142), // Model tokens are roughly 4 chars
        min_length: Math.min(maxLength / 8, 30),
        do_sample: false
      });
      
      let summary = Array.isArray(result) ? result[0].summary_text : result.summary_text;
      
      // Fallback to basic summarization if result is poor
      if (!summary || summary.length < 20) {
        console.warn('Transformers.js summarization produced poor result, falling back to basic method');
        return this.basicSummarization(text, maxLength);
      }
      
      // Ensure summary doesn't exceed maxLength
      if (summary.length > maxLength) {
        summary = summary.substring(0, maxLength - 3) + '...';
      }
      
      return summary;
    } catch (error) {
      console.warn('Advanced summarization failed, falling back to basic method:', error);
      return this.basicSummarization(text, maxLength);
    }
  }

  /**
   * Fallback basic summarization method
   */
  basicSummarization(text, maxLength = 200) {
    try {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      
      if (sentences.length <= 2) {
        return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
      }
      
      // Score sentences based on word frequency and position
      const words = text.toLowerCase().split(/\s+/);
      const wordFreq = {};
      words.forEach(word => {
        const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
        if (cleanWord.length > 3) {
          wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
        }
      });
      
      const sentenceScores = sentences.map((sentence, index) => {
        const sentenceWords = sentence.toLowerCase().split(/\s+/);
        let score = 0;
        
        sentenceWords.forEach(word => {
          const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
          score += wordFreq[cleanWord] || 0;
        });
        
        // Boost score for sentences at the beginning
        if (index < sentences.length * 0.3) score *= 1.5;
        
        return { sentence: sentence.trim(), score, index };
      });
      
      // Select top sentences
      const topSentences = sentenceScores
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.min(3, sentences.length))
        .sort((a, b) => a.index - b.index)
        .map(item => item.sentence);
      
      let summary = topSentences.join('. ');
      if (summary.length > maxLength) {
        summary = summary.substring(0, maxLength - 3) + '...';
      }
      
      return summary;
    } catch (error) {
      console.error('Basic summarization failed:', error);
      return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
    }
  }

  /**
   * Answer questions about the document using Transformers.js
   * @param {string} question - Question to answer
   * @param {string} context - Document context
   * @returns {Promise<Object>} Answer with confidence score
   */
  async answerQuestion(question, context) {
    try {
      const qaPipeline = await this.getQuestionAnsweringPipeline();
      
      // Truncate context if too long for the model
      const maxContextLength = 2048;
      let truncatedContext = context;
      
      if (context.length > maxContextLength) {
        // Try to find relevant sections around keywords from the question
        const questionWords = question.toLowerCase().split(/\s+/).filter(word => word.length > 3);
        let bestSection = context.substring(0, maxContextLength);
        
        for (const word of questionWords) {
          const index = context.toLowerCase().indexOf(word);
          if (index !== -1) {
            const start = Math.max(0, index - maxContextLength / 2);
            const end = Math.min(context.length, start + maxContextLength);
            bestSection = context.substring(start, end);
            break;
          }
        }
        
        truncatedContext = bestSection;
      }
      
      const result = await qaPipeline({
        question: question,
        context: truncatedContext
      });
      
      return {
        answer: result.answer,
        confidence: Math.round(result.score * 100) / 100,
        start: result.start,
        end: result.end,
        model: 'transformers'
      };
    } catch (error) {
      console.warn('Advanced question answering failed:', error);
      return {
        answer: 'I apologize, but I cannot answer that question based on the provided document.',
        confidence: 0,
        model: 'fallback'
      };
    }
  }

  /**
   * Classify text into categories using Transformers.js
   * @param {string} text - Text to classify
   * @returns {Promise<Object>} Classification results
   */
  async classifyText(text) {
    try {
      const classificationPipeline = await this.getTextClassificationPipeline();
      
      // Truncate text if too long
      const maxLength = 512;
      const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text;
      
      const result = await classificationPipeline(truncatedText);
      
      // Convert to our format
      const classifications = Array.isArray(result) ? result : [result];
      
      return {
        categories: classifications.map(item => ({
          label: item.label,
          confidence: Math.round(item.score * 100) / 100
        })),
        model: 'transformers'
      };
    } catch (error) {
      console.warn('Text classification failed:', error);
      return {
        categories: [{ label: 'unknown', confidence: 0 }],
        model: 'fallback'
      };
    }
  }

  /**
   * Detect the language of the text
   * @param {string} text - Text to analyze
   * @returns {string} Detected language code
   */
  detectLanguage(text) {
    // Simple language detection based on common words
    const languagePatterns = {
      en: ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with'],
      es: ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'no', 'te'],
      fr: ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que'],
      de: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des'],
      it: ['il', 'di', 'che', 'e', 'la', 'per', 'in', 'un', 'è', 'con', 'non']
    };
    
    const words = text.toLowerCase().split(/\s+/).slice(0, 100); // Check first 100 words
    const scores = {};
    
    Object.entries(languagePatterns).forEach(([lang, patterns]) => {
      scores[lang] = patterns.reduce((score, pattern) => {
        return score + words.filter(word => word === pattern).length;
      }, 0);
    });
    
    const detectedLang = Object.entries(scores).reduce((a, b) => scores[a[0]] > scores[b[0]] ? a : b)[0];
    return detectedLang || 'en';
  }

  /**
   * Classify topics in the text
   * @param {string} text - Text to analyze
   * @returns {Array} Array of detected topics with confidence scores
   */
  classifyTopics(text) {
    const topicKeywords = {
      technology: ['computer', 'software', 'internet', 'digital', 'data', 'algorithm', 'programming', 'code', 'system', 'network'],
      business: ['company', 'market', 'profit', 'revenue', 'customer', 'sales', 'management', 'strategy', 'finance', 'investment'],
      science: ['research', 'study', 'experiment', 'analysis', 'theory', 'hypothesis', 'method', 'result', 'conclusion', 'evidence'],
      health: ['medical', 'health', 'patient', 'treatment', 'disease', 'medicine', 'doctor', 'hospital', 'therapy', 'diagnosis'],
      education: ['student', 'teacher', 'school', 'university', 'learning', 'education', 'course', 'study', 'knowledge', 'academic'],
      politics: ['government', 'policy', 'political', 'election', 'vote', 'democracy', 'law', 'legislation', 'public', 'citizen']
    };
    
    const words = text.toLowerCase().split(/\s+/);
    const topicScores = {};
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      const matches = keywords.reduce((count, keyword) => {
        return count + words.filter(word => word.includes(keyword)).length;
      }, 0);
      
      if (matches > 0) {
        topicScores[topic] = matches / words.length * 100;
      }
    });
    
    return Object.entries(topicScores)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([topic, score]) => ({
        topic,
        confidence: Math.round(Math.min(score * 10, 100) * 100) / 100
      }));
  }

  /**
   * Process a file and return analysis results
   * @param {File} file - File to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis results
   */
  async processFile(file, options = {}) {
    try {
      let text = '';
      
      if (file.type === 'application/pdf') {
        text = await this.extractPDFText(file);
      } else if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        text = await this.extractTextFile(file);
      } else {
        throw new Error('Unsupported file type. Please upload a PDF or text file.');
      }
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text content found in the file.');
      }
      
      const analysis = await this.analyzeDocument(text, options);
      
      return {
        ...analysis,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      };
    } catch (error) {
      console.error('File processing failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const clientAI = new ClientAIAnalyzer();

// Export utility functions
export const analyzeFile = async (file, options = {}) => {
  return await clientAI.processFile(file, options);
};

export const analyzeText = async (text, options = {}) => {
  return await clientAI.analyzeDocument(text, options);
};

export default clientAI;