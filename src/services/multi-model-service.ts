import { createFallback } from 'ai-fallback';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import type {
  ClaudeCodeContext,
  AnalysisResult,
} from '@models/types.js';
import { ApiError, RateLimitError } from '@errors/index.js';
import { ApiProvider } from './api-manager.js';
import { MemoryOptimizer } from '@utils/memory-optimizer.js';
import { StructuredLogger } from '@utils/structured-logger.js';

const logger = StructuredLogger.getInstance('MultiModelService');

export class MultiModelService implements ApiProvider {
  public readonly name = 'multi-model';
  public readonly priority = 2; // Lower priority than GeminiService but higher than others
  
  private fallbackModel: any;
  private memoryOptimizer: MemoryOptimizer;
  private isConfigured = false;

  constructor() {
    this.memoryOptimizer = MemoryOptimizer.getInstance();
    this.setupFallbackModel();
  }

  private setupFallbackModel(): void {
    const models = [];

    // Check for Gemini API key and add Google models
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        // Primary: Gemini 2.5 Flash (good balance of quality and speed)
        models.push(google('gemini-2.5-flash'));
        
        // Secondary: Gemini 2.0 Flash (faster but lower quality)  
        models.push(google('gemini-2.0-flash'));
      } catch (error) {
        logger.warn('Failed to configure Google models', { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    // Check for OpenAI API key and add OpenAI models
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      try {
        // Tertiary: GPT-4o (high quality fallback)
        models.push(openai('gpt-4o'));
        
        // Quaternary: GPT-4o-mini (faster fallback)
        models.push(openai('gpt-4o-mini'));
      } catch (error) {
        logger.warn('Failed to configure OpenAI models', { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    // Check for Anthropic API key and add Claude models
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicApiKey) {
      try {
        // Claude 3.5 Sonnet (high quality alternative)
        models.push(anthropic('claude-3-5-sonnet-20241022'));
      } catch (error) {
        logger.warn('Failed to configure Anthropic models', { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    if (models.length === 0) {
      logger.error('No valid API keys found for any supported providers');
      this.isConfigured = false;
      return;
    }

    // Create fallback model with automatic switching
    this.fallbackModel = createFallback({
      models,
      onError: (error: Error, modelId: string) => {
        logger.warn(`Model ${modelId} failed, switching to next fallback`, {
          error: error.message,
          modelId,
          timestamp: new Date().toISOString(),
        });
      },
      modelResetInterval: 300000, // Reset to primary model after 5 minutes
    });

    this.isConfigured = true;
    logger.info('Multi-model fallback system configured', {
      totalModels: models.length,
      hasGemini: !!geminiApiKey,
      hasOpenAI: !!openaiApiKey,
      hasAnthropic: !!anthropicApiKey,
    });
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      // Test with a simple request
      const result = await generateText({
        model: this.fallbackModel,
        prompt: 'Test connectivity. Respond with "OK".',
        maxOutputTokens: 10,
      });

      const isHealthy = result.text.toLowerCase().includes('ok');
      logger.debug('Health check completed', { isHealthy, response: result.text });
      return isHealthy;
    } catch (error) {
      logger.error('Health check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  async analyzeCode(context: ClaudeCodeContext, analysisType: string): Promise<AnalysisResult> {
    if (!this.isConfigured) {
      throw new ApiError('Multi-model service not configured', 'CONFIGURATION_ERROR');
    }

    return this.memoryOptimizer.optimizeForAnalysis(async () => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      try {
        const prompt = this.buildAnalysisPrompt(context, analysisType);

        logger.debug('Starting multi-model analysis', {
          analysisType,
          promptLength: prompt.length,
          contextFiles: context.focusArea.files.length,
        });

        const result = await generateText({
          model: this.fallbackModel,
          system: 'You are a senior software engineer with expertise in code analysis, debugging, and system architecture. Provide detailed, actionable insights.',
          prompt: prompt,
          temperature: 0.2,
          maxOutputTokens: 8192,
        });

        const executionTime = Date.now() - startTime;
        const memoryUsed = process.memoryUsage().heapUsed - startMemory;

        logger.info('Multi-model analysis completed', {
          analysisType,
          executionTime,
          memoryUsed,
          responseLength: result.text.length,
        });

        return {
          success: true,
          analysis: result.text,
          confidence: this.calculateConfidence(result.text, analysisType),
          strategy: 'multi-model-fallback',
          executionTime,
          memoryUsed,
          metadata: {
            provider: 'multi-model',
            modelResetAvailable: true,
            fallbackCapable: true,
          },
        };
      } catch (error) {
        const executionTime = Date.now() - startTime;
        const memoryUsed = process.memoryUsage().heapUsed - startMemory;

        logger.error('Multi-model analysis failed', {
          analysisType,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime,
        });

        if (error instanceof Error && error.message.includes('rate limit')) {
          throw new RateLimitError('Multi-model rate limit exceeded');
        }

        throw new ApiError(`Multi-model analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'ANALYSIS_ERROR');
      }
    });
  }

  // Required by ApiProvider interface
  estimateCost(context: ClaudeCodeContext): number {
    const filesCount = context.focusArea.files.length;
    const baseCost = 0.001; // Base cost per request
    const fileCost = filesCount * 0.0001; // Cost per file
    return baseCost + fileCost;
  }

  getRateLimit(): { remaining: number; resetTime: Date } {
    // Multi-model has dynamic rate limits based on active provider
    return {
      remaining: 1000, // Conservative estimate
      resetTime: new Date(Date.now() + 60000), // Reset in 1 minute
    };
  }

  private buildAnalysisPrompt(context: ClaudeCodeContext, analysisType: string): string {
    const contextSummary = `
Code Context Analysis Request:
- Analysis Type: ${analysisType}
- Files to Analyze: ${context.focusArea.files.length}
- Attempted Approaches: ${context.attemptedApproaches?.join(', ') || 'None specified'}
- Partial Findings: ${context.partialFindings?.map(f => f.description).join(', ') || 'None available'}
- Where We Got Stuck: ${context.stuckPoints?.join(', ') || 'Not specified'}

File Contents:
${context.focusArea.files.map((file, index) => `
File ${index + 1}: ${file}
`).join('\n')}

Entry Points:
${context.focusArea.entryPoints?.map(ep => `- ${ep.file}:${ep.line} (${ep.functionName || 'unknown function'})`).join('\n') || 'No specific entry points provided'}

Service Names:
${context.focusArea.serviceNames?.join(', ') || 'No service names specified'}

Please provide a detailed analysis focusing on:
1. Root cause identification
2. System-wide impact assessment
3. Concrete reproduction steps
4. Specific solutions with code examples
5. Prevention strategies for similar issues

Respond with structured, actionable insights that can be immediately applied.
`;

    return contextSummary;
  }

  private calculateConfidence(response: string, analysisType: string): number {
    let confidence = 70; // Base confidence for multi-model

    // Increase confidence based on response characteristics
    if (response.includes('root cause') || response.includes('specific solution')) {
      confidence += 10;
    }
    if (response.includes('code example') || response.includes('implementation')) {
      confidence += 10;
    }
    if (response.length > 1000) {
      confidence += 5;
    }
    if (analysisType === 'execution_trace' && response.includes('execution')) {
      confidence += 5;
    }

    return Math.min(confidence, 95); // Cap at 95%
  }
}