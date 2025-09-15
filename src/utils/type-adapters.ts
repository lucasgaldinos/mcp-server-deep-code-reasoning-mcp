/**
 * Type Adapters
 * 
 * Provides utilities to convert between different type representations
 * used by research components and existing API interfaces.
 */

import { AnalysisResult, Provider } from '@models/types.js';
import { ProviderResult } from '@services/api-manager.js';

/**
 * Converts ProviderResult to AnalysisResult for compatibility with research components
 */
export function providerResultToAnalysisResult(providerResult: ProviderResult): AnalysisResult {
  return {
    success: true, // ProviderResult implies success
    analysis: providerResult.result.analysis,
    confidence: providerResult.result.confidence,
    strategy: providerResult.result.strategy,
    executionTime: providerResult.duration,
    memoryUsed: providerResult.memoryUsed,
    metadata: {
      ...providerResult.result.metadata,
      provider: providerResult.provider,
      cost: providerResult.cost,
      originalResult: providerResult.result
    }
  };
}

/**
 * Converts AnalysisResult to ProviderResult for compatibility with API manager
 */
export function analysisResultToProviderResult(
  analysisResult: AnalysisResult, 
  provider: string,
  cost: number = 0
): ProviderResult {
  return {
    provider,
    result: analysisResult,
    cost,
    duration: analysisResult.executionTime,
    memoryUsed: analysisResult.memoryUsed
  };
}

/**
 * Converts array of ProviderResults to AnalysisResults
 */
export function providerResultsToAnalysisResults(providerResults: ProviderResult[]): AnalysisResult[] {
  return providerResults.map(providerResultToAnalysisResult);
}

/**
 * Converts array of AnalysisResults to ProviderResults
 */
export function analysisResultsToProviderResults(
  analysisResults: AnalysisResult[], 
  provider: string,
  cost: number = 0
): ProviderResult[] {
  return analysisResults.map(result => 
    analysisResultToProviderResult(result, provider, cost)
  );
}

/**
 * Type guard to check if object is ProviderResult
 */
export function isProviderResult(obj: any): obj is ProviderResult {
  return obj && 
    typeof obj.provider === 'string' &&
    obj.result &&
    typeof obj.cost === 'number' &&
    typeof obj.duration === 'number' &&
    typeof obj.memoryUsed === 'number';
}

/**
 * Type guard to check if object is AnalysisResult
 */
export function isAnalysisResult(obj: any): obj is AnalysisResult {
  return obj &&
    typeof obj.success === 'boolean' &&
    typeof obj.analysis === 'string' &&
    typeof obj.confidence === 'number' &&
    typeof obj.strategy === 'string' &&
    typeof obj.executionTime === 'number' &&
    typeof obj.memoryUsed === 'number';
}

/**
 * Safely converts between result types with validation
 */
export function safeConvertToAnalysisResult(result: ProviderResult | AnalysisResult): AnalysisResult {
  if (isAnalysisResult(result)) {
    return result;
  }
  
  if (isProviderResult(result)) {
    return providerResultToAnalysisResult(result);
  }
  
  throw new Error('Invalid result type - must be ProviderResult or AnalysisResult');
}

/**
 * Safely converts between result types with validation
 */
export function safeConvertToProviderResult(
  result: ProviderResult | AnalysisResult, 
  provider: string,
  cost: number = 0
): ProviderResult {
  if (isProviderResult(result)) {
    return result;
  }
  
  if (isAnalysisResult(result)) {
    return analysisResultToProviderResult(result, provider, cost);
  }
  
  throw new Error('Invalid result type - must be ProviderResult or AnalysisResult');
}