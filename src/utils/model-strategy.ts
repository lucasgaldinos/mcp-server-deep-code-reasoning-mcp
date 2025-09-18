/**
 * Model Selection Strategy for Multi-Request Analysis
 * 
 * Dynamically selects the optimal Gemini model based on expected request patterns
 */

export interface ModelRequirements {
  expectedRequests: number;
  maxConcurrency: number;
  qualityPriority: 'high' | 'medium' | 'low';
  timeoutMinutes: number;
}

export interface ModelConfig {
  model: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  qualityScore: number; // 1-10, higher is better
  description: string;
}

export class ModelStrategy {
  private static readonly AVAILABLE_MODELS: Record<string, ModelConfig> = {
    'gemini-2.5-pro': {
      model: 'gemini-2.5-pro',
      rateLimit: { requestsPerMinute: 5, requestsPerDay: 100 },
      qualityScore: 10,
      description: 'Highest quality, lowest rate limits - best for single complex analysis'
    },
    'gemini-2.5-flash': {
      model: 'gemini-2.5-flash',
      rateLimit: { requestsPerMinute: 10, requestsPerDay: 250 },
      qualityScore: 8,
      description: 'Good quality, moderate rate limits - best for multi-request workflows'
    },
    'gemini-2.0-flash': {
      model: 'gemini-2.0-flash',
      rateLimit: { requestsPerMinute: 15, requestsPerDay: 200 },
      qualityScore: 7,
      description: 'Acceptable quality, higher rate limits - best for high-volume analysis'
    }
  };

  /**
   * Get optimal model for specific MCP tool usage patterns
   */
  static getOptimalModel(toolName: string, customRequirements?: Partial<ModelRequirements>): string {
    const requirements = this.getToolRequirements(toolName, customRequirements);
    return this.selectModelByRequirements(requirements);
  }

  /**
   * Get expected request patterns for each MCP tool
   */
  private static getToolRequirements(toolName: string, override?: Partial<ModelRequirements>): ModelRequirements {
    const baseRequirements: Record<string, ModelRequirements> = {
      // Single-request tools (gemini-2.5-pro preferred)
      'escalate_analysis': {
        expectedRequests: 1,
        maxConcurrency: 1,
        qualityPriority: 'high',
        timeoutMinutes: 5
      },
      'cross_system_impact': {
        expectedRequests: 1,
        maxConcurrency: 1,
        qualityPriority: 'high',
        timeoutMinutes: 3
      },
      'performance_bottleneck': {
        expectedRequests: 1,
        maxConcurrency: 1,
        qualityPriority: 'high',
        timeoutMinutes: 3
      },
      'trace_execution_path': {
        expectedRequests: 1,
        maxConcurrency: 1,
        qualityPriority: 'high',
        timeoutMinutes: 5
      },
      'hypothesis_test': {
        expectedRequests: 1,
        maxConcurrency: 1,
        qualityPriority: 'high',
        timeoutMinutes: 3
      },

      // Multi-request tools (gemini-2.5-flash preferred)
      'start_conversation': {
        expectedRequests: 5, // Start + typical follow-ups
        maxConcurrency: 1,
        qualityPriority: 'medium',
        timeoutMinutes: 10
      },
      'continue_conversation': {
        expectedRequests: 3, // Typical conversation depth
        maxConcurrency: 1,
        qualityPriority: 'medium',
        timeoutMinutes: 5
      },
      'finalize_conversation': {
        expectedRequests: 1,
        maxConcurrency: 1,
        qualityPriority: 'medium',
        timeoutMinutes: 2
      },

      // High-volume tools (gemini-2.0-flash or gemini-2.5-flash)
      'run_hypothesis_tournament': {
        expectedRequests: 25, // 6 hypotheses × 3 rounds + overhead
        maxConcurrency: 4, // Parallel hypothesis testing
        qualityPriority: 'medium',
        timeoutMinutes: 5 // Tournament runs in bursts, not spread over 15 minutes
      }
    };

    const baseReq = baseRequirements[toolName] || baseRequirements['escalate_analysis'];
    return { ...baseReq, ...override };
  }

  /**
   * Select optimal model based on requirements
   */
  private static selectModelByRequirements(requirements: ModelRequirements): string {
    const models = Object.values(this.AVAILABLE_MODELS);
    
    // Calculate required requests per minute with safety margin
    const timeframeMinutes = Math.max(1, requirements.timeoutMinutes);
    const burstRequests = Math.ceil(requirements.expectedRequests * requirements.maxConcurrency);
    const requiredRPM = Math.ceil(burstRequests / timeframeMinutes * 1.5); // 50% safety margin
    
    // Filter models that can handle the request volume
    const viableModels = models.filter(model => {
      return model.rateLimit.requestsPerMinute >= requiredRPM;
    });

    if (viableModels.length === 0) {
      console.warn(`No model can handle ${burstRequests} requests in ${timeframeMinutes} minutes (needs ${requiredRPM} RPM). Using fastest available.`);
      return 'gemini-2.0-flash';
    }

    // Sort by quality score for the given priority
    const priorityWeights = {
      'high': 1.0,    // Prefer quality over speed
      'medium': 0.7,  // Balance quality and speed  
      'low': 0.3      // Prefer speed over quality
    };

    const weight = priorityWeights[requirements.qualityPriority];
    const scoredModels = viableModels.map(model => ({
      ...model,
      score: model.qualityScore * weight + (model.rateLimit.requestsPerMinute / 15) * (1 - weight)
    }));

    // Return highest scoring model
    const optimal = scoredModels.sort((a, b) => b.score - a.score)[0];
    return optimal.model;
  }

  /**
   * Get model configuration for a specific model
   */
  static getModelConfig(modelName: string): ModelConfig | null {
    return this.AVAILABLE_MODELS[modelName] || null;
  }

  /**
   * Get recommendations for all tools
   */
  static getToolRecommendations(): Record<string, { model: string; reasoning: string }> {
    const tools = [
      'escalate_analysis', 'cross_system_impact', 'performance_bottleneck',
      'trace_execution_path', 'hypothesis_test', 'start_conversation',
      'continue_conversation', 'finalize_conversation', 'run_hypothesis_tournament'
    ];

    return tools.reduce((acc, tool) => {
      const model = this.getOptimalModel(tool);
      const config = this.getModelConfig(model)!;
      const requirements = this.getToolRequirements(tool);
      
      acc[tool] = {
        model,
        reasoning: `${requirements.expectedRequests} requests, ${requirements.qualityPriority} quality → ${config.description}`
      };
      return acc;
    }, {} as Record<string, { model: string; reasoning: string }>);
  }

  /**
   * Check if current model can handle a specific tool safely
   */
  static validateModelForTool(currentModel: string, toolName: string): {
    safe: boolean;
    warning?: string;
    recommendation?: string;
  } {
    const optimal = this.getOptimalModel(toolName);
    const current = this.getModelConfig(currentModel);
    const requirements = this.getToolRequirements(toolName);

    if (!current) {
      return {
        safe: false,
        warning: `Unknown model: ${currentModel}`,
        recommendation: optimal
      };
    }

    const requestsPerMinute = Math.ceil(requirements.expectedRequests / requirements.timeoutMinutes);
    
    if (current.rateLimit.requestsPerMinute < requestsPerMinute) {
      return {
        safe: false,
        warning: `${currentModel} (${current.rateLimit.requestsPerMinute} RPM) cannot handle ${toolName} (needs ${requestsPerMinute} RPM)`,
        recommendation: optimal
      };
    }

    if (currentModel !== optimal) {
      return {
        safe: true,
        warning: `${currentModel} works but ${optimal} would be more optimal`,
        recommendation: optimal
      };
    }

    return { safe: true };
  }
}