/**
 * @fileoverview Strategy Manager Integration Test
 *
 * This test validates that the strategy pattern implementation is working
 * correctly and integrates properly with the DeepCodeReasonerV2.
 */

import { StrategyManager } from '../strategies/strategy-manager.js';
import { DeepCodeReasonerV2 } from '../analyzers/DeepCodeReasonerV2.js';
import type { IAnalysisContext } from '../strategies/reasoning-strategy.js';

describe('Strategy Integration', () => {
  let strategyManager: StrategyManager;
  let reasoner: DeepCodeReasonerV2;

  beforeEach(() => {
    strategyManager = new StrategyManager();
    // Use a fake API key for testing
    reasoner = new DeepCodeReasonerV2('fake-api-key-for-testing');
  });

  describe('StrategyManager', () => {
    it('should initialize with available strategies', () => {
      const strategies = strategyManager.getAvailableStrategies();
      expect(strategies).toContain('DeepAnalysisStrategy');
      expect(strategies).toContain('QuickAnalysisStrategy');
    });

    it('should select appropriate strategy for quick analysis', async () => {
      const context: IAnalysisContext = {
        files: ['test.ts'],
        query: 'quick check of this function',
        prioritizeSpeed: true,
      };

      const strategy = await strategyManager.selectStrategy(context);
      expect(strategy.name).toBe('QuickAnalysisStrategy');
    });

    it('should select appropriate strategy for deep analysis', async () => {
      const context: IAnalysisContext = {
        files: ['file1.ts', 'file2.ts', 'file3.ts', 'file4.ts', 'file5.ts'],
        query: 'comprehensive analysis of system architecture',
        prioritizeSpeed: false,
      };

      const strategy = await strategyManager.selectStrategy(context);
      expect(strategy.name).toBe('DeepAnalysisStrategy');
    });

    it('should execute analysis with fallback behavior', async () => {
      const context: IAnalysisContext = {
        files: ['test.ts'],
        query: 'test analysis',
      };

      const result = await strategyManager.analyzeWithBestStrategy(context);
      
      // Should not crash and return a valid result
      expect(result).toBeDefined();
      expect(result.strategy).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.confidence).toBe('number');
      expect(typeof result.executionTime).toBe('number');
    });
  });

  describe('DeepCodeReasonerV2 Strategy Integration', () => {
    it('should have strategy manager available', () => {
      expect(reasoner).toBeDefined();
      // Access private property for testing
      expect((reasoner as any).strategyManager).toBeDefined();
    });

    it('should execute strategy-based analysis', async () => {
      const result = await reasoner.analyzeWithStrategy(
        ['test.ts'],
        'analyze this code',
        { prioritizeSpeed: true }
      );

      expect(result).toBeDefined();
      expect(result.strategy).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.confidence).toBe('number');
    });

    it('should handle different analysis options', async () => {
      const result = await reasoner.analyzeWithStrategy(
        ['file1.ts', 'file2.ts'],
        'comprehensive system analysis',
        {
          prioritizeSpeed: false,
          includePerformanceAnalysis: true,
          enableCrossSystemAnalysis: true,
          timeConstraint: 60000,
        }
      );

      expect(result).toBeDefined();
      expect(result.strategy).toBeDefined();
    });
  });

  describe('Strategy Metrics', () => {
    it('should track strategy metrics', () => {
      const metrics = strategyManager.getAllStrategyMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics['DeepAnalysisStrategy']).toBeDefined();
      expect(metrics['QuickAnalysisStrategy']).toBeDefined();
      
      // Each strategy should have basic metrics
      for (const strategyName of Object.keys(metrics)) {
        const strategyMetrics = metrics[strategyName];
        expect(typeof strategyMetrics.averageExecutionTime).toBe('number');
        expect(typeof strategyMetrics.successRate).toBe('number');
        expect(typeof strategyMetrics.averageConfidence).toBe('number');
        expect(typeof strategyMetrics.totalExecutions).toBe('number');
      }
    });
  });
});
