"use client";
import { useState, useEffect } from 'react';

const ProgressBar = ({ 
  value = 0, 
  max = 100, 
  size = 'md', 
  color = 'blue', 
  showPercentage = true, 
  showLabel = false,
  label = '',
  animated = false,
  striped = false,
  className = ''
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayValue(percentage);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setDisplayValue(percentage);
    }
  }, [percentage, animated]);

  const sizeClasses = {
    xs: 'h-1',
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
    xl: 'h-6'
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500',
    pink: 'bg-pink-500',
    gray: 'bg-gray-500'
  };

  const stripedPattern = striped ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:20px_20px]' : '';
  const animatedStripes = striped && animated ? 'animate-pulse' : '';

  return (
    <div className={`w-full ${className}`}>
      {(showLabel && label) && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {showPercentage && (
            <span className="text-sm text-gray-500">{Math.round(displayValue)}%</span>
          )}
        </div>
      )}
      
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div 
          className={`
            ${colorClasses[color]} 
            ${sizeClasses[size]} 
            rounded-full 
            transition-all 
            duration-500 
            ease-out
            ${stripedPattern}
            ${animatedStripes}
            relative
            overflow-hidden
          `}
          style={{ width: `${displayValue}%` }}
        >
          {striped && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
          )}
        </div>
      </div>
      
      {showPercentage && (!showLabel || !label) && (
        <div className="mt-2 text-center">
          <span className="text-sm text-gray-600">{Math.round(displayValue)}%</span>
        </div>
      )}
    </div>
  );
};

// Circular Progress Component
export const CircularProgress = ({ 
  value = 0, 
  max = 100, 
  size = 'md', 
  color = 'blue', 
  showPercentage = true,
  strokeWidth = 4,
  className = ''
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const sizeClasses = {
    sm: { width: 40, height: 40 },
    md: { width: 60, height: 60 },
    lg: { width: 80, height: 80 },
    xl: { width: 120, height: 120 }
  };

  const colorClasses = {
    blue: 'stroke-blue-500',
    green: 'stroke-green-500',
    red: 'stroke-red-500',
    yellow: 'stroke-yellow-500',
    purple: 'stroke-purple-500',
    indigo: 'stroke-indigo-500',
    pink: 'stroke-pink-500',
    gray: 'stroke-gray-500'
  };

  const { width, height } = sizeClasses[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={width} height={height} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${colorClasses[color]} transition-all duration-500 ease-out`}
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-medium text-gray-700">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
};

// Multi-step Progress Component
export const StepProgress = ({ 
  steps = [], 
  currentStep = 0, 
  color = 'blue',
  className = ''
}) => {
  const colorClasses = {
    blue: {
      active: 'bg-blue-500 border-blue-500 text-white',
      completed: 'bg-blue-500 border-blue-500 text-white',
      pending: 'bg-white border-gray-300 text-gray-500',
      line: 'bg-blue-500'
    },
    green: {
      active: 'bg-green-500 border-green-500 text-white',
      completed: 'bg-green-500 border-green-500 text-white',
      pending: 'bg-white border-gray-300 text-gray-500',
      line: 'bg-green-500'
    }
  };

  const colors = colorClasses[color];

  return (
    <div className={`flex items-center ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const isPending = index > currentStep;
        
        let stepClasses = colors.pending;
        if (isCompleted) stepClasses = colors.completed;
        if (isActive) stepClasses = colors.active;

        return (
          <div key={index} className="flex items-center">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div 
                className={`
                  w-8 h-8 rounded-full border-2 flex items-center justify-center
                  text-sm font-medium transition-all duration-200
                  ${stepClasses}
                `}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              <span className="mt-2 text-xs text-gray-600 text-center max-w-20">
                {step}
              </span>
            </div>
            
            {/* Connecting Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-4 bg-gray-300 relative">
                <div 
                  className={`h-full transition-all duration-500 ${colors.line}`}
                  style={{ 
                    width: isCompleted ? '100%' : isActive ? '50%' : '0%' 
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProgressBar;