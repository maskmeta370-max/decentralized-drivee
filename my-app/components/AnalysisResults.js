"use client";
import React from 'react';
import {
  XMarkIcon,
  DocumentTextIcon,
  TagIcon,
  HeartIcon,
  GlobeAltIcon,
  ChartBarIcon,
  ClockIcon,
  EyeIcon,
  HashtagIcon,
  LanguageIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const AnalysisResults = ({ analysis, onClose }) => {
  if (!analysis) return null;

  const { fileName, fileSize, fileType, analysis: results } = analysis;
  const {
    statistics,
    keywords = [],
    sentiment,
    entities = [],
    summary,
    language,
    topics = [],
    classification
  } = results;

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.sentiment) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment?.sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😞';
      default: return '😐';
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-space-indigo/95 to-purple-900/95 backdrop-blur-sm border border-electric-cyan/20 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-electric-cyan/20">
          <div className="flex items-center space-x-3">
            <SparklesIcon className="w-6 h-6 text-electric-cyan" />
            <div>
              <h2 className="text-2xl font-bold text-light-silver">AI Analysis Results</h2>
              <p className="text-light-silver/60 text-sm">{fileName} • {fileSize}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-light-silver/60 hover:text-light-silver hover:bg-electric-cyan/10 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Summary Section */}
            {summary && (
              <div className="lg:col-span-2 bg-electric-cyan/10 border border-electric-cyan/20 rounded-xl p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <DocumentTextIcon className="w-5 h-5 text-electric-cyan" />
                  <h3 className="text-lg font-semibold text-light-silver">Document Summary</h3>
                </div>
                <p className="text-light-silver/80 leading-relaxed">{summary}</p>
              </div>
            )}

            {/* Statistics */}
            {statistics && (
              <div className="bg-purple-900/30 border border-purple-500/20 rounded-xl p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <ChartBarIcon className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-light-silver">Document Statistics</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-400">{formatNumber(statistics.wordCount)}</div>
                    <div className="text-sm text-light-silver/60">Words</div>
                  </div>
                  <div className="text-center p-3 bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-400">{formatNumber(statistics.characterCount)}</div>
                    <div className="text-sm text-light-silver/60">Characters</div>
                  </div>
                  <div className="text-center p-3 bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-400">{statistics.sentenceCount}</div>
                    <div className="text-sm text-light-silver/60">Sentences</div>
                  </div>
                  <div className="text-center p-3 bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-400">{statistics.paragraphCount}</div>
                    <div className="text-sm text-light-silver/60">Paragraphs</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2">
                  <div className="flex justify-between items-center p-2 bg-purple-900/10 rounded">
                    <span className="text-light-silver/70 text-sm">Reading Time</span>
                    <span className="text-purple-400 font-medium">{statistics.readingTimeMinutes} min</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-purple-900/10 rounded">
                    <span className="text-light-silver/70 text-sm">Avg Words/Sentence</span>
                    <span className="text-purple-400 font-medium">{statistics.averageWordsPerSentence}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Sentiment Analysis */}
            {sentiment && (
              <div className="bg-blue-900/30 border border-blue-500/20 rounded-xl p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <HeartIcon className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-light-silver">Sentiment Analysis</h3>
                </div>
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">{getSentimentIcon(sentiment)}</div>
                  <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(sentiment)}`}>
                    {sentiment.sentiment.charAt(0).toUpperCase() + sentiment.sentiment.slice(1)}
                  </div>
                  <div className="text-light-silver/60 text-sm mt-2">
                    Confidence: {Math.round(sentiment.confidence * 100)}%
                    {sentiment.model === 'transformers' && (
                      <div className="text-electric-cyan text-xs mt-1 flex items-center justify-center space-x-1">
                        <SparklesIcon className="w-3 h-3" />
                        <span>Advanced AI Model</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-900/20 rounded-lg">
                    <div className="text-xl font-bold text-green-400">{sentiment.positiveWords}</div>
                    <div className="text-sm text-light-silver/60">Positive Words</div>
                  </div>
                  <div className="text-center p-3 bg-red-900/20 rounded-lg">
                    <div className="text-xl font-bold text-red-400">{sentiment.negativeWords}</div>
                    <div className="text-sm text-light-silver/60">Negative Words</div>
                  </div>
                </div>
              </div>
            )}

            {/* Keywords */}
            {keywords.length > 0 && (
              <div className="bg-green-900/30 border border-green-500/20 rounded-xl p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <TagIcon className="w-5 h-5 text-green-400" />
                  <h3 className="text-lg font-semibold text-light-silver">Top Keywords</h3>
                </div>
                <div className="space-y-2">
                  {keywords.slice(0, 10).map((keyword, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-green-900/20 rounded-lg">
                      <span className="text-light-silver font-medium">{keyword.keyword}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-green-900/30 rounded-full h-2">
                          <div 
                            className="bg-green-400 h-2 rounded-full" 
                            style={{ width: `${Math.min(keyword.relevance, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-green-400 text-sm font-medium">{keyword.frequency}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Text Classification */}
            {classification && classification.categories && classification.categories.length > 0 && (
              <div className="bg-yellow-900/30 border border-yellow-500/20 rounded-xl p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <SparklesIcon className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-light-silver">Document Classification</h3>
                  <div className="text-electric-cyan text-xs flex items-center space-x-1">
                    <SparklesIcon className="w-3 h-3" />
                    <span>AI Powered</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {classification.categories.slice(0, 5).map((category, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-yellow-900/20 rounded-lg">
                      <span className="text-light-silver font-medium capitalize">{category.label}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-yellow-900/30 rounded-full h-2">
                          <div 
                            className="bg-yellow-400 h-2 rounded-full" 
                            style={{ width: `${Math.round(category.confidence * 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-yellow-400 text-sm font-medium">{Math.round(category.confidence * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Topics */}
            {topics.length > 0 && (
              <div className="bg-orange-900/30 border border-orange-500/20 rounded-xl p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <HashtagIcon className="w-5 h-5 text-orange-400" />
                  <h3 className="text-lg font-semibold text-light-silver">Detected Topics</h3>
                </div>
                <div className="space-y-3">
                  {topics.map((topic, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-orange-900/20 rounded-lg">
                      <span className="text-light-silver font-medium capitalize">{topic.topic}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-orange-900/30 rounded-full h-2">
                          <div 
                            className="bg-orange-400 h-2 rounded-full" 
                            style={{ width: `${topic.confidence}%` }}
                          ></div>
                        </div>
                        <span className="text-orange-400 text-sm font-medium">{topic.confidence}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Entities */}
            {entities.length > 0 && (
              <div className="bg-cyan-900/30 border border-cyan-500/20 rounded-xl p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <EyeIcon className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-semibold text-light-silver">Extracted Entities</h3>
                </div>
                <div className="space-y-2">
                  {entities.slice(0, 8).map((entity, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-cyan-900/20 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          entity.type === 'email' ? 'bg-blue-100 text-blue-800' :
                          entity.type === 'url' ? 'bg-green-100 text-green-800' :
                          entity.type === 'phone' ? 'bg-purple-100 text-purple-800' :
                          entity.type === 'date' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {entity.type}
                        </span>
                        <span className="text-light-silver text-sm">{entity.value}</span>
                      </div>
                      <span className="text-cyan-400 text-xs">{Math.round(entity.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Language & Metadata */}
            <div className="bg-indigo-900/30 border border-indigo-500/20 rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <LanguageIcon className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-semibold text-light-silver">Document Metadata</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-indigo-900/20 rounded">
                  <span className="text-light-silver/70">Language</span>
                  <span className="text-indigo-400 font-medium uppercase">{language}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-indigo-900/20 rounded">
                  <span className="text-light-silver/70">File Type</span>
                  <span className="text-indigo-400 font-medium">{fileType}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-indigo-900/20 rounded">
                  <span className="text-light-silver/70">Analysis Date</span>
                  <span className="text-indigo-400 font-medium">
                    {new Date(analysis.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-indigo-900/20 rounded">
                  <span className="text-light-silver/70">Text Length</span>
                  <span className="text-indigo-400 font-medium">{formatNumber(analysis.textLength)} chars</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-electric-cyan/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-light-silver/60 text-sm">
              <SparklesIcon className="w-4 h-4" />
              <span>Advanced AI analysis powered by Transformers.js - processed locally for maximum privacy</span>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-electric-cyan to-blue-400 text-space-indigo font-semibold rounded-lg hover:shadow-lg hover:shadow-electric-cyan/30 transition-all duration-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResults;