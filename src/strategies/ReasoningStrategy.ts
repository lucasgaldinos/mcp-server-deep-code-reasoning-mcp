/**
 * @fileoverview Reasoning Strategy Pattern Interface
 * 
 * This module defines the Strategy pattern interface for different analysis
 * approaches in the Deep Code Reasoning MCP Server. It provides a flexible
 * framework for implementing various reasoning strategies such as quick
 * analysis, deep analysis, performance optimization, and cross-system analysis.
 * 
 * Key features:
 * - Strategy pattern for analysis approaches
 * - Context-aware strategy selection
 * - Performance and resource constraints handling
 * - Extensible framework for new analysis types
 * 
 * @author Deep Code Reasoning MCP Server
 * @version 1.0.0
 * @since 2025-01-09
 */

import { ILogContext } from '@utils/StructuredLogger.js';

/**
 * Analysis context for strategy execution
 */
export interface IAnalysisContext {
  files: string[];
  query: string;
  timeConstraint?: number;
  memoryConstraint?: number;
  prioritizeSpeed?: boolean;
  includePerformanceAnalysis?: boolean;
  enableCrossSystemAnalysis?: boolean;
  customParameters?: Record<string, any>;
  correlationId?: string;
  logContext?: ILogContext;
}

/**
 * Analysis result interface
 */
export interface IAnalysisResult {
  success: boolean;
  analysis: string;
  confidence: number;
  executionTime: number;
  memoryUsed: number;
  strategy: string;
  metadata?: Record<string, any>;
  warnings?: string[];
  recommendations?: string[];
  followUpSuggestions?: string[];
}

/**
 * Strategy capabilities metadata
 */
export interface IStrategyCapabilities {
  name: string;
  description: string;
  supportedAnalysisTypes: string[];
  minimumTimeConstraint?: number;
  maximumFileCount?: number;
  memoryRequirement?: number;
  requiresExternalServices?: boolean;
  strengthAreas: string[];
  limitations?: string[];
}

/**
 * Strategy performance metrics
 */
export interface IStrategyMetrics {
  averageExecutionTime: number;
  successRate: number;
  averageConfidence: number;
  memoryEfficiency: number;
  totalExecutions: number;
  lastUsed?: Date;
}

/**
 * Reasoning Strategy Interface
 * 
 * Defines the contract for all analysis strategies in the system.
 * Strategies implement different approaches to code analysis based on
 * context, constraints, and requirements.
 */
export interface IReasoningStrategy {
  /**
   * Strategy identification and metadata
   */
  readonly name: string;
  readonly version: string;
  readonly capabilities: IStrategyCapabilities;

  /**
   * Execute analysis using this strategy
   * 
   * @param context - Analysis context with files, query, and constraints
   * @returns Promise resolving to analysis result
   */
  analyze(context: IAnalysisContext): Promise<IAnalysisResult>;

  /**
   * Check if this strategy can handle the given context
   * 
   * @param context - Analysis context to evaluate
   * @returns Suitability score (0-1, higher is better)
   */
  canHandle(context: IAnalysisContext): Promise<number>;

  /**
   * Estimate resource requirements for the given context
   * 
   * @param context - Analysis context to evaluate
   * @returns Estimated time (ms) and memory (bytes) requirements
   */
  estimateResources(context: IAnalysisContext): Promise<{
    estimatedTime: number;
    estimatedMemory: number;
    confidence: number;
  }>;

  /**
   * Get current strategy metrics
   */
  getMetrics(): IStrategyMetrics;

  /**
   * Update strategy configuration
   * 
   * @param config - Strategy-specific configuration
   */
  configure(config: Record<string, any>): void;

  /**
   * Prepare strategy for execution (optional)
   * Called before analyze() to allow for setup
   */
  prepare?(context: IAnalysisContext): Promise<void>;

  /**
   * Cleanup after execution (optional)
   * Called after analyze() to allow for cleanup
   */
  cleanup?(): Promise<void>;
}

/**
 * Strategy selector interface for choosing optimal strategies
 */
