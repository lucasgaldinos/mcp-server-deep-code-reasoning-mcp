/**
 * @fileoverview Tests for Reasoning Strategies
 */

import { vi, describe, it, expect, beforeEach, type Mock, type MockedFunction } from 'vitest';
import { 
  IAnalysisContext, 
  AnalysisType,
  BaseReasoningStrategy 
} from '../strategies/reasoning-strategy.js';
import { DeepAnalysisStrategy } from '../strategies/deep-analysis-strategy.js';
import { QuickAnalysisStrategy } from '../strategies/quick-analysis-strategy.js';
import { EnvironmentValidator } from '../utils/environment-validator.js';

// Mock dependencies
vi.mock('../utils/environment-validator.js', () => ({
  EnvironmentValidator: {
    getValidatedConfig: vi.fn()
  }
}));
vi.mock('@google/generative-ai');

// Access the mocked EnvironmentValidator
const mockEnvironmentValidator = vi.mocked(EnvironmentValidator);

// Mock GoogleGenerativeAI
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn().mockReturnValue({
  generateContent: mockGenerateContent,
});
const MockGoogleGenerativeAI = vi.fn().mockImplementation(() => ({
  getGenerativeModel: mockGetGenerativeModel,
}));

// Mock the module
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: MockGoogleGenerativeAI,
}));

describe('BaseReasoningStrategy', () => {
  // Create a concrete implementation for testing
  class TestStrategy extends BaseReasoningStrategy {
    readonly name = 'TestStrategy';
    readonly version = '1.0.0';
    readonly capabilities = {
      name: 'TestStrategy',
      description: 'Test strategy',
      supportedAnalysisTypes: [AnalysisType.QUICK_SCAN],
      strengthAreas: ['testing'],
    };

    async analyze(context: IAnalysisContext) {
      return this.createResult(
        true,
        'Test analysis result',
        0.8,
        1000,
        1024,
        { test: true }
      );
    }

    async canHandle(context: IAnalysisContext) {
      return 0.7;
    }
  }

  let strategy: TestStrategy;

  beforeEach(() => {
    strategy = new TestStrategy();
  });

  describe('metrics management', () => {
    it('should initialize with default metrics', () => {
      const metrics = strategy.getMetrics();
      
      expect(metrics.averageExecutionTime).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.averageConfidence).toBe(0);
      expect(metrics.memoryEfficiency).toBe(0);
      expect(metrics.totalExecutions).toBe(0);
    });

    it('should update metrics after analysis', async () => {
      const context: IAnalysisContext = {
        files: ['test.ts'],
        query: 'Test query',
      };

      await strategy.analyze(context);
      
      const metrics = strategy.getMetrics();
      expect(metrics.totalExecutions).toBe(1);
      expect(metrics.averageExecutionTime).toBe(1000);
      expect(metrics.averageConfidence).toBe(0.8);
      expect(metrics.successRate).toBe(1);
      expect(metrics.lastUsed).toBeDefined();
    });

    it('should calculate rolling averages correctly', async () => {
      const context: IAnalysisContext = {
        files: ['test.ts'],
        query: 'Test query',
      };

      // First analysis
      await strategy.analyze(context);
      
      // Second analysis with different metrics
      strategy['createResult'] = vi.fn().mockReturnValue({
        success: true,
        analysis: 'Second result',
        confidence: 0.6,
        executionTime: 2000,
        memoryUsed: 2048,
        strategy: 'TestStrategy',
      });

      await strategy.analyze(context);
      
      const metrics = strategy.getMetrics();
      expect(metrics.totalExecutions).toBe(2);
      expect(metrics.averageExecutionTime).toBe(1500); // (1000 + 2000) / 2
      expect(metrics.averageConfidence).toBe(0.7); // (0.8 + 0.6) / 2
    });
  });

  describe('configuration management', () => {
    it('should configure strategy', () => {
      const config = { temperature: 0.5, maxTokens: 1000 };
      strategy.configure(config);
      
      expect(strategy['configuration']).toEqual(config);
    });

    it('should merge configuration values', () => {
      strategy.configure({ temperature: 0.5 });
      strategy.configure({ maxTokens: 1000 });
      
      expect(strategy['configuration']).toEqual({
        temperature: 0.5,
        maxTokens: 1000,
      });
    });
  });

  describe('resource estimation', () => {
    it('should provide default resource estimates', async () => {
      const context: IAnalysisContext = {
        files: ['test1.ts', 'test2.ts', 'test3.ts'],
        query: 'Test query',
      };

      const estimate = await strategy.estimateResources(context);
      
      expect(estimate.estimatedTime).toBeGreaterThan(0);
      expect(estimate.estimatedMemory).toBeGreaterThan(0);
      expect(estimate.confidence).toBeGreaterThan(0);
      expect(estimate.confidence).toBeLessThanOrEqual(1);
    });

    it('should scale estimates with file count', async () => {
      const smallContext: IAnalysisContext = {
        files: ['test1.ts'],
        query: 'Test query',
      };

      const largeContext: IAnalysisContext = {
        files: ['test1.ts', 'test2.ts', 'test3.ts', 'test4.ts', 'test5.ts'],
        query: 'Test query',
      };

      const smallEstimate = await strategy.estimateResources(smallContext);
      const largeEstimate = await strategy.estimateResources(largeContext);
      
      expect(largeEstimate.estimatedTime).toBeGreaterThan(smallEstimate.estimatedTime);
      expect(largeEstimate.estimatedMemory).toBeGreaterThan(smallEstimate.estimatedMemory);
    });
  });
});

