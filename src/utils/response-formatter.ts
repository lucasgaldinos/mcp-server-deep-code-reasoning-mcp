import { AnalysisResult } from '@models/types.js';

export interface FormattedResponse {
  success: boolean;
  analysis: string;
  confidence: number;
  provider: string;
  executionTime: number;
  memoryUsed: number;
  recommendations: string[];
  codeExamples: string[];
  metadata: Record<string, any>;
  performance: {
    responseTime: number;
    memoryEfficiency: number;
    cacheHit: boolean;
  };
  errors?: string[];
  warnings?: string[];
}

/**
 * Response Formatter
 * 
 * Standardizes outputs across different API providers and optimizes
 * response structure for consistent user experience.
 */
export class ResponseFormatter {
  private static readonly MAX_ANALYSIS_LENGTH = 10000;
  private static readonly MAX_RECOMMENDATIONS = 10;
  private static readonly MIN_CONFIDENCE = 0.1;
  private static readonly MAX_CONFIDENCE = 1.0;

  /**
   * Format analysis result with standardized structure
   */
  static formatAnalysisResult(
    result: AnalysisResult,
    provider: string,
    startTime: number,
    cacheHit: boolean = false
  ): FormattedResponse {
    const executionTime = Date.now() - startTime;
    const memoryUsed = result.memoryUsed || process.memoryUsage().heapUsed;
    const memoryEfficiency = this.calculateMemoryEfficiency(memoryUsed);

    return {
      success: result.success,
      analysis: this.sanitizeAnalysis(result.analysis),
      confidence: this.normalizeConfidence(result.confidence),
      provider,
      executionTime: result.executionTime || executionTime,
      memoryUsed,
      recommendations: this.extractRecommendations(result),
      codeExamples: this.extractCodeExamples(result),
      metadata: this.sanitizeMetadata(result.metadata || {}),
      performance: {
        responseTime: executionTime,
        memoryEfficiency,
        cacheHit
      },
      errors: this.extractErrors(result),
      warnings: this.extractWarnings(result)
    };
  }

  /**
   * Format error response with consistent structure
   */
  static formatErrorResponse(
    error: Error,
    provider: string,
    startTime: number
  ): FormattedResponse {
    const executionTime = Date.now() - startTime;
    
    return {
      success: false,
      analysis: `Analysis failed: ${error.message}`,
      confidence: 0,
      provider,
      executionTime,
      memoryUsed: process.memoryUsage().heapUsed,
      recommendations: [
        'Check API credentials and quota',
        'Verify network connectivity',
        'Try reducing analysis scope'
      ],
      codeExamples: [],
      metadata: {
        errorType: error.constructor.name,
        errorMessage: error.message,
        timestamp: new Date().toISOString()
      },
      performance: {
        responseTime: executionTime,
        memoryEfficiency: this.calculateMemoryEfficiency(process.memoryUsage().heapUsed),
        cacheHit: false
      },
      errors: [error.message],
      warnings: []
    };
  }

  /**
   * Sanitize analysis text for safe display
   */
  private static sanitizeAnalysis(analysis: string): string {
    if (!analysis) {return 'No analysis available';}
    
    // Remove potential injection risks
    let sanitized = analysis
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '');

    // Limit length
    if (sanitized.length > this.MAX_ANALYSIS_LENGTH) {
      sanitized = sanitized.substring(0, this.MAX_ANALYSIS_LENGTH) + '... [truncated]';
    }

