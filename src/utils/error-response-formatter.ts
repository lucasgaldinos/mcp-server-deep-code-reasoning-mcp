/**
 * Enhanced error response formatting utilities for improved debugging
 * and structured error handling across the MCP server
 */

import { ErrorClassifier, type ClassifiedError } from './error-classifier.js';
import { SessionError, ApiError, FileSystemError, RateLimitError } from '../errors/index.js';

export interface ErrorContext {
  operation?: string;
  sessionId?: string;
  service?: string;
  filePath?: string;
  timestamp: string;
  requestId?: string;
}

export interface StructuredErrorResponse {
  error: {
    type: string;
    code: string;
    message: string;
    category: string;
    isRetryable: boolean;
    context: ErrorContext;
    classification: ClassifiedError;
    nextSteps: string[];
    stackTrace?: string;
  };
}

export class ErrorResponseFormatter {
  /**
   * Format an error into a structured response for MCP tools
   */
  static formatForMCP(
    error: Error,
    context: Partial<ErrorContext> = {},
    includeStackTrace: boolean = false
  ): StructuredErrorResponse {
    const classification = ErrorClassifier.classify(error);
    const nextSteps = ErrorClassifier.getNextSteps(classification);

    const errorContext: ErrorContext = {
      timestamp: new Date().toISOString(),
      ...context,
    };

    return {
      error: {
        type: error.constructor.name,
        code: classification.code || 'UNKNOWN_ERROR',
        message: error.message,
        category: classification.category,
        isRetryable: classification.isRetryable,
        context: errorContext,
        classification,
        nextSteps,
        ...(includeStackTrace && { stackTrace: error.stack }),
      },
    };
  }

  /**
   * Format error for VS Code MCP client consumption
   */
  static formatForVSCode(
    error: Error,
    context: Partial<ErrorContext> = {}
  ): string {
    const structured = this.formatForMCP(error, context);
    const { error: errorInfo } = structured;

    // Create user-friendly message for VS Code
    let message = `[${errorInfo.category.toUpperCase()}] ${errorInfo.message}`;
    
    if (errorInfo.context.operation) {
      message = `Operation: ${errorInfo.context.operation}\n${message}`;
    }

    if (errorInfo.isRetryable) {
      message += '\n\n🔄 This error is retryable. Please try again.';
    }

    if (errorInfo.nextSteps.length > 0) {
      message += '\n\n💡 Suggested actions:';
      errorInfo.nextSteps.forEach((step, index) => {
        message += `\n${index + 1}. ${step}`;
      });
    }

    return message;
  }

  /**
   * Create a standardized error response for conversational tools
   */
  static formatForConversationalTool(
    error: Error,
    sessionId?: string,
    operation?: string
  ): StructuredErrorResponse {
    return this.formatForMCP(error, {
      sessionId,
      operation,
      service: 'conversational',
    });
  }

  /**
   * Create a standardized error response for analysis tools
   */
  static formatForAnalysisTool(
    error: Error,
    service: 'gemini' | 'openai',
    operation?: string,
    filePath?: string
  ): StructuredErrorResponse {
    return this.formatForMCP(error, {
      service,
      operation,
      filePath,
    });
  }
}

/**
 * Error boundary utility for wrapping MCP tool operations
 */
export class ErrorBoundary {
  /**
   * Wrap an async operation with error handling
   */
  static async wrap<T>(
    operation: () => Promise<T>,
    context: Partial<ErrorContext> = {}
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      // Re-throw with enhanced context if it's already a custom error
      if (error instanceof SessionError || 
          error instanceof ApiError || 
          error instanceof FileSystemError) {
        throw error;
      }

      // Convert unknown errors to appropriate custom errors
      const classified = ErrorClassifier.classify(error as Error);
      
      switch (classified.category) {
        case 'session':
          throw new SessionError(
            (error as Error).message, 
            classified.code || 'SESSION_ERROR',
            context.sessionId
          );
        case 'api':
          throw new ApiError(
            (error as Error).message,
            classified.code || 'API_ERROR',
            context.service || 'unknown'
          );
        case 'filesystem':
          throw new FileSystemError(
            (error as Error).message,
            classified.code || 'FS_ERROR',
            context.filePath,
            context.operation
          );
        default:
          // Re-throw original error if we can't classify it properly
          throw error;
      }
    }
  }

  /**
   * Wrap a sync operation with error handling
   */
  static wrapSync<T>(
    operation: () => T,
    context: Partial<ErrorContext> = {}
  ): T {
    try {
      return operation();
    } catch (error) {
      // Same logic as async version but for sync operations
      if (error instanceof SessionError || 
          error instanceof ApiError || 
          error instanceof FileSystemError) {
        throw error;
      }

      const classified = ErrorClassifier.classify(error as Error);
      
      switch (classified.category) {
        case 'session':
          throw new SessionError(
            (error as Error).message, 
            classified.code || 'SESSION_ERROR',
            context.sessionId
          );
        case 'api':
          throw new ApiError(
            (error as Error).message,
            classified.code || 'API_ERROR',
            context.service || 'unknown'
          );
        case 'filesystem':
          throw new FileSystemError(
            (error as Error).message,
            classified.code || 'FS_ERROR',
            context.filePath,
            context.operation
          );
        default:
          throw error;
      }
    }
  }
}

/**
 * Utility for creating context-aware error instances
 */
export class ContextualErrorFactory {
  /**
   * Create a session-related error with context
   */
  static createSessionError(
    message: string,
    sessionId: string,
    operation?: string,
    code: string = 'SESSION_ERROR'
  ): SessionError {
    const contextMessage = operation 
      ? `${operation}: ${message}`
      : message;
    
    return new SessionError(contextMessage, code, sessionId);
  }

  /**
   * Create an API-related error with context
   */
  static createApiError(
    message: string,
    service: string,
    operation?: string,
    statusCode?: number,
    code: string = 'API_ERROR'
  ): ApiError {
    const contextMessage = operation 
      ? `${operation} (${service}): ${message}`
      : `${service}: ${message}`;
    
    return new ApiError(contextMessage, code, service, statusCode);
  }

  /**
   * Create a rate limit error with retry information
   */
  static createRateLimitError(
    service: string,
    retryAfter?: number,
    operation?: string
  ): RateLimitError {
    const message = operation
      ? `Rate limit exceeded for ${operation} on ${service}`
      : `Rate limit exceeded for ${service}`;
    
    return new RateLimitError(message, service, retryAfter);
  }

  /**
   * Create a file system error with context
   */
  static createFileSystemError(
    message: string,
    path: string,
    operation?: string,
    code: string = 'FS_ERROR'
  ): FileSystemError {
    const contextMessage = operation 
      ? `${operation} (${path}): ${message}`
      : `${path}: ${message}`;
    
    return new FileSystemError(contextMessage, code, path, operation);
  }
}