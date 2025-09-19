/**
 * @fileoverview Strategy Manager for coordinating analysis strategies
 *
 * This module manages the selection and execution of different reasoning
 * strategies based on the analysis context and requirements.
 *
 * @author Deep Code Reasoning MCP Server
 * @version 1.0.0
 * @since 2025-01-09
 */

import { IReasoningStrategy, IAnalysisContext, IAnalysisResult } from './reasoning-strategy.js';
import { DeepAnalysisStrategy } from './deep-analysis-strategy.js';
import { QuickAnalysisStrategy } from './quick-analysis-strategy.js';
import { createLogger } from '@utils/structured-logger.js';

/**
 * Strategy manager for coordinating analysis approaches
 */
export class StrategyManager {
  private strategies: Map<string, IReasoningStrategy> = new Map();
  private logger = createLogger('StrategyManager');

  constructor() {
    this.initializeStrategies();
  }

  /**
   * Initialize available strategies
   */
  private initializeStrategies(): void {
    const deepStrategy = new DeepAnalysisStrategy();
    const quickStrategy = new QuickAnalysisStrategy();

    this.strategies.set(deepStrategy.name, deepStrategy);
    this.strategies.set(quickStrategy.name, quickStrategy);

    this.logger.info('Strategy manager initialized', {
      strategies: Array.from(this.strategies.keys()),
    });
  }

  /**
   * Select the best strategy for the given context
   */
  async selectStrategy(context: IAnalysisContext): Promise<IReasoningStrategy> {
    this.logger.debug('Selecting strategy for context', {
      query: context.query,
      fileCount: context.files.length,
      timeConstraint: context.timeConstraint,
      prioritizeSpeed: context.prioritizeSpeed,
    });

    let bestStrategy: IReasoningStrategy | null = null;
    let bestScore = 0;

    // Evaluate each strategy's suitability
    for (const [name, strategy] of this.strategies) {
      try {
        const score = await strategy.canHandle(context);
        this.logger.debug('Strategy suitability score', {
          strategy: name,
          score,
        });

        if (score > bestScore) {
          bestScore = score;
          bestStrategy = strategy;
        }
      } catch (error) {
        this.logger.warn('Strategy evaluation failed', {
          strategy: name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (!bestStrategy) {
      // Fallback to quick strategy if no strategy is suitable
      bestStrategy = this.strategies.get('QuickAnalysisStrategy')!;
      this.logger.warn('No suitable strategy found, falling back to quick analysis');
    }

    this.logger.info('Strategy selected', {
      strategy: bestStrategy.name,
      score: bestScore,
    });

    return bestStrategy;
  }

  /**
   * Execute analysis using the best strategy for the context
   */
  async analyzeWithBestStrategy(context: IAnalysisContext): Promise<IAnalysisResult> {
    const strategy = await this.selectStrategy(context);

    this.logger.info('Executing analysis with strategy', {
      strategy: strategy.name,
      correlationId: context.correlationId,
    });

    try {
      // Prepare strategy if needed
      if (strategy.prepare) {
        await strategy.prepare(context);
      }

      // Execute analysis
      const result = await strategy.analyze(context);

      // Cleanup if needed
      if (strategy.cleanup) {
        await strategy.cleanup();
      }

      this.logger.info('Analysis completed successfully', {
        strategy: strategy.name,
        success: result.success,
        confidence: result.confidence,
        executionTime: result.executionTime,
        correlationId: context.correlationId,
      });

      return result;
    } catch (error) {
      this.logger.error('Strategy execution failed', {
        strategy: strategy.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: context.correlationId,
      });

      // Cleanup on error
      if (strategy.cleanup) {
        try {
          await strategy.cleanup();
        } catch (cleanupError) {
          this.logger.warn('Strategy cleanup failed', {
            strategy: strategy.name,
            error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
          });
        }
      }

      // Return error result
      return {
        success: false,
        analysis: `Strategy execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0.1,
        executionTime: 0,
        memoryUsed: 0,
        strategy: strategy.name,
        warnings: ['Strategy execution failed'],
      };
    }
  }

  /**
   * Get all available strategies
   */
  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Get strategy by name
   */
  getStrategy(name: string): IReasoningStrategy | undefined {
    return this.strategies.get(name);
  }

  /**
   * Get strategy metrics for all strategies
   */
  getAllStrategyMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};

    for (const [name, strategy] of this.strategies) {
      metrics[name] = strategy.getMetrics();
    }

    return metrics;
  }
}