    return sanitized.trim();
  }

  /**
   * Normalize confidence to valid range
   */
  private static normalizeConfidence(confidence: number): number {
    if (typeof confidence !== 'number' || isNaN(confidence)) {
      return 0.5; // Default confidence
    }
    
    return Math.max(this.MIN_CONFIDENCE, Math.min(this.MAX_CONFIDENCE, confidence));
  }

  /**
   * Extract and format recommendations
   */
  private static extractRecommendations(result: AnalysisResult): string[] {
    const recommendations: string[] = [];
    
    // From metadata
    if (result.metadata?.recommendations && Array.isArray(result.metadata.recommendations)) {
      recommendations.push(...result.metadata.recommendations.slice(0, this.MAX_RECOMMENDATIONS));
    }
    
    // From analysis text
    const analysisRecs = this.extractRecommendationsFromText(result.analysis);
    recommendations.push(...analysisRecs);
    
    // Deduplicate and limit
    const unique = [...new Set(recommendations)];
    return unique.slice(0, this.MAX_RECOMMENDATIONS).map(rec => rec.trim());
  }

  /**
   * Extract recommendations from analysis text
   */
  private static extractRecommendationsFromText(analysis: string): string[] {
    if (!analysis) {return [];}
    
    const recommendations: string[] = [];
    const lines = analysis.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for recommendation patterns
      if (trimmed.match(/^[\-\*]\s+/) || 
          trimmed.toLowerCase().includes('recommend') ||
          trimmed.toLowerCase().includes('suggest') ||
          trimmed.toLowerCase().includes('should')) {
        recommendations.push(trimmed.replace(/^[\-\*]\s+/, ''));
      }
    }
    
    return recommendations.slice(0, 5); // Limit from text extraction
  }

  /**
   * Extract code examples
   */
  private static extractCodeExamples(result: AnalysisResult): string[] {
    const examples: string[] = [];
    
    // From metadata
    if (result.metadata?.codeExamples && Array.isArray(result.metadata.codeExamples)) {
      examples.push(...result.metadata.codeExamples);
    }
    
    // Extract from analysis text
    const codeBlocks = this.extractCodeBlocksFromText(result.analysis);
    examples.push(...codeBlocks);
    
    return examples.slice(0, 5); // Limit to 5 examples
  }

  /**
   * Extract code blocks from text
   */
  private static extractCodeBlocksFromText(analysis: string): string[] {
    if (!analysis) {return [];}
    
    const codeBlocks: string[] = [];
    
    // Match code blocks with triple backticks
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)\n```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(analysis)) !== null) {
      if (match[1] && match[1].trim().length > 0) {
        codeBlocks.push(match[1].trim());
      }
    }
    
    return codeBlocks;
  }

  /**
   * Sanitize metadata for safe serialization
   */
  private static sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      // Skip functions and circular references
      if (typeof value === 'function') {continue;}
      
      try {
        JSON.stringify(value); // Test serialization
        sanitized[key] = value;
      } catch (error) {
        sanitized[key] = String(value);
      }
    }
    
    return sanitized;
  }

  /**
   * Extract error messages
   */
  private static extractErrors(result: AnalysisResult): string[] {
    const errors: string[] = [];
    
    if (!result.success) {
      errors.push('Analysis execution failed');
    }
    
    if (result.metadata?.errors && Array.isArray(result.metadata.errors)) {
      errors.push(...result.metadata.errors);
    }
    
    return errors;
  }

  /**
   * Extract warning messages
   */
  private static extractWarnings(result: AnalysisResult): string[] {
    const warnings: string[] = [];
    
    if (result.metadata?.warnings && Array.isArray(result.metadata.warnings)) {
      warnings.push(...result.metadata.warnings);
    }
    
    // Performance warnings
    if (result.executionTime && result.executionTime > 5000) {
      warnings.push('Analysis took longer than expected (>5 seconds)');
    }
    
    const memoryEfficiency = this.calculateMemoryEfficiency(result.memoryUsed || 0);
    if (memoryEfficiency < 60) {
      warnings.push(`Memory efficiency is low (${memoryEfficiency.toFixed(1)}%)`);
    }
    
    return warnings;
  }

  /**
   * Calculate memory efficiency percentage
   */
  private static calculateMemoryEfficiency(memoryUsed: number): number {
    if (!memoryUsed) {return 0;}
    
    const totalMemory = process.memoryUsage().rss;
    const efficiency = ((totalMemory - memoryUsed) / totalMemory) * 100;
    
    return Math.max(0, Math.min(100, efficiency));
  }

  /**
   * Format multiple provider results for comparison
   */
  static formatMultiProviderResults(
    results: Array<{ provider: string; result: AnalysisResult; startTime: number }>
  ): {
    primary: FormattedResponse;
    alternatives: FormattedResponse[];
    comparison: {
      fastestProvider: string;
      mostConfident: string;
      averageConfidence: number;
      totalTime: number;
    };
  } {
    const formatted = results.map(r => 
      this.formatAnalysisResult(r.result, r.provider, r.startTime)
    );
    
    const comparison = {
      fastestProvider: formatted.reduce((fastest, current) => 
        current.executionTime < fastest.executionTime ? current : fastest
      ).provider,
      mostConfident: formatted.reduce((most, current) => 
        current.confidence > most.confidence ? current : most
      ).provider,
      averageConfidence: formatted.reduce((sum, r) => sum + r.confidence, 0) / formatted.length,
      totalTime: formatted.reduce((sum, r) => sum + r.executionTime, 0)
    };
    
    return {
      primary: formatted[0],
      alternatives: formatted.slice(1),
      comparison
    };
  }

  /**
   * Create summary for dashboard/monitoring
   */
  static createAnalysisSummary(response: FormattedResponse): Record<string, any> {
    return {
      success: response.success,
      provider: response.provider,
      confidence: response.confidence,
      responseTime: response.performance.responseTime,
      memoryEfficiency: response.performance.memoryEfficiency,
      recommendationCount: response.recommendations.length,
      codeExampleCount: response.codeExamples.length,
      hasErrors: response.errors && response.errors.length > 0,
      hasWarnings: response.warnings && response.warnings.length > 0,
      timestamp: new Date().toISOString()
    };
  }
}