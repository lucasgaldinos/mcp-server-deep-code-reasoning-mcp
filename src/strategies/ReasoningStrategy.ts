/**
 * Core strategy interface for different code analysis approaches
 * 
 * This interface defines the contract for all reasoning strategies,
 * enabling pluggable analysis approaches based on context and requirements.
 */

import { DeepAnalysisResult, CodeScope, Finding } from '../models/types.js';

/**
 * Extended code context for strategy operations
 */
export interface CodeContext {
  content?: string;
  filePath?: string;
  language?: string;
  framework?: string;
  scope?: CodeScope;
  metadata?: Record<string, unknown>;
}

/**
 * Configuration options for analysis strategies
 */
export interface AnalysisOptions {
  timeout?: number;
  verbose?: boolean;
  depth?: 'quick' | 'medium' | 'deep';
  focusAreas?: string[];
  includePerformance?: boolean;
  includeSecurity?: boolean;
  maxFindings?: number;
  [key: string]: unknown;
}

/**
 * Unified analysis result interface
 */
export interface AnalysisResult extends DeepAnalysisResult {
  strategy: string;
  context: {
    filePath?: string;
    language?: string;
    framework?: string;
  };
  duration: number;
  quickFindings?: Finding[];
}

export interface ReasoningStrategy {
  /**
   * Unique identifier for this strategy
   */
  readonly name: string;

  /**
   * Human-readable description of the strategy
   */
  readonly description: string;

  /**
   * Indicates if this strategy is suitable for real-time analysis
   */
  readonly isRealTime: boolean;

  /**
   * Expected analysis duration category
   */
  readonly complexity: 'quick' | 'medium' | 'deep';

  /**
   * Performs code analysis using this strategy's approach
   * 
   * @param context - The code context to analyze
   * @param options - Analysis configuration options
   * @returns Promise resolving to analysis results
   */
  analyze(context: CodeContext, options?: AnalysisOptions): Promise<AnalysisResult>;

  /**
   * Determines if this strategy is appropriate for the given context
   * 
   * @param context - The code context to evaluate
   * @param options - Analysis configuration options
   * @returns true if this strategy should be used
   */
  canHandle(context: CodeContext, options?: AnalysisOptions): boolean;

  /**
   * Gets estimated analysis time in milliseconds
   * 
   * @param context - The code context to analyze
   * @returns Estimated duration
   */
  getEstimatedDuration(context: CodeContext): number;

  /**
   * Provides strategy-specific configuration options
   * 
   * @returns Configuration schema for this strategy
   */
  getConfigSchema(): Record<string, unknown>;
}

/**
 * Base abstract class providing common strategy functionality
 */
export abstract class BaseReasoningStrategy implements ReasoningStrategy {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly isRealTime: boolean;
  abstract readonly complexity: 'quick' | 'medium' | 'deep';

  abstract analyze(context: CodeContext, options?: AnalysisOptions): Promise<AnalysisResult>;

  /**
   * Default implementation for context handling
   * Can be overridden by specific strategies
   */
  canHandle(context: CodeContext, options?: AnalysisOptions): boolean {
    // Basic validation - ensure we have code to analyze
    return !!(context.content || context.filePath);
  }

  /**
   * Default duration estimation based on complexity
   */
  getEstimatedDuration(context: CodeContext): number {
    const baseTime = this.complexity === 'quick' ? 1000 :
                    this.complexity === 'medium' ? 5000 : 15000;
    
    // Adjust based on content size
    const contentLength = context.content?.length || 0;
    const sizeMultiplier = Math.max(1, contentLength / 10000);
    
    return Math.round(baseTime * sizeMultiplier);
  }

  /**
   * Default configuration schema
   */
  getConfigSchema(): Record<string, unknown> {
    return {
      timeout: {
        type: 'number',
        default: this.getEstimatedDuration({ content: '' }) * 2,
        description: 'Maximum analysis time in milliseconds'
      },
      verbose: {
        type: 'boolean',
        default: false,
        description: 'Enable verbose output'
      }
    };
  }

  /**
   * Utility method for validating context
   */
  protected validateContext(context: CodeContext): void {
    if (!context) {
      throw new Error('CodeContext is required');
    }
    
    if (!context.content && !context.filePath) {
      throw new Error('Either content or filePath must be provided');
    }
  }

  /**
   * Utility method for creating basic analysis results
   */
  protected createBaseResult(context: CodeContext, analysisType: string): Partial<AnalysisResult> {
    return {
      strategy: this.name,
      context: {
        filePath: context.filePath,
        language: context.language,
        framework: context.framework
      },
      duration: 0, // Will be updated by actual implementation
      metadata: {
        analysisType,
        estimatedDuration: this.getEstimatedDuration(context),
        strategy: this.name
      },
      status: 'success' as const,
      findings: {
        rootCauses: [],
        executionPaths: [],
        performanceBottlenecks: [],
        crossSystemImpacts: []
      },
      recommendations: {
        immediateActions: [],
        investigationNextSteps: [],
        codeChangesNeeded: []
      },
      enrichedContext: {
        newInsights: [],
        validatedHypotheses: [],
        ruledOutApproaches: []
      }
    };
  }
}
