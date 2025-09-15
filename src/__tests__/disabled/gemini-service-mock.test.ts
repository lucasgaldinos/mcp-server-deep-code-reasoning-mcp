import { describe, it, expect, beforeEach, vi } from 'vitest';

// Enable manual mock
vi.mock('@google/generative-ai');

// Import service AFTER mocking
import { GeminiService } from '../services/gemini-service.js';
import type { ClaudeCodeContext } from '../models/types.js';

describe('GeminiService - Manual Mock Verification', () => {
  let geminiService: GeminiService;

  beforeEach(() => {
    // Create service with test API key
    geminiService = new GeminiService('test-api-key-manual-mock');
  });

  it('should use manual mock and not make real API calls', async () => {
    // Arrange
    const context: ClaudeCodeContext = {
      attemptedApproaches: ['manual mock test'],
      partialFindings: [],
      stuckPoints: ['testing manual mocks'],
      focusArea: { files: ['test.ts'], entryPoints: [] },
      analysisBudgetRemaining: 30,
    };

    // Act
    const result = await geminiService.analyzeWithGemini(context, 'execution_trace', new Map());

    // Assert - Should use mock response
    expect(result.status).toBe('success');
    expect(result.analysis).toBe('Mock analysis result');
    expect(result.suggestions).toEqual(['Mock suggestion 1', 'Mock suggestion 2']);
    
    console.log('Manual mock test result:', { 
      status: result.status, 
      analysis: result.analysis,
      mockWorking: result.analysis === 'Mock analysis result'
    });
  });

  it('should verify environment is correctly set in tests', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.GEMINI_API_KEY).toBe('test-gemini-api-key-mock-12345');
  });
});