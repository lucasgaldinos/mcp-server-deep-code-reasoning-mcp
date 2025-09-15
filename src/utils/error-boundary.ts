import type { CodeLocation } from '@models/types.js';
import { logger } from '@utils/logger.js';
import { ErrorClassifier } from '@utils/error-classifier.js';
import {
  SessionError,
  ApiError,
  FileSystemError,
  RateLimitError,
  ConversationLockedError,
  SessionNotFoundError,
} from '@errors/index.js';
import { randomUUID } from 'crypto';

export interface ErrorContext {
    operation: string;
    timestamp: Date;
    location?: CodeLocation;
    metadata?: Record<string, unknown>;
    userId?: string;
    sessionId?: string;
    correlationId?: string;
    traceId?: string;
}

export interface ErrorRecoveryStrategy {
    canRecover: boolean;
    retryable: boolean;
    retryDelayMs?: number;
    maxRetries?: number;
    fallbackAction?: () => Promise<void>;
}

export class ErrorBoundary {
  private static instance: ErrorBoundary;
  private requestCorrelations: Map<string, {
    startTime: Date;
    operation: string;
    metadata?: Record<string, unknown>;
  }> = new Map();

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): ErrorBoundary {
    if (!ErrorBoundary.instance) {
      ErrorBoundary.instance = new ErrorBoundary();
    }
    return ErrorBoundary.instance;
  }

  /**
   * Generate a unique correlation ID for request tracking
   */
  public generateCorrelationId(): string {
    return randomUUID();
  }

  /**
   * Start tracking a request with correlation ID
   */
  public startRequestTracking(
    correlationId: string,
    operation: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.requestCorrelations.set(correlationId, {
      startTime: new Date(),
      operation,
      metadata,
    });

    logger.info('Request started', {
      correlationId,
      operation,
      metadata,
      timestamp: new Date(),
    });
  }

  /**
   * End tracking a request
   */
  public endRequestTracking(correlationId: string): void {
    const requestInfo = this.requestCorrelations.get(correlationId);
    if (requestInfo) {
      const duration = Date.now() - requestInfo.startTime.getTime();

      logger.info('Request completed', {
        correlationId,
        operation: requestInfo.operation,
        duration,
        timestamp: new Date(),
      });

      this.requestCorrelations.delete(correlationId);
    }
  }

  /**
     * Centralized error handling with classification and recovery strategies
     */
  public async handleError(
    error: unknown,
    context: ErrorContext,
  ): Promise<ErrorRecoveryStrategy> {
    const timestamp = new Date();
    const correlationId = context.correlationId || this.generateCorrelationId();
    const errorDetails = this.extractErrorDetails(error);

    // Enhanced context with correlation tracking
    const enhancedContext = {
      ...context,
      correlationId,
      timestamp,
    };

    // Log the error with enhanced context
    logger.error('Error occurred', {
      error: errorDetails,
      context: enhancedContext,
      timestamp,
    });

    // Classify the error
    const classification = error instanceof Error
      ? ErrorClassifier.classify(error)
      : { category: 'unknown' as const, description: 'Unknown error type', isRetryable: false };

    // Determine recovery strategy
    const recovery = this.determineRecoveryStrategy(error, classification);

    // Execute recovery if applicable
    if (recovery.canRecover && recovery.fallbackAction) {
      try {
        logger.info('Attempting error recovery', {
          correlationId,
          operation: context.operation,
          recovery: recovery,
        });

        await recovery.fallbackAction();

        logger.info('Error recovery successful', {
          correlationId,
          operation: context.operation,
          recovery: recovery,
        });
      } catch (recoveryError) {
        logger.error('Error recovery failed', {
          correlationId,
          originalError: errorDetails,
          recoveryError: this.extractErrorDetails(recoveryError),
          context: enhancedContext,
        });
      }
    }

    return recovery;
  }

  /**
     * Wrapper for async operations with automatic error handling
     */
  public async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    maxRetries: number = 3,
  ): Promise<T> {
    const correlationId = context.correlationId || this.generateCorrelationId();
    const enhancedContext = { ...context, correlationId };

    this.startRequestTracking(correlationId, context.operation, context.metadata);

    let lastError: unknown;
    let attempt = 0;

    try {
      while (attempt <= maxRetries) {
        try {
          const result = await operation();
          this.endRequestTracking(correlationId);
          return result;
        } catch (error) {
          lastError = error;
          attempt++;

          const recovery = await this.handleError(error, {
            ...enhancedContext,
            metadata: {
              ...enhancedContext.metadata,
              attempt,
              maxRetries,
            },
          });

          // If not retryable or max retries reached, throw
          if (!recovery.retryable || attempt > maxRetries) {
            throw this.wrapError(error, enhancedContext);
          }

          // Wait before retry if specified
          if (recovery.retryDelayMs) {
            await new Promise(resolve => setTimeout(resolve, recovery.retryDelayMs));
          }
        }
      }

      throw this.wrapError(lastError, enhancedContext);
    } catch (error) {
      this.endRequestTracking(correlationId);
      throw error;
    }
  }

  /**
     * Create a circuit breaker for repeated failures
     */
  public createCircuitBreaker(
    operationName: string,
    failureThreshold: number = 5,
    resetTimeoutMs: number = 60000,
  ) {
    let failures = 0;
    let lastFailureTime: Date | null = null;
    let isOpen = false;

    return {
      async execute<T>(operation: () => Promise<T>, _context: ErrorContext): Promise<T> {
        // Check if circuit is open
        if (isOpen) {
          const timeSinceLastFailure = lastFailureTime
            ? Date.now() - lastFailureTime.getTime()
            : 0;

          if (timeSinceLastFailure < resetTimeoutMs) {
            throw new Error(`Circuit breaker is open for ${operationName}`);
          } else {
            // Reset circuit breaker
            isOpen = false;
            failures = 0;
            lastFailureTime = null;
          }
        }

        try {
          const result = await operation();
          // Reset on success
          failures = 0;
          lastFailureTime = null;
          return result;
        } catch (error) {
          failures++;
          lastFailureTime = new Date();

          if (failures >= failureThreshold) {
            isOpen = true;
            logger.warn(`Circuit breaker opened for ${operationName}`, {
              failures,
              threshold: failureThreshold,
            });
          }

          throw error;
        }
      },

      getStatus() {
        return {
          isOpen,
          failures,
          lastFailureTime,
          operationName,
        };
      },
    };
  }

  private extractErrorDetails(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error as any),
      };
    }

    return {
      value: error,
      type: typeof error,
    };
  }

  private determineRecoveryStrategy(
    error: unknown,
    _classification: any,
  ): ErrorRecoveryStrategy {
    // Rate limit errors - wait and retry
    if (error instanceof RateLimitError) {
      return {
        canRecover: true,
        retryable: true,
        retryDelayMs: 60000, // 1 minute
        maxRetries: 3,
      };
    }

    // API errors - may be retryable
    if (error instanceof ApiError) {
      return {
        canRecover: true,
        retryable: true,
        retryDelayMs: 5000, // 5 seconds
        maxRetries: 2,
      };
    }

    // Session errors - generally not retryable
    if (error instanceof SessionError ||
            error instanceof SessionNotFoundError ||
            error instanceof ConversationLockedError) {
      return {
        canRecover: false,
        retryable: false,
      };
    }

    // File system errors - may be retryable
    if (error instanceof FileSystemError) {
      return {
        canRecover: true,
        retryable: true,
        retryDelayMs: 1000, // 1 second
        maxRetries: 2,
      };
    }

    // Unknown errors - conservative approach
    return {
      canRecover: false,
      retryable: false,
    };
  }

  private wrapError(error: unknown, context: ErrorContext): Error {
    if (error instanceof Error) {
      // Enhance existing error with context
      const enhancedError = new Error(
        `${error.message} (Operation: ${context.operation})`,
      );
      enhancedError.name = error.name;
      enhancedError.stack = error.stack;
      (enhancedError as any).originalError = error;
      (enhancedError as any).context = context;
      return enhancedError;
    }

    // Create new error for non-Error types
    const wrappedError = new Error(
      `Unexpected error in ${context.operation}: ${String(error)}`,
    );
    (wrappedError as any).originalError = error;
    (wrappedError as any).context = context;
    return wrappedError;
  }
}

// Export singleton instance
export const errorBoundary = ErrorBoundary.getInstance();
