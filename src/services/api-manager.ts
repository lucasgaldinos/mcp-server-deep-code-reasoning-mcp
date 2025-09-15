import { ApiError, RateLimitError } from '@errors/index.js';
import { ClaudeCodeContext, AnalysisResult } from '@models/types.js';

export interface ApiProvider {
  name: string;
  priority: number;
  isAvailable(): Promise<boolean>;
  analyzeCode(context: ClaudeCodeContext, analysisType: string): Promise<AnalysisResult>;
  estimateCost(context: ClaudeCodeContext): number;
  getRateLimit(): { remaining: number; resetTime: Date };
}

export interface ApiManagerConfig {
  providers: ApiProvider[];
  retryAttempts: number;
  timeoutMs: number;
  enableCaching: boolean;
  costBudget?: number;
}

export interface ProviderResult {
  provider: string;
  result: AnalysisResult;
  cost: number;
  duration: number;
  memoryUsed: number;
}

/**
 * Multi-Provider API Manager
 * 
 * Implements the Gemini → OpenAI → Copilot fallback strategy with:
 * - Intelligent provider selection
 * - Automatic failover on quota/errors
 * - Cost optimization
 * - Performance monitoring
 */
export class ApiManager {
  private providers: Map<string, ApiProvider> = new Map();
  private config: ApiManagerConfig;
  private lastProviderUsed: string | null = null;
  private providerStats: Map<string, { calls: number; failures: number; totalTime: number }> = new Map();

  constructor(config: ApiManagerConfig) {
    this.config = config;
    
    // Sort providers by priority (Gemini=1, OpenAI=2, Copilot=3)
    const sortedProviders = config.providers.sort((a, b) => a.priority - b.priority);
    
    sortedProviders.forEach(provider => {
      this.providers.set(provider.name, provider);
      this.providerStats.set(provider.name, { calls: 0, failures: 0, totalTime: 0 });
    });
  }

  /**
   * Analyze code with automatic provider fallback
   */
  async analyzeWithFallback(
    context: ClaudeCodeContext, 
    analysisType: string
  ): Promise<ProviderResult> {
    const startTime = Date.now();
    const providers = Array.from(this.providers.values()).sort((a, b) => a.priority - b.priority);
    
    let lastError: Error | null = null;
    
    for (const provider of providers) {
      try {
        // Check if provider is available
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) {
          console.warn(`ApiManager: Provider ${provider.name} is not available, trying next...`);
          continue;
        }

        // Check rate limits
        const rateLimit = provider.getRateLimit();
        if (rateLimit.remaining <= 0) {
          console.warn(`ApiManager: Provider ${provider.name} rate limit exceeded, trying next...`);
          continue;
        }

        // Check cost constraints
        if (this.config.costBudget) {
          const estimatedCost = provider.estimateCost(context);
          if (estimatedCost > this.config.costBudget) {
            console.warn(`ApiManager: Provider ${provider.name} cost (${estimatedCost}) exceeds budget (${this.config.costBudget}), trying next...`);
            continue;
          }
        }

        // Attempt analysis with this provider
        console.log(`ApiManager: Attempting analysis with provider: ${provider.name}`);
        const analysisStartTime = Date.now();
        
        const result = await provider.analyzeCode(context, analysisType);
        
        const duration = Date.now() - analysisStartTime;
        const memoryUsed = process.memoryUsage().heapUsed;
        
        // Update statistics
        const stats = this.providerStats.get(provider.name)!;
        stats.calls++;
        stats.totalTime += duration;
        
        this.lastProviderUsed = provider.name;
        
        console.log(`ApiManager: Analysis successful with ${provider.name} (${duration}ms)`);
        
        return {
          provider: provider.name,
          result,
          cost: provider.estimateCost(context),
          duration,
          memoryUsed
        };

      } catch (error) {
        const err = error as Error;
        lastError = err;
        
        // Update failure statistics
        const stats = this.providerStats.get(provider.name)!;
        stats.failures++;
        
        console.error(`ApiManager: Provider ${provider.name} failed:`, err.message);
        
        // Handle specific error types
        if (error instanceof RateLimitError) {
          console.warn(`ApiManager: Rate limit hit for ${provider.name}, trying next provider...`);
          continue;
        }
        
        if (error instanceof ApiError && error.code === 'QUOTA_EXCEEDED') {
          console.warn(`ApiManager: Quota exceeded for ${provider.name}, trying next provider...`);
          continue;
        }
        
        // For other errors, still try next provider but log as unexpected
        console.warn(`ApiManager: Unexpected error from ${provider.name}, trying next provider...`);
        continue;
      }
    }
    
    // All providers failed
    const totalTime = Date.now() - startTime;
    const errorMessage = `All API providers failed after ${totalTime}ms. ` +
      `Providers attempted: ${providers.map(p => p.name).join(', ')}. ` +
      `Last error: ${lastError?.message || 'Unknown error'}`;
    
    throw new ApiError(
      errorMessage,
      'ALL_PROVIDERS_FAILED',
      'api_manager'
    );
  }

  /**
   * Get provider statistics for monitoring
   */
  getProviderStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    this.providerStats.forEach((providerStats, name) => {
      const provider = this.providers.get(name)!;
      const rateLimit = provider.getRateLimit();
      
      stats[name] = {
        priority: provider.priority,
        calls: providerStats.calls,
        failures: providerStats.failures,
        successRate: providerStats.calls > 0 
          ? ((providerStats.calls - providerStats.failures) / providerStats.calls * 100).toFixed(2) + '%'
          : '0%',
        averageTime: providerStats.calls > 0 
          ? Math.round(providerStats.totalTime / providerStats.calls) + 'ms'
          : '0ms',
        rateLimitRemaining: rateLimit.remaining,
        rateLimitResetTime: rateLimit.resetTime
      };
    });
    
    return stats;
  }

  /**
   * Get recommended provider based on current conditions
   */
  async getRecommendedProvider(): Promise<string | null> {
    for (const provider of Array.from(this.providers.values()).sort((a, b) => a.priority - b.priority)) {
      try {
        const isAvailable = await provider.isAvailable();
        const rateLimit = provider.getRateLimit();
        
        if (isAvailable && rateLimit.remaining > 0) {
          return provider.name;
        }
      } catch (error) {
        continue;
      }
    }
    
    return null;
  }

  /**
   * Force a specific provider (for testing/debugging)
   */
  async analyzeWithProvider(
    providerName: string,
    context: ClaudeCodeContext,
    analysisType: string
  ): Promise<ProviderResult> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new ApiError(`Provider ${providerName} not found`, 'PROVIDER_NOT_FOUND', 'api_manager');
    }

    const startTime = Date.now();
    const result = await provider.analyzeCode(context, analysisType);
    const duration = Date.now() - startTime;
    const memoryUsed = process.memoryUsage().heapUsed;

    return {
      provider: providerName,
      result,
      cost: provider.estimateCost(context),
      duration,
      memoryUsed
    };
  }

  /**
   * Reset provider statistics
   */
  resetStats(): void {
    this.providerStats.forEach((stats) => {
      stats.calls = 0;
      stats.failures = 0;
      stats.totalTime = 0;
    });
  }
}