describe('DeepAnalysisStrategy', () => {
  let strategy: DeepAnalysisStrategy;

  beforeEach(() => {
    strategy = new DeepAnalysisStrategy();
    
    // Mock environment configuration
    mockEnvironmentValidator.getValidatedConfig.mockReturnValue({
      geminiApiKey: 'test-api-key',
      geminiModel: 'gemini-2.5-flash',
      geminiTemperature: 0.2,
      geminiTopK: 1,
      geminiTopP: 1,
      geminiMaxOutputTokens: 8192,
      geminiApiVersion: 'v1beta',
    } as any);

    // Mock Gemini API response
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'Deep analysis result from Gemini',
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('strategy properties', () => {
    it('should have correct name and version', () => {
      expect(strategy.name).toBe('DeepAnalysisStrategy');
      expect(strategy.version).toBe('1.0.0');
    });

    it('should have appropriate capabilities', () => {
      const caps = strategy.capabilities;
      
      expect(caps.name).toBe('DeepAnalysisStrategy');
      expect(caps.supportedAnalysisTypes).toContain(AnalysisType.DEEP_ANALYSIS);
      expect(caps.supportedAnalysisTypes).toContain(AnalysisType.CROSS_SYSTEM_ANALYSIS);
      expect(caps.minimumTimeConstraint).toBe(30000);
      expect(caps.requiresExternalServices).toBe(true);
    });
  });

  describe('can handle assessment', () => {
    it('should handle deep analysis queries well', async () => {
      const context: IAnalysisContext = {
        files: ['test1.ts', 'test2.ts'],
        query: 'Perform deep analysis of the architecture',
        timeConstraint: 60000,
      };

      const suitability = await strategy.canHandle(context);
      expect(suitability).toBeGreaterThan(0.6);
    });

    it('should score lower for speed-prioritized contexts', async () => {
      const context: IAnalysisContext = {
        files: ['test1.ts'],
        query: 'Quick scan',
        prioritizeSpeed: true,
      };

      const suitability = await strategy.canHandle(context);
      expect(suitability).toBe(0.4);
    });

    it('should score lower for too many files', async () => {
      const manyFiles = Array(60).fill(0).map((_, i) => `test${i}.ts`);
      const context: IAnalysisContext = {
        files: manyFiles,
        query: 'Deep analysis',
      };

      const suitability = await strategy.canHandle(context);
      expect(suitability).toBe(0.2);
    });

    it('should score lower for insufficient time', async () => {
      const context: IAnalysisContext = {
        files: ['test1.ts'],
        query: 'Deep analysis',
        timeConstraint: 10000, // Less than minimum
      };

      const suitability = await strategy.canHandle(context);
      expect(suitability).toBe(0.3);
    });
  });

  describe('analysis execution', () => {
    it('should perform successful analysis', async () => {
      const context: IAnalysisContext = {
        files: ['test1.ts', 'test2.ts'],
        query: 'Analyze the code architecture',
        correlationId: 'test-correlation-id',
      };

      const result = await strategy.analyze(context);
      
      expect(result.success).toBe(true);
      expect(result.analysis).toContain('Deep analysis result from Gemini');
      expect(result.confidence).toBe(0.9);
      expect(result.strategy).toBe('DeepAnalysisStrategy');
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.metadata?.analysisType).toBe('deep');
    });

    it('should handle analysis errors gracefully', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const context: IAnalysisContext = {
        files: ['test1.ts'],
        query: 'Analyze the code',
      };

      const result = await strategy.analyze(context);
      
      expect(result.success).toBe(false);
      expect(result.analysis).toContain('Deep analysis failed: API Error');
      expect(result.confidence).toBe(0.1);
    });

    it('should reject unsuitable contexts', async () => {
      const context: IAnalysisContext = {
        files: Array(60).fill(0).map((_, i) => `test${i}.ts`), // Too many files
        query: 'Analyze',
      };

      const result = await strategy.analyze(context);
      
      expect(result.success).toBe(false);
      expect(result.analysis).toContain('Context not suitable for deep analysis strategy');
    });
  });

  describe('preparation and cleanup', () => {
    it('should prepare strategy successfully', async () => {
      const context: IAnalysisContext = {
        files: ['test1.ts'],
        query: 'Test query',
        correlationId: 'test-id',
      };

      await expect(strategy.prepare!(context)).resolves.not.toThrow();
      expect(mockGetGenerativeModel).toHaveBeenCalled();
    });

    it('should cleanup successfully', async () => {
      await expect(strategy.cleanup!()).resolves.not.toThrow();
    });
  });
});

