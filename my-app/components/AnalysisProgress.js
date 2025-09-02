"use client";
import React from 'react';
import {
  SparklesIcon,
  DocumentTextIcon,
  TagIcon,
  HeartIcon,
  EyeIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const AnalysisProgress = ({ isVisible, progress, currentStep, fileName }) => {
  if (!isVisible) return null;

  const steps = [
    {
      id: 'extraction',
      name: 'Text Extraction',
      description: 'Extracting text from document',
      icon: DocumentTextIcon,
      color: 'text-blue-400'
    },
    {
      id: 'statistics',
      name: 'Statistical Analysis',
      description: 'Analyzing document structure',
      icon: ChartBarIcon,
      color: 'text-purple-400'
    },
    {
      id: 'keywords',
      name: 'Keyword Extraction',
      description: 'Identifying key terms',
      icon: TagIcon,
      color: 'text-green-400'
    },
    {
      id: 'sentiment',
      name: 'Sentiment Analysis',
      description: 'Analyzing emotional tone',
      icon: HeartIcon,
      color: 'text-pink-400'
    },
    {
      id: 'entities',
      name: 'Entity Recognition',
      description: 'Extracting entities and patterns',
      icon: EyeIcon,
      color: 'text-cyan-400'
    },
    {
      id: 'summary',
      name: 'Summary Generation',
      description: 'Creating document summary',
      icon: SparklesIcon,
      color: 'text-yellow-400'
    }
  ];

  const getStepStatus = (stepId) => {
    const stepIndex = steps.findIndex(step => step.id === stepId);
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-space-indigo/95 to-purple-900/95 backdrop-blur-sm border border-electric-cyan/20 rounded-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="p-6 border-b border-electric-cyan/20">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <SparklesIcon className="w-8 h-8 text-electric-cyan animate-pulse" />
              <div className="absolute inset-0 w-8 h-8 bg-electric-cyan/20 rounded-full animate-ping"></div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-light-silver">AI Analysis in Progress</h2>
              <p className="text-light-silver/60 text-sm">{fileName}</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="p-6 border-b border-electric-cyan/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-light-silver/70 text-sm">Overall Progress</span>
            <span className="text-electric-cyan font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-space-indigo/50 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-electric-cyan to-blue-400 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            >
              <div className="h-full bg-white/20 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="p-6">
          <div className="space-y-4">
            {steps.map((step, index) => {
              const status = getStepStatus(step.id);
              const Icon = step.icon;
              
              return (
                <div key={step.id} className="flex items-center space-x-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    status === 'completed' ? 'bg-green-500/20 border-2 border-green-500' :
                    status === 'active' ? 'bg-electric-cyan/20 border-2 border-electric-cyan' :
                    'bg-gray-500/20 border-2 border-gray-500/50'
                  }`}>
                    {status === 'completed' ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    ) : status === 'active' ? (
                      <ArrowPathIcon className="w-5 h-5 text-electric-cyan animate-spin" />
                    ) : (
                      <Icon className={`w-5 h-5 ${step.color} opacity-50`} />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className={`font-medium ${
                      status === 'completed' ? 'text-green-400' :
                      status === 'active' ? 'text-electric-cyan' :
                      'text-light-silver/50'
                    }`}>
                      {step.name}
                    </div>
                    <div className={`text-sm ${
                      status === 'active' ? 'text-light-silver/70' : 'text-light-silver/40'
                    }`}>
                      {step.description}
                    </div>
                  </div>
                  
                  {status === 'active' && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-electric-cyan rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-electric-cyan/20">
          <div className="flex items-center justify-center space-x-2 text-light-silver/60 text-sm">
            <SparklesIcon className="w-4 h-4" />
            <span>Processing locally on your device for maximum privacy</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisProgress;