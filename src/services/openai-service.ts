import { ApiError, RateLimitError } from '../errors/index.js';
import { ClaudeCodeContext, AnalysisResult } from '../models/types.js';
import { PromptSanitizer } from '../utils/prompt-sanitizer.js';
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
 * 
 * DCR-4 Enhancement: Advanced circuit breaker and service monitoring
 */
export class OpenAIService implements ApiProvider {
  public readonly name = 'openai';
  public readonly priority = 2; // Second priority after Gemini
  
  private config: OpenAIConfig;
  private rateLimitRemaining = 1000;
  private rateLimitResetTime = new Date();
  private requestCount = 0;
  
  // DCR-4: Enhanced service health tracking
  private consecutiveFailures = 0;
  private lastSuccessTime = new Date();
  private circuitBreakerOpen = false;
  private circuitBreakerResetTime = new Date();
  private serviceUnavailableCount = 0;
  private readonly maxConsecutiveFailures = 3;
  private readonly circuitBreakerTimeoutMs = 60000; // 1 minute

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
   * DCR-4 Enhancement: Circuit breaker pattern
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check circuit breaker state
      if (this.circuitBreakerOpen) {
        if (Date.now() < this.circuitBreakerResetTime.getTime()) {
          return false; // Circuit breaker still open
        } else {
          // Reset circuit breaker
          this.circuitBreakerOpen = false;
          this.consecutiveFailures = 0;
        }
      }
      
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
      
      // DCR-4: Track successful response for circuit breaker reset
      this.consecutiveFailures = 0;
      this.serviceUnavailableCount = 0;
      this.lastSuccessTime = new Date();
      this.circuitBreakerOpen = false;
      
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
      const errorString = String(error);
      
      // DCR-4: Track failures for circuit breaker
      this.consecutiveFailures++;
      
      // Enhanced 503 Service Unavailable detection for DCR-4
      if (errorMessage.includes('503') || 
          errorMessage.includes('Service Unavailable') ||
          errorMessage.includes('service_unavailable') ||
          errorString.includes('503') ||
          errorMessage.includes('temporarily unavailable') ||
          errorMessage.includes('server temporarily overloaded')) {
        
        // Mark service as temporarily unavailable
        this.serviceUnavailableCount++;
        this.rateLimitRemaining = 0;
        this.rateLimitResetTime = new Date(Date.now() + 30000); // Reset in 30 seconds for 503 errors
        
        // DCR-4: Open circuit breaker on repeated 503 errors
        if (this.serviceUnavailableCount >= 2) {
          this.circuitBreakerOpen = true;
          this.circuitBreakerResetTime = new Date(Date.now() + this.circuitBreakerTimeoutMs);
        }
        
        throw new ApiError(
          `OpenAI service temporarily unavailable (503): ${errorMessage}`, 
          'SERVICE_UNAVAILABLE', 
          'openai'
        );
      }
      
      // Handle rate limiting (429)
      if (errorMessage.includes('rate_limit_exceeded') || 
          errorMessage.includes('429') || 
          errorString.includes('429')) {
        this.rateLimitRemaining = 0;
        this.rateLimitResetTime = new Date(Date.now() + 60000); // Reset in 1 minute
        throw new RateLimitError(`OpenAI API rate limit exceeded: ${errorMessage}`, 'openai');
      }
      
      // Handle quota exceeded
      if (errorMessage.includes('quota_exceeded') || 
          errorMessage.includes('insufficient_quota') ||
          errorMessage.includes('quota')) {
        throw new ApiError(`OpenAI quota exceeded: ${errorMessage}`, 'QUOTA_EXCEEDED', 'openai');
      }
      
      // Handle authentication errors (401, 403)
      if (errorMessage.includes('401') || 
          errorMessage.includes('403') ||
          errorMessage.includes('unauthorized') ||
          errorMessage.includes('forbidden') ||
          errorMessage.includes('invalid_api_key')) {
        throw new ApiError(
          `OpenAI authentication failed: ${errorMessage}`, 
          'AUTH_ERROR', 
          'openai'
        );
      }
      
      // Handle server errors (500, 502, 504)
      if (errorMessage.includes('500') || 
          errorMessage.includes('502') || 
          errorMessage.includes('504') ||
          errorMessage.includes('internal server error') ||
          errorMessage.includes('bad gateway') ||
          errorMessage.includes('gateway timeout')) {
        
        // DCR-4: Open circuit breaker on consecutive server errors
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
          this.circuitBreakerOpen = true;
          this.circuitBreakerResetTime = new Date(Date.now() + this.circuitBreakerTimeoutMs);
        }
        
        throw new ApiError(
          `OpenAI server error: ${errorMessage}`, 
          'SERVER_ERROR', 
          'openai'
        );
      }
      
      // Handle timeout errors
      if (errorMessage.includes('timeout') || 
          errorMessage.includes('TIMEOUT') ||
          errorMessage.includes('ECONNRESET') ||
          errorMessage.includes('ENOTFOUND')) {
        
        throw new ApiError(
          `OpenAI request timeout: ${errorMessage}`, 
          'TIMEOUT_ERROR', 
          'openai'
        );
      }
      
      // DCR-4: Open circuit breaker on excessive consecutive failures
      if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        this.circuitBreakerOpen = true;
        this.circuitBreakerResetTime = new Date(Date.now() + this.circuitBreakerTimeoutMs);
      }
      
      // Generic API error for unhandled cases
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

      ## Attempted Approaches
${context.attemptedApproaches.map((approach: string) => `- ${approach}`).join('\n')}

      ## Partial Findings
${context.partialFindings.map((finding: any) => `- ${finding.description} (${finding.severity})`).join('\n')}

      ## Where We Got Stuck
${context.stuckPoints.map((point: string) => `- ${point}`).join('\n')}

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
    const findingTokens = context.partialFindings.map((f: any) => f.description).join(' ').length / 4;
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
   * DCR-4 Enhancement: Circuit breaker and service health metrics
   */
  getHealthInfo(): Record<string, any> {
    return {
      name: this.name,
      priority: this.priority,
      available: this.rateLimitRemaining > 0 && new Date() >= this.rateLimitResetTime && !this.circuitBreakerOpen,
      rateLimitRemaining: this.rateLimitRemaining,
      rateLimitResetTime: this.rateLimitResetTime,
      requestCount: this.requestCount,
      model: this.config.model,
      // DCR-4: Enhanced health metrics
      circuitBreaker: {
        open: this.circuitBreakerOpen,
        resetTime: this.circuitBreakerResetTime,
        consecutiveFailures: this.consecutiveFailures,
        maxFailures: this.maxConsecutiveFailures
      },
      serviceHealth: {
        lastSuccessTime: this.lastSuccessTime,
        serviceUnavailableCount: this.serviceUnavailableCount,
        uptimeStatus: this.getUptimeStatus()
      }
    };
  }

  /**
   * DCR-4: Get service uptime status
   */
  private getUptimeStatus(): string {
    const timeSinceLastSuccess = Date.now() - this.lastSuccessTime.getTime();
    
    if (this.circuitBreakerOpen) {
      return 'circuit_breaker_open';
    } else if (timeSinceLastSuccess > 300000) { // 5 minutes
      return 'degraded';
    } else if (this.consecutiveFailures > 0) {
      return 'partial_failure';
    } else {
      return 'healthy';
    }
  }
}