describe('QuickAnalysisStrategy', () => {
  let strategy: QuickAnalysisStrategy;

  beforeEach(() => {
    strategy = new QuickAnalysisStrategy();
    
    // Mock environment configuration
    mockEnvironmentValidator.getValidatedConfig.mockReturnValue({
      geminiApiKey: 'test-api-key',
      geminiModel: 'gemini-2.5-flash',
      geminiTemperature: 0.1,
      geminiTopK: 1,
      geminiTopP: 0.8,
      geminiMaxOutputTokens: 2048,
      geminiApiVersion: 'v1beta',
    } as any);

    // Mock Gemini API response
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'Quick analysis result from Gemini',
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('strategy properties', () => {
    it('should have correct name and version', () => {
      expect(strategy.name).toBe('QuickAnalysisStrategy');
      expect(strategy.version).toBe('1.0.0');
    });

    it('should have appropriate capabilities', () => {
      const caps = strategy.capabilities;
      
      expect(caps.name).toBe('QuickAnalysisStrategy');
      expect(caps.supportedAnalysisTypes).toContain(AnalysisType.QUICK_SCAN);
      expect(caps.minimumTimeConstraint).toBe(5000);
      expect(caps.maximumFileCount).toBe(10);
      expect(caps.requiresExternalServices).toBe(true);
    });
  });

  describe('can handle assessment', () => {
    it('should prioritize speed-focused contexts', async () => {
      const context: IAnalysisContext = {
        files: ['test1.ts'],
        query: 'Quick scan',
        prioritizeSpeed: true,
      };

      const suitability = await strategy.canHandle(context);
      expect(suitability).toBe(0.9);
    });

    it('should handle tight time constraints well', async () => {
      const context: IAnalysisContext = {
        files: ['test1.ts'],
        query: 'Quick analysis',
        timeConstraint: 10000,
      };

      const suitability = await strategy.canHandle(context);
      expect(suitability).toBe(0.8);
    });

    it('should reject too many files', async () => {
      const context: IAnalysisContext = {
        files: Array(15).fill(0).map((_, i) => `test${i}.ts`),
        query: 'Quick scan',
      };

      const suitability = await strategy.canHandle(context);
      expect(suitability).toBe(0.1);
    });
  });

  describe('analysis execution', () => {
    it('should perform successful quick analysis', async () => {
      const context: IAnalysisContext = {
        files: ['test1.ts', 'test2.ts'],
        query: 'Quick code scan',
        correlationId: 'test-correlation-id',
      };

      const result = await strategy.analyze(context);
      
      expect(result.success).toBe(true);
      expect(result.analysis).toContain('Quick analysis result from Gemini');
      expect(result.confidence).toBe(0.7);
      expect(result.strategy).toBe('QuickAnalysisStrategy');
      expect(result.metadata?.analysisType).toBe('quick');
    });

    it('should limit file processing for speed', async () => {
      const context: IAnalysisContext = {
        files: Array(8).fill(0).map((_, i) => `test${i}.ts`),
        query: 'Quick scan',
      };

      const result = await strategy.analyze(context);
      
      expect(result.success).toBe(true);
      // Should process successfully even with multiple files (limited internally)
    });

    it('should handle errors gracefully', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Quick analysis failed'));

      const context: IAnalysisContext = {
        files: ['test1.ts'],
        query: 'Quick scan',
      };

      const result = await strategy.analyze(context);
      
      expect(result.success).toBe(false);
      expect(result.analysis).toContain('Quick analysis failed');
    });
  });

  describe('resource estimation', () => {
    it('should provide optimistic estimates for quick analysis', async () => {
      const context: IAnalysisContext = {
        files: ['test1.ts', 'test2.ts'],
        query: 'Quick scan',
      };

      const estimate = await strategy.estimateResources(context);
      
      expect(estimate.estimatedTime).toBeLessThan(10000); // Should be fast
      expect(estimate.estimatedMemory).toBe(25 * 1024 * 1024); // 25MB
      expect(estimate.confidence).toBe(0.9); // High confidence
    });

    it('should cap time estimates reasonably', async () => {
      const context: IAnalysisContext = {
        files: Array(5).fill(0).map((_, i) => `test${i}.ts`),
        query: 'Quick scan',
      };

      const estimate = await strategy.estimateResources(context);
      
      expect(estimate.estimatedTime).toBeGreaterThan(1000); // At least 1 second
      expect(estimate.estimatedTime).toBeLessThan(10000); // But reasonable for quick
    });
  });
});