export interface IStrategySelector {
  /**
   * Select the best strategy for the given context
   * 
   * @param context - Analysis context
   * @param availableStrategies - Available strategies to choose from
   * @returns Selected strategy or null if none suitable
   */
  selectStrategy(
    context: IAnalysisContext,
    availableStrategies: IReasoningStrategy[]
  ): Promise<IReasoningStrategy | null>;

  /**
   * Rank strategies by suitability for the given context
   * 
   * @param context - Analysis context
   * @param availableStrategies - Available strategies to rank
   * @returns Strategies ranked by suitability (best first)
   */
  rankStrategies(
    context: IAnalysisContext,
    availableStrategies: IReasoningStrategy[]
  ): Promise<Array<{ strategy: IReasoningStrategy; score: number }>>;
}

/**
 * Analysis types enumeration
 */
export enum AnalysisType {
  QUICK_SCAN = 'quick_scan',
  DEEP_ANALYSIS = 'deep_analysis',
  PERFORMANCE_ANALYSIS = 'performance_analysis',
  SECURITY_ANALYSIS = 'security_analysis',
  CROSS_SYSTEM_ANALYSIS = 'cross_system_analysis',
  EXECUTION_TRACE = 'execution_trace',
  HYPOTHESIS_TEST = 'hypothesis_test',
  CODE_QUALITY = 'code_quality',
  ARCHITECTURE_REVIEW = 'architecture_review',
  DOCUMENTATION_ANALYSIS = 'documentation_analysis',
}

/**
 * Base strategy abstract class providing common functionality
 */
export abstract class BaseReasoningStrategy implements IReasoningStrategy {
  protected metrics: IStrategyMetrics = {
    averageExecutionTime: 0,
    successRate: 0,
    averageConfidence: 0,
    memoryEfficiency: 0,
    totalExecutions: 0,
  };

  protected configuration: Record<string, any> = {};

  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly capabilities: IStrategyCapabilities;

  abstract analyze(context: IAnalysisContext): Promise<IAnalysisResult>;
  abstract canHandle(context: IAnalysisContext): Promise<number>;

  async estimateResources(context: IAnalysisContext): Promise<{
    estimatedTime: number;
    estimatedMemory: number;
    confidence: number;
  }> {
    // Default implementation based on file count and historical metrics
    const fileCount = context.files.length;
    const baseTime = this.metrics.averageExecutionTime || 5000;
    const baseMemory = 50 * 1024 * 1024; // 50MB base

    return {
      estimatedTime: Math.max(baseTime * Math.log(fileCount + 1), 1000),
      estimatedMemory: baseMemory * Math.log(fileCount + 1),
      confidence: this.metrics.totalExecutions > 0 ? 0.8 : 0.5,
    };
  }

  getMetrics(): IStrategyMetrics {
    return { ...this.metrics };
  }

  configure(config: Record<string, any>): void {
    this.configuration = { ...this.configuration, ...config };
  }

  /**
   * Update metrics after execution
   */
  protected updateMetrics(result: IAnalysisResult): void {
    const totalExec = this.metrics.totalExecutions;
    
    // Update averages using incremental calculation
    this.metrics.averageExecutionTime = 
      (this.metrics.averageExecutionTime * totalExec + result.executionTime) / (totalExec + 1);
    
    this.metrics.averageConfidence = 
      (this.metrics.averageConfidence * totalExec + result.confidence) / (totalExec + 1);
    
    this.metrics.successRate = 
      (this.metrics.successRate * totalExec + (result.success ? 1 : 0)) / (totalExec + 1);
    
    this.metrics.memoryEfficiency = 
      (this.metrics.memoryEfficiency * totalExec + (1 / (result.memoryUsed + 1))) / (totalExec + 1);
    
    this.metrics.totalExecutions++;
    this.metrics.lastUsed = new Date();
  }

  /**
   * Helper method to create analysis result
   */
  protected createResult(
    success: boolean,
    analysis: string,
    confidence: number,
    executionTime: number,
    memoryUsed: number,
    metadata?: Record<string, any>
  ): IAnalysisResult {
    const result: IAnalysisResult = {
      success,
      analysis,
      confidence,
      executionTime,
      memoryUsed,
      strategy: this.name,
      metadata,
    };

    this.updateMetrics(result);
    return result;
  }
}