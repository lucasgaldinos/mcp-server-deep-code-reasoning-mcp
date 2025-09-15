import { describe, it, expect, vi } from 'vitest';
import { GeminiService } from '../services/gemini-service.js';
import type { ClaudeCodeContext } from '../models/types.js';

describe('GeminiService - Dependency Injection', () => {
  it('should work with injected mock dependency', async () => {
    // Create a mock GoogleGenerativeAI instance
    const mockGenAI = {
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: (vi.fn() as any).mockResolvedValue({
          response: {
            text: () => JSON.stringify({
              rootCauses: [{
                type: "performance",
                description: "DI mock root cause",
                evidence: ["test.ts:1"],
                confidence: 0.9,
                fixStrategy: "optimize"
              }],
              executionPaths: [{
                id: "path1",
                description: "DI mock path",
                criticalSteps: ["step1", "step2"],
                issues: []
              }],
              performanceBottlenecks: [{
                location: "test.ts:5",
                severity: "medium",
                description: "DI mock bottleneck",
                impact: "response time",
                suggestions: ["cache data"]
              }],
              systemImpacts: [],
              recommendations: {
                immediateActions: ["DI action 1", "DI action 2"],
                longerTermImprovements: ["DI improvement 1"]
              },
              status: "success",
              analysis: "DI mock analysis completed",
              suggestions: ["DI suggestion 1"]
            })
          }
        })
      })
    };

    // Inject the mock into the service
    const geminiService = new GeminiService('test-key', mockGenAI as any);

    // Test the service
    const context: ClaudeCodeContext = {
      attemptedApproaches: ['dependency injection test'],
      partialFindings: [],
      stuckPoints: ['testing DI'],
      focusArea: { files: ['test.ts'], entryPoints: [] },
      analysisBudgetRemaining: 30,
    };

    const result = await geminiService.analyzeWithGemini(context, 'execution_trace', new Map());

    // Verify the mock was used
    expect(result.status).toBe('success');
    expect(result.findings.rootCauses).toHaveLength(1);
    expect(result.findings.rootCauses[0].type).toBe('performance');
    expect(result.findings.rootCauses[0].description).toBe('DI mock root cause');
    expect(mockGenAI.getGenerativeModel).toHaveBeenCalled();
    
    console.log('✅ Dependency injection test passed!', {
      status: result.status,
      rootCausesCount: result.findings.rootCauses.length,
      mockCalled: mockGenAI.getGenerativeModel.mock.calls.length > 0,
      structure: Object.keys(result)
    });
  });
});