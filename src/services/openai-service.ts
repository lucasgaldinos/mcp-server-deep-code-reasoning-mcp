import { ApiError, RateLimitError } from '@errors/index.js';
import { ClaudeCodeContext, AnalysisResult } from '@models/types.js';
import { PromptSanitizer } from '@utils/prompt-sanitizer.js';
import { ApiProvider } from './api-manager.js';

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

/**
 * OpenAI Service Provider
 * 
 * Provides code analysis using OpenAI's GPT models as a fallback
 * when Gemini API is unavailable or has quota issues.
 */
export class OpenAIService implements ApiProvider {
  public readonly name = 'openai';
  public readonly priority = 2; // Second priority after Gemini
  
  private config: OpenAIConfig;
  private rateLimitRemaining = 1000;
  private rateLimitResetTime = new Date();
  private requestCount = 0;

  constructor(config: OpenAIConfig) {
    // Set defaults first, then override with config
    const defaults = {
      model: 'gpt-4-turbo-preview',
      maxTokens: 4000,
      temperature: 0.1,
      timeout: 30000
    };
    
    this.config = {
      ...defaults,
      ...config
    };
  }

  /**
   * Check if OpenAI service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Simple availability check - verify API key format
      if (!this.config.apiKey || !this.config.apiKey.startsWith('sk-')) {
        return false;
      }

      // Check if we've hit rate limits
      if (this.rateLimitRemaining <= 0 && new Date() < this.rateLimitResetTime) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('OpenAI availability check failed:', error);
      return false;
    }
  }

  /**
   * Analyze code using OpenAI GPT
   */
  async analyzeCode(context: ClaudeCodeContext, analysisType: string): Promise<AnalysisResult> {
    try {
      const startTime = Date.now();
      
      // Prepare the analysis prompt
      const prompt = this.buildAnalysisPrompt(context, analysisType);
      
      // Make API request to OpenAI
      const response = await this.makeOpenAIRequest(prompt);
      
      // Parse and validate response
      const analysisResult = this.parseAnalysisResponse(response, analysisType);
      
      const executionTime = Date.now() - startTime;
      
      return {
        ...analysisResult,
        executionTime,
        metadata: {
          ...analysisResult.metadata,
          provider: 'openai',
          model: this.config.model,
          promptTokens: this.estimateTokens(prompt),
          completionTokens: this.estimateTokens(response)
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle rate limiting
      if (errorMessage.includes('rate_limit_exceeded') || errorMessage.includes('429')) {
        this.rateLimitRemaining = 0;
        this.rateLimitResetTime = new Date(Date.now() + 60000); // Reset in 1 minute
        throw new RateLimitError(`OpenAI API rate limit exceeded: ${errorMessage}`, 'openai');
      }
      
      // Handle quota exceeded
      if (errorMessage.includes('quota_exceeded') || errorMessage.includes('insufficient_quota')) {
        throw new ApiError(`OpenAI quota exceeded: ${errorMessage}`, 'QUOTA_EXCEEDED', 'openai');
      }
      
      throw new ApiError(`OpenAI analysis failed: ${errorMessage}`, 'OPENAI_API_ERROR', 'openai');
    }
  }

  /**
   * Estimate cost for the analysis
   */
  estimateCost(context: ClaudeCodeContext): number {
    // OpenAI GPT-4 Turbo pricing (approximate)
    const inputTokens = this.estimateInputTokens(context);
    const outputTokens = 1000; // Estimated response size
    
    const inputCost = (inputTokens / 1000) * 0.01; // $0.01 per 1K input tokens
    const outputCost = (outputTokens / 1000) * 0.03; // $0.03 per 1K output tokens
    
    return inputCost + outputCost;
  }

  /**
   * Get current rate limit status
   */
  getRateLimit(): { remaining: number; resetTime: Date } {
    return {
      remaining: this.rateLimitRemaining,
      resetTime: this.rateLimitResetTime
    };
  }

  /**
   * Build analysis prompt for OpenAI
   */
  private buildAnalysisPrompt(context: ClaudeCodeContext, analysisType: string): string {
    const systemInstructions = `You are an expert code analyst. Analyze the provided code and context to give detailed insights.

Analysis Type: ${analysisType}

Attempted Approaches:
${context.attemptedApproaches.map(approach => `- ${approach}`).join('\n')}

Current Findings:
${context.partialFindings.map(finding => `- ${finding.description} (${finding.severity})`).join('\n')}

Stuck Points:
${context.stuckPoints.map(point => `- ${point}`).join('\n')}

Focus Area Files:
${context.focusArea.files.join(', ')}

Please provide a comprehensive analysis with:
1. Root cause identification
2. Specific recommendations
3. Code examples if applicable
4. Performance implications
5. Security considerations

Respond in JSON format with the following structure:
{
  "analysis": "detailed analysis text",
  "confidence": 0.0-1.0,
  "recommendations": ["rec1", "rec2"],
  "codeExamples": ["example1", "example2"],
  "performanceImpact": "description",
  "securityImplications": "description"
}`;

    return PromptSanitizer.createSafePrompt(systemInstructions, {
      focusAreaFiles: context.focusArea.files,
      analysisType,
      entryPoints: context.focusArea.entryPoints || []
    });
  }

  /**
   * Make HTTP request to OpenAI API
   */
  private async makeOpenAIRequest(prompt: string): Promise<string> {
    const url = `${this.config.baseUrl || 'https://api.openai.com/v1'}/chat/completions`;
    
    const requestBody = {
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert code analyst. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      response_format: { type: 'json_object' }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Update rate limit info from headers
      this.updateRateLimitFromHeaders(response.headers);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        const errorMessage = errorData?.error?.message || response.statusText;
        throw new Error(`HTTP ${response.status}: ${errorMessage}`);
      }

      const data = await response.json() as any;
      
      if (!data?.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from OpenAI API');
      }

      return data.choices[0].message.content;

    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parse OpenAI response into AnalysisResult
   */
  private parseAnalysisResponse(response: string, analysisType: string): AnalysisResult {
    try {
      const parsed = JSON.parse(response);
      
      return {
        success: true,
        analysis: parsed.analysis || 'Analysis completed successfully',
        confidence: parsed.confidence || 0.8,
        strategy: 'OpenAIAnalysisStrategy',
        executionTime: 0, // Will be set by caller
        memoryUsed: process.memoryUsage().heapUsed,
        metadata: {
          analysisType,
          recommendations: parsed.recommendations || [],
          codeExamples: parsed.codeExamples || [],
          performanceImpact: parsed.performanceImpact,
          securityImplications: parsed.securityImplications,
          filesAnalyzed: 0
        }
      };

    } catch (error) {
      console.warn('Failed to parse OpenAI JSON response, using fallback:', error);
      
      return {
        success: true,
        analysis: response,
        confidence: 0.7,
        strategy: 'OpenAIAnalysisStrategy',
        executionTime: 0,
        memoryUsed: process.memoryUsage().heapUsed,
        metadata: {
          analysisType,
          filesAnalyzed: 0,
          parseError: true
        }
      };
    }
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimitFromHeaders(headers: Headers): void {
    const remaining = headers.get('x-ratelimit-remaining-requests');
    const resetTime = headers.get('x-ratelimit-reset-requests');

    if (remaining) {
      this.rateLimitRemaining = parseInt(remaining, 10);
    }

    if (resetTime) {
      this.rateLimitResetTime = new Date(resetTime);
    }
  }

  /**
   * Estimate input tokens for cost calculation
   */
  private estimateInputTokens(context: ClaudeCodeContext): number {
    const baseTokens = 500; // Base prompt tokens
    const approachTokens = context.attemptedApproaches.join(' ').length / 4;
    const findingTokens = context.partialFindings.map(f => f.description).join(' ').length / 4;
    const stuckTokens = context.stuckPoints.join(' ').length / 4;
    const fileTokens = context.focusArea.files.length * 10;

    return Math.ceil(baseTokens + approachTokens + findingTokens + stuckTokens + fileTokens);
  }

  /**
   * Estimate tokens in text (rough approximation)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Get service health information
   */
  getHealthInfo(): Record<string, any> {
    return {
      name: this.name,
      priority: this.priority,
      available: this.rateLimitRemaining > 0 && new Date() >= this.rateLimitResetTime,
      rateLimitRemaining: this.rateLimitRemaining,
      rateLimitResetTime: this.rateLimitResetTime,
      requestCount: this.requestCount,
      model: this.config.model
    };
  }
}