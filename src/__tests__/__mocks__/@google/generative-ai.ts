/**
 * Manual mock for @google/generative-ai
 * This provides a complete mock of the Google Generative AI library for testing
 */

import { jest } from '@jest/globals';

export class GoogleGenerativeAI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  getGenerativeModel(config: any) {
    return {
      generateContent: (jest.fn() as any).mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            status: "success",
            analysis: "Mock analysis result",
            suggestions: ["Mock suggestion 1", "Mock suggestion 2"],
            findings: {
              rootCauses: [{
                type: "performance",
                description: "Mock performance issue",
                confidence: 0.85,
                evidence: ["Mock evidence"]
              }],
              performanceBottlenecks: [{
                location: "mock.ts:10",
                severity: "high",
                description: "Mock bottleneck"
              }]
            },
            recommendations: {
              immediateActions: ["Mock action 1", "Mock action 2"],
              longerTermImprovements: ["Mock improvement 1"]
            }
          })
        }
      })
    };
  }
}

// Default export for ES modules
export default GoogleGenerativeAI;