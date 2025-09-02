"use client";

/**
 * Comprehensive error handling utility for the decentralized drive application
 */

// Error types for categorization
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  BLOCKCHAIN: 'BLOCKCHAIN',
  ENCRYPTION: 'ENCRYPTION',
  FILE_PROCESSING: 'FILE_PROCESSING',
  VALIDATION: 'VALIDATION',
  AUTHENTICATION: 'AUTHENTICATION',
  STORAGE: 'STORAGE',
  UNKNOWN: 'UNKNOWN'
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

/**
 * Custom error class with enhanced information
 */
export class AppError extends Error {
  constructor(message, type = ERROR_TYPES.UNKNOWN, severity = ERROR_SEVERITY.MEDIUM, originalError = null) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
    this.userMessage = this.generateUserMessage();
  }

  generateUserMessage() {
    switch (this.type) {
      case ERROR_TYPES.NETWORK:
        return 'Network connection issue. Please check your internet connection and try again.';
      case ERROR_TYPES.BLOCKCHAIN:
        return 'Blockchain transaction failed. Please ensure your wallet is connected and has sufficient funds.';
      case ERROR_TYPES.ENCRYPTION:
        return 'File encryption/decryption failed. Please verify your encryption key.';
      case ERROR_TYPES.FILE_PROCESSING:
        return 'File processing failed. Please check the file format and try again.';
      case ERROR_TYPES.VALIDATION:
        return 'Invalid input provided. Please check your data and try again.';
      case ERROR_TYPES.AUTHENTICATION:
        return 'Authentication failed. Please connect your wallet and try again.';
      case ERROR_TYPES.STORAGE:
        return 'Storage operation failed. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

/**
 * Error handler class for managing application errors
 */
export class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.retryAttempts = new Map();
    this.maxRetries = 3;
  }

  /**
   * Handle and process errors
   * @param {Error|AppError} error - The error to handle
   * @param {Object} context - Additional context information
   * @param {Function} onError - Callback for error handling
   * @returns {Object} Processed error information
   */
  handleError(error, context = {}, onError = null) {
    const processedError = this.processError(error, context);
    this.logError(processedError);
    
    if (onError && typeof onError === 'function') {
      onError(processedError);
    }

    return processedError;
  }

  /**
   * Process and categorize errors
   * @param {Error} error - The error to process
   * @param {Object} context - Additional context
   * @returns {AppError} Processed error
   */
  processError(error, context) {
    if (error instanceof AppError) {
      return error;
    }

    let type = ERROR_TYPES.UNKNOWN;
    let severity = ERROR_SEVERITY.MEDIUM;

    // Categorize error based on message and context
    if (this.isNetworkError(error)) {
      type = ERROR_TYPES.NETWORK;
      severity = ERROR_SEVERITY.HIGH;
    } else if (this.isBlockchainError(error)) {
      type = ERROR_TYPES.BLOCKCHAIN;
      severity = ERROR_SEVERITY.HIGH;
    } else if (this.isEncryptionError(error)) {
      type = ERROR_TYPES.ENCRYPTION;
      severity = ERROR_SEVERITY.MEDIUM;
    } else if (this.isFileProcessingError(error)) {
      type = ERROR_TYPES.FILE_PROCESSING;
      severity = ERROR_SEVERITY.MEDIUM;
    } else if (this.isValidationError(error)) {
      type = ERROR_TYPES.VALIDATION;
      severity = ERROR_SEVERITY.LOW;
    } else if (this.isAuthenticationError(error)) {
      type = ERROR_TYPES.AUTHENTICATION;
      severity = ERROR_SEVERITY.HIGH;
    }

    return new AppError(error.message, type, severity, error);
  }

  /**
   * Log error to internal log
   * @param {AppError} error - The error to log
   */
  logError(error) {
    const logEntry = {
      timestamp: error.timestamp,
      type: error.type,
      severity: error.severity,
      message: error.message,
      userMessage: error.userMessage,
      stack: error.stack
    };

    this.errorLog.unshift(logEntry);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Log to console based on severity
    if (error.severity === ERROR_SEVERITY.CRITICAL || error.severity === ERROR_SEVERITY.HIGH) {
      console.error('AppError:', logEntry);
    } else {
      console.warn('AppError:', logEntry);
    }
  }

  /**
   * Retry mechanism for failed operations
   * @param {string} operationId - Unique identifier for the operation
   * @param {Function} operation - The operation to retry
   * @param {Object} options - Retry options
   * @returns {Promise} Operation result
   */
  async withRetry(operationId, operation, options = {}) {
    const { maxRetries = this.maxRetries, delay = 1000, backoff = 2 } = options;
    
    let attempts = this.retryAttempts.get(operationId) || 0;
    
    try {
      const result = await operation();
      this.retryAttempts.delete(operationId); // Clear on success
      return result;
    } catch (error) {
      attempts++;
      this.retryAttempts.set(operationId, attempts);
      
      if (attempts >= maxRetries) {
        this.retryAttempts.delete(operationId);
        throw new AppError(
          `Operation failed after ${maxRetries} attempts: ${error.message}`,
          this.processError(error).type,
          ERROR_SEVERITY.HIGH,
          error
        );
      }
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(backoff, attempts - 1)));
      
      return this.withRetry(operationId, operation, options);
    }
  }

  // Error type detection methods
  isNetworkError(error) {
    const networkKeywords = ['network', 'fetch', 'connection', 'timeout', 'cors', 'ERR_NETWORK'];
    return networkKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword) || 
      error.code?.includes(keyword)
    );
  }

  isBlockchainError(error) {
    const blockchainKeywords = ['transaction', 'gas', 'revert', 'metamask', 'wallet', 'contract', 'BAD_DATA'];
    return blockchainKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword) || 
      error.code?.includes(keyword)
    );
  }

  isEncryptionError(error) {
    const encryptionKeywords = ['encrypt', 'decrypt', 'cipher', 'key', 'crypto'];
    return encryptionKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword)
    );
  }

  isFileProcessingError(error) {
    const fileKeywords = ['file', 'upload', 'download', 'read', 'write', 'blob', 'buffer'];
    return fileKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword)
    );
  }

  isValidationError(error) {
    const validationKeywords = ['validation', 'invalid', 'required', 'format', 'type'];
    return validationKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword)
    );
  }

  isAuthenticationError(error) {
    const authKeywords = ['unauthorized', 'authentication', 'permission', 'access', 'forbidden'];
    return authKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword)
    );
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      byType: {},
      bySeverity: {},
      recent: this.errorLog.slice(0, 10)
    };

    this.errorLog.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
    this.retryAttempts.clear();
  }
}

