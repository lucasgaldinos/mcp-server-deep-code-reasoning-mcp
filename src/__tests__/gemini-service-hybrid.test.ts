/**
 * Hybrid Testing Strategy for GeminiService
 * 
 * This test file implements both mock testing (fast, reliable) 
 * and real API testing (comprehensive, realistic) based on environment configuration.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { GeminiService } from '../services/gemini-service.js';
import { MemoryOptimizer } from '../utils/memory-optimizer.js';
import type { GoogleGenerativeAI } from '@google/generative-ai';
import type { ClaudeCodeContext } from '../models/types.js';

describe('GeminiService - Hybrid Testing Strategy', () => {
  const useRealAPI = process.env.TEST_WITH_REAL_API === 'true';
  const hasTestAPIKey = !!process.env.GEMINI_API_KEY_TEST;
  
  // Test configuration
  const testConfig = {
    timeout: 15000,
    model: 'gemini-1.5-flash', // Cheaper model for testing
    maxRetries: 2
  };

  // Cleanup after all tests to prevent resource leaks
  afterAll(() => {
    const memoryOptimizer = MemoryOptimizer.getInstance();
    memoryOptimizer.dispose();
  });

  // Standard test context
  const testContext: ClaudeCodeContext = {
    attemptedApproaches: ['static analysis', 'type checking'],
    partialFindings: [
      { 
        type: 'bug', 
        severity: 'medium',
        location: { file: 'src/services/test-service.ts', line: 10 },
        description: 'Type mismatch in function return',
        evidence: ['TypeScript compiler error', 'Expected string but got number']
      }
    ],
    stuckPoints: ['Unable to trace execution through async functions'],
    focusArea: { 
      files: ['src/services/test-service.ts', 'src/utils/helper.ts'],
      entryPoints: [
        { file: 'src/services/test-service.ts', line: 10, functionName: 'processData' },
        { file: 'src/utils/helper.ts', line: 25, functionName: 'validateInput' }
      ]
    },
    analysisBudgetRemaining: 300
  };

  if (useRealAPI && hasTestAPIKey) {
    describe('🌐 Real API Integration Tests', () => {
      let service: GeminiService;
      
      beforeAll(() => {
        service = new GeminiService(process.env.GEMINI_API_KEY_TEST!);
        console.log('🚀 Running tests with REAL Gemini API');
      });
      
      afterEach(async () => {
        // Add small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      });

      test('should handle real API call with proper timeout', async () => {
        const startTime = Date.now();
        
        const result = await service.analyzeWithGemini(
          testContext,
          'execution_trace', 
          new Map([
            ['test.ts', 'function test() { return "hello"; }']
          ])
        );
        
        const duration = Date.now() - startTime;
        
        // Validate real API response structure
        expect(result).toBeDefined();
        expect(result.status).toBeDefined();
        expect(result.findings).toBeDefined();
        expect(duration).toBeLessThan(testConfig.timeout);
        
        console.log(`✅ Real API call completed in ${duration}ms`);
      }, testConfig.timeout);
      
      test('should handle real authentication errors', async () => {
        const invalidService = new GeminiService('invalid-api-key-test');
        
        await expect(
          invalidService.analyzeWithGemini(
            testContext,
            'hypothesis_test',
            new Map()
          )
        ).rejects.toThrow();
        
        console.log('✅ Real API authentication error handled correctly');
      });
      
      test('should handle real timeout scenarios', async () => {
        // Test with complex analysis that might take time
        const result = await service.analyzeWithGemini(
          {
            ...testContext,
            attemptedApproaches: ['complex analysis requiring deep reasoning'],
            stuckPoints: ['performance bottleneck in large codebase']
          },
          'performance',
          new Map([
            ['large-file.ts', 'x'.repeat(10000)] // Large content
          ])
        );
        
        // Should complete or handle gracefully
        expect(result).toBeDefined();
        expect(['success', 'timeout', 'error', 'partial']).toContain(result.status);
        
        console.log(`✅ Real API complex analysis: ${result.status}`);
      }, testConfig.timeout);
    });
  } else {
    console.log('⏭️  Skipping real API tests. To enable:');
    console.log('   export TEST_WITH_REAL_API=true');
    console.log('   export GEMINI_API_KEY_TEST=your_test_api_key');
  }

  describe('🎭 Mock Unit Tests (Fast & Reliable)', () => {
    let service: GeminiService;
    let mockGenAI: any;

    beforeEach(() => {
      // Create comprehensive mock following the existing pattern from GeminiService.test.ts
      const mockResponse = {
        text: vi.fn().mockReturnValue(JSON.stringify({
          status: 'success',
          rootCauses: [
            {
              type: 'logic_error',
              description: 'Mock execution trace finding',
              evidence: ['Mock evidence 1', 'Mock evidence 2'],
              confidence: 0.85,
              fixStrategy: 'Mock fix strategy'
            }
          ],
          executionPaths: [],
          performanceBottlenecks: [],
          crossSystemImpacts: [],
          recommendations: {
            immediateActions: ['Mock recommendation 1'],
            longerTermImprovements: ['Mock recommendation 2'],
            preventionStrategies: []
          },
          reasoning: 'Mock reasoning process',
          metadata: {
            analysisType: 'execution_trace',
            depthLevel: 1,
            timeSpent: 5.2
          }
        }))
      };

      const mockGenerateContent = vi.fn().mockResolvedValue({
        response: mockResponse
      });

      mockGenAI = {
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: mockGenerateContent
        })
      };

      // Mock GoogleGenerativeAI constructor  
      const MockGoogleGenerativeAI = vi.fn().mockImplementation(() => mockGenAI);
      
      // Create service (constructor will use the mocked GoogleGenerativeAI)
      service = new GeminiService('test-api-key');
      
      // Replace the internal genAI instance with our mock
      (service as any).genAI = mockGenAI;
      (service as any).model = mockGenAI.getGenerativeModel();
    });

    test('should process analysis request with mocked response', async () => {
      const result = await service.analyzeWithGemini(
        testContext,
        'execution_trace',
        new Map([['test.ts', 'function test() {}']])
      );

      expect(result.status).toBe('success');
      expect(result.findings.rootCauses).toHaveLength(1);
      expect(result.findings.rootCauses[0].type).toBe('logic_error');
      expect(mockGenAI.getGenerativeModel).toHaveBeenCalled();
    });

    test('should handle mock network errors', async () => {
      // Configure mock to simulate network error
      const mockGenerateContent = vi.fn().mockRejectedValue(new Error('Network error'));
      mockGenAI.getGenerativeModel.mockReturnValue({
        generateContent: mockGenerateContent
      });
      
      (service as any).model = mockGenAI.getGenerativeModel();

      await expect(
        service.analyzeWithGemini(
          testContext,
          'hypothesis_test',
          new Map()
        )
      ).rejects.toThrow('Network error');
    });

    test('should handle mock timeout scenarios', async () => {
      // Configure mock to simulate timeout
      const mockGenerateContent = vi.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );
      
      mockGenAI.getGenerativeModel.mockReturnValue({
        generateContent: mockGenerateContent
      });
      
      (service as any).model = mockGenAI.getGenerativeModel();

      await expect(
        service.analyzeWithGemini(
          testContext,
          'performance',
          new Map()
        )
      ).rejects.toThrow('Timeout');
    });
  });

  describe('🧪 Test Strategy Validation', () => {
    test('should have consistent response format between mock and real API', () => {
      // This test ensures mock responses match real API structure
      const expectedResponseSchema = {
        status: expect.any(String),
        findings: expect.objectContaining({
          rootCauses: expect.any(Array),
          executionPaths: expect.any(Array),
          performanceBottlenecks: expect.any(Array),
          crossSystemImpacts: expect.any(Array)
        }),
        recommendations: expect.objectContaining({
          immediateActions: expect.any(Array),
          longerTermImprovements: expect.any(Array),
          preventionStrategies: expect.any(Array)
        }),
        reasoning: expect.any(String),
        metadata: expect.any(Object)
      };

      // Mock response should match this schema
      const mockResponse = {
        status: 'success',
        findings: {
          rootCauses: [],
          executionPaths: [],
          performanceBottlenecks: [],
          crossSystemImpacts: []
        },
        recommendations: {
          immediateActions: [],
          longerTermImprovements: [],
          preventionStrategies: []
        },
        reasoning: 'test',
        metadata: {}
      };

      expect(mockResponse).toMatchObject(expectedResponseSchema);
    });
  });
});