/**
 * Performance Baselines for Deep Code Reasoning MCP Server
 *
 * Establishes baseline metrics for regression detection and performance monitoring.
 * These thresholds are used in CI/CD pipelines and production monitoring.
 */

export interface PerformanceMetrics {
  responseTime: number; // milliseconds
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpuUsage: number; // percentage
  apiCallCount: number;
  tokenUsage?: {
    input: number;
    output: number;
  };
}

export interface PerformanceThreshold {
  responseTime: number; // max milliseconds
  memoryUsage: {
    heapUsed: number; // max bytes
    external: number; // max bytes
  };
  cpuUsage: number; // max percentage
  apiCallCount: number; // max calls per operation
}

/**
 * Performance baseline thresholds for all MCP tools
 * These values are based on empirical testing and should be updated
 * as the system evolves.
 */
export class PerformanceBaselines {
  /**
   * Response time thresholds for each MCP tool (in milliseconds)
   * Values based on complexity and expected usage patterns
   */
  static readonly TOOL_RESPONSE_THRESHOLDS: Record<string, number> = {
    // Quick analysis tools (should be fast)
    health_check: 500,
    get_conversation_status: 1000,
    get_conversation_history: 2000,
    get_active_conversations: 1500,

    // Medium complexity analysis tools
    start_conversation: 3000,
    continue_conversation: 5000,
    finalize_conversation: 8000,

    // Complex analysis tools (can take longer)
    escalate_analysis: 15000,
    trace_execution_path: 12000,
    cross_system_impact: 20000,

    // Heavy computational tools
    performance_bottleneck: 25000,
    hypothesis_test: 30000,
    hypothesis_tournament: 60000, // Multiple parallel hypotheses
  };

  /**
   * Memory usage thresholds
   */
  static readonly MEMORY_THRESHOLDS = {
    heapUsed: 512 * 1024 * 1024, // 512MB
    external: 100 * 1024 * 1024, // 100MB
    heapTotal: 1024 * 1024 * 1024, // 1GB
    rss: 768 * 1024 * 1024, // 768MB
  };

  /**
   * CPU usage thresholds (percentage)
   */
  static readonly CPU_THRESHOLDS = {
    singleOperation: 80, // Max 80% CPU for single operation
    sustained: 60, // Max 60% CPU sustained over 1 minute
    burst: 95, // Max 95% CPU for short bursts (< 10 seconds)
  };

  /**
   * API call limits per operation
   * Used to prevent excessive API usage
   */
  static readonly API_CALL_LIMITS: Record<string, number> = {
    // Simple tools should use minimal API calls
    health_check: 0, // No external API calls
    get_conversation_status: 0,
    get_conversation_history: 0,
    get_active_conversations: 0,

    // Analysis tools with moderate API usage
    start_conversation: 2, // Initial context + first analysis
    continue_conversation: 1, // Single follow-up call
    finalize_conversation: 1, // Summary generation

    // Complex analysis tools
    escalate_analysis: 3, // Context analysis + deep reasoning + formatting
    trace_execution_path: 2, // Path analysis + formatting
    cross_system_impact: 4, // Multiple system boundary analysis

    // Computational tools with higher API usage
    performance_bottleneck: 5, // Multiple analysis passes
    hypothesis_test: 3, // Hypothesis + validation + results
    hypothesis_tournament: 15, // Multiple parallel hypotheses (3-5 hypotheses × 3 calls each)
  };

  /**
   * Token usage baselines for Gemini API calls
   * Used for cost monitoring and optimization
   */
  static readonly TOKEN_BASELINES = {
    // Input token estimates (per tool)
    inputTokens: {
      small_analysis: 2000, // Simple code analysis
      medium_analysis: 8000, // Moderate complexity
      large_analysis: 20000, // Complex multi-file analysis
      conversation_context: 5000, // Conversation history
    },

    // Output token estimates
    outputTokens: {
      quick_response: 500, // Simple responses
      detailed_analysis: 2000, // Detailed analysis results
      comprehensive_report: 5000, // Full analysis reports
      conversation_turn: 1000, // Conversation responses
    },

    // Per-tool token budgets (input + output)
    toolBudgets: {
      escalate_analysis: 25000,
      trace_execution_path: 15000,
      cross_system_impact: 30000,
      performance_bottleneck: 20000,
      hypothesis_test: 18000,
      hypothesis_tournament: 80000, // Multiple hypotheses
      start_conversation: 10000,
      continue_conversation: 8000,
      finalize_conversation: 12000,
    },
  };

  /**
   * Performance degradation thresholds
   * When to trigger alerts in production
   */
  static readonly DEGRADATION_THRESHOLDS = {
    // Response time degradation
    responseTime: {
      warning: 1.5, // 50% slower than baseline
      critical: 2.0, // 100% slower than baseline
      emergency: 3.0, // 200% slower than baseline
    },

    // Memory usage degradation
    memory: {
      warning: 1.3, // 30% more memory than baseline
      critical: 1.5, // 50% more memory than baseline
      emergency: 2.0, // 100% more memory than baseline
    },

    // Error rate thresholds
    errorRate: {
      warning: 0.05, // 5% error rate
      critical: 0.10, // 10% error rate
      emergency: 0.25, // 25% error rate
    },
  };

  /**
   * Get performance threshold for a specific tool
   */
  static getToolThreshold(toolName: string): PerformanceThreshold {
    return {
      responseTime: this.TOOL_RESPONSE_THRESHOLDS[toolName] || 30000, // Default 30s
      memoryUsage: this.MEMORY_THRESHOLDS,
      cpuUsage: this.CPU_THRESHOLDS.singleOperation,
      apiCallCount: this.API_CALL_LIMITS[toolName] || 10, // Default 10 calls
    };
  }

  /**
   * Check if metrics are within acceptable thresholds
   */
  static isWithinThresholds(
    toolName: string,
    metrics: PerformanceMetrics,
  ): {
    passed: boolean;
    violations: string[];
  } {
    const threshold = this.getToolThreshold(toolName);
    const violations: string[] = [];

    // Check response time
    if (metrics.responseTime > threshold.responseTime) {
      violations.push(`Response time ${metrics.responseTime}ms exceeds threshold ${threshold.responseTime}ms`);
    }

    // Check memory usage
    if (metrics.memoryUsage.heapUsed > threshold.memoryUsage.heapUsed) {
      violations.push(`Heap usage ${metrics.memoryUsage.heapUsed} exceeds threshold ${threshold.memoryUsage.heapUsed}`);
    }

    if (metrics.memoryUsage.external > threshold.memoryUsage.external) {
      violations.push(`External memory ${metrics.memoryUsage.external} exceeds threshold ${threshold.memoryUsage.external}`);
    }

    // Check CPU usage
    if (metrics.cpuUsage > threshold.cpuUsage) {
      violations.push(`CPU usage ${metrics.cpuUsage}% exceeds threshold ${threshold.cpuUsage}%`);
    }

    // Check API call count
    if (metrics.apiCallCount > threshold.apiCallCount) {
      violations.push(`API calls ${metrics.apiCallCount} exceed threshold ${threshold.apiCallCount}`);
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  /**
   * Calculate performance score (0-100)
   * Higher score = better performance
   */
  static calculatePerformanceScore(
    toolName: string,
    metrics: PerformanceMetrics,
  ): number {
    const threshold = this.getToolThreshold(toolName);
    let totalScore = 0;
    let components = 0;

    // Response time score (0-25 points)
    const responseTimeScore = Math.max(0, 25 - (metrics.responseTime / threshold.responseTime) * 25);
    totalScore += responseTimeScore;
    components++;

    // Memory score (0-25 points)
    const memoryRatio = metrics.memoryUsage.heapUsed / threshold.memoryUsage.heapUsed;
    const memoryScore = Math.max(0, 25 - memoryRatio * 25);
    totalScore += memoryScore;
    components++;

    // CPU score (0-25 points)
    const cpuScore = Math.max(0, 25 - (metrics.cpuUsage / threshold.cpuUsage) * 25);
    totalScore += cpuScore;
    components++;

    // API efficiency score (0-25 points)
    const apiRatio = metrics.apiCallCount / threshold.apiCallCount;
    const apiScore = Math.max(0, 25 - apiRatio * 25);
    totalScore += apiScore;
    components++;

    return Math.round(totalScore / components * 4); // Scale to 0-100
  }

  /**
   * Get recommended optimization strategies based on metrics
   */
  static getOptimizationRecommendations(
    toolName: string,
    metrics: PerformanceMetrics,
  ): string[] {
    const threshold = this.getToolThreshold(toolName);
    const recommendations: string[] = [];

    // Response time optimizations
    if (metrics.responseTime > threshold.responseTime) {
      recommendations.push('Consider implementing caching for repeated analyses');
      recommendations.push('Optimize Gemini API prompts to reduce processing time');
      recommendations.push('Implement parallel processing for multi-file analysis');
    }

    // Memory optimizations
    if (metrics.memoryUsage.heapUsed > threshold.memoryUsage.heapUsed) {
      recommendations.push('Implement memory cleanup after analysis completion');
      recommendations.push('Use streaming for large file processing');
      recommendations.push('Consider reducing code context window size');
    }

    // CPU optimizations
    if (metrics.cpuUsage > threshold.cpuUsage) {
      recommendations.push('Implement CPU-bound operation queuing');
      recommendations.push('Consider worker thread isolation for heavy computations');
      recommendations.push('Optimize file I/O operations');
    }

    // API efficiency optimizations
    if (metrics.apiCallCount > threshold.apiCallCount) {
      recommendations.push('Implement request batching for related operations');
      recommendations.push('Add intelligent caching for similar analysis requests');
      recommendations.push('Optimize prompt engineering to reduce API roundtrips');
    }

    return recommendations;
  }
}