// Global error handler instance
export const globalErrorHandler = new ErrorHandler();

/**
 * Utility function for handling async operations with error management
 * @param {Function} operation - Async operation to execute
 * @param {Object} options - Error handling options
 * @returns {Promise} Operation result with error handling
 */
export async function safeAsync(operation, options = {}) {
  const { 
    onError = null, 
    context = {}, 
    showUserError = true,
    operationId = null,
    retry = false,
    retryOptions = {}
  } = options;

  try {
    if (retry && operationId) {
      return await globalErrorHandler.withRetry(operationId, operation, retryOptions);
    } else {
      return await operation();
    }
  } catch (error) {
    const processedError = globalErrorHandler.handleError(error, context, onError);
    
    if (showUserError && typeof window !== 'undefined') {
      // Show user-friendly error message
      console.error('User Error:', processedError.userMessage);
    }
    
    throw processedError;
  }
}

/**
 * React hook for error handling
 * @returns {Object} Error handling utilities
 */
export function useErrorHandler() {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAsync = useCallback(async (operation, options = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await safeAsync(operation, {
        ...options,
        onError: (processedError) => {
          setError(processedError);
          if (options.onError) {
            options.onError(processedError);
          }
        }
      });
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    isLoading,
    handleAsync,
    clearError
  };
}

// Import useState and useCallback for the hook
import { useState, useCallback } from 'react';