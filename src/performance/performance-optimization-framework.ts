/**
 * @fileoverview Performance Optimization Framework
 * Advanced caching, monitoring, and optimization system for enterprise deployment
 */

import { EventEmitter } from 'events';
import NodeCache from 'node-cache';
import { performance } from 'perf_hooks';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface PerformanceMetrics {
  timestamp: number;
  operation: string;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  metadata?: Record<string, any>;
}

interface CacheConfig {
  stdTTL: number; // Standard time to live in seconds
  checkperiod: number; // Check period for expired keys
  useClones: boolean; // Clone objects on get/set
  deleteOnExpire: boolean; // Delete expired keys
  maxKeys: number; // Maximum number of keys
}

interface OptimizationConfig {
  enableCaching: boolean;
  enableMetrics: boolean;
  enableProfiling: boolean;
  cacheConfig: CacheConfig;
  metricsRetentionDays: number;
  profilingThreshold: number; // Minimum duration to profile (ms)
}

interface PerformanceReport {
  timestamp: string;
  summary: {
    totalOperations: number;
    averageDuration: number;
    p95Duration: number;
    p99Duration: number;
    memoryEfficiency: number;
    cacheHitRatio: number;
  };
  bottlenecks: Array<{
    operation: string;
    averageDuration: number;
    occurrences: number;
    recommendation: string;
  }>;
  cacheStats: {
    hits: number;
    misses: number;
    keys: number;
    hitRate: number;
  };
  recommendations: string[];
}

/**
 * Performance Optimization Framework
 * Provides advanced caching, monitoring, and optimization for enterprise deployment
 */
export class PerformanceOptimizationFramework extends EventEmitter {
  private readonly cacheInstance: NodeCache;
  private readonly metrics: PerformanceMetrics[] = [];
  private readonly config: OptimizationConfig;
  private readonly operations: Map<string, number> = new Map(); // Track active operations

  constructor(config?: Partial<OptimizationConfig>) {
    super();

    this.config = {
      enableCaching: true,
      enableMetrics: true,
      enableProfiling: true,
      cacheConfig: {
        stdTTL: 600, // 10 minutes default
        checkperiod: 120, // 2 minutes
        useClones: false, // Better performance
        deleteOnExpire: true,
        maxKeys: 1000
      },
      metricsRetentionDays: 7,
      profilingThreshold: 100, // 100ms threshold
      ...config
    };

    this.cacheInstance = new NodeCache(this.config.cacheConfig);
    this.setupCacheEvents();
    this.startMetricsCleanup();
  }

  /**
   * Setup cache event listeners
   */
  private setupCacheEvents(): void {
    this.cacheInstance.on('hit', (key: string, value: any) => {
      this.emit('cache:hit', { key });
    });

    this.cacheInstance.on('miss', (key: string) => {
      this.emit('cache:miss', { key });
    });

    this.cacheInstance.on('expired', (key: string, value: any) => {
      this.emit('cache:expired', { key });
    });
  }

  /**
   * Start periodic metrics cleanup
   */
  private startMetricsCleanup(): void {
    if (!this.config.enableMetrics) {return;}

    const cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours
    setInterval(() => {
      this.cleanupOldMetrics();
    }, cleanupInterval);
  }

  /**
   * Clean up old metrics beyond retention period
   */
  private cleanupOldMetrics(): void {
    const retentionMs = this.config.metricsRetentionDays * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - retentionMs;
    
    const beforeCount = this.metrics.length;
    const filteredMetrics = this.metrics.filter(metric => metric.timestamp > cutoffTime);
    
    this.metrics.splice(0, this.metrics.length, ...filteredMetrics);
    
    const cleaned = beforeCount - this.metrics.length;
    if (cleaned > 0) {
      this.emit('metrics:cleanup', { cleaned, remaining: this.metrics.length });
    }
  }

  /**
   * Cache a value with optional TTL
   */
  cache(key: string, value: any, ttl?: number): boolean {
    if (!this.config.enableCaching) {return false;}

    try {
      return this.cacheInstance.set(key, value, ttl || this.config.cacheConfig.stdTTL);
    } catch (error) {
      this.emit('cache:error', { key, error });
      return false;
    }
  }

  /**
   * Retrieve a cached value
   */
  getCached<T = any>(key: string): T | undefined {
    if (!this.config.enableCaching) {return undefined;}

    try {
      return this.cacheInstance.get<T>(key);
    } catch (error) {
      this.emit('cache:error', { key, error });
      return undefined;
    }
  }

  /**
   * Remove a cached value
   */
  invalidateCache(key: string): boolean {
    if (!this.config.enableCaching) {return false;}

    try {
      return this.cacheInstance.del(key) > 0;
    } catch (error) {
      this.emit('cache:error', { key, error });
      return false;
    }
  }

  /**
   * Clear all cached values
   */
  clearCache(): void {
    if (!this.config.enableCaching) {return;}

    try {
      this.cacheInstance.flushAll();
      this.emit('cache:cleared');
    } catch (error) {
      this.emit('cache:error', { error });
    }
  }

  /**
   * Start performance monitoring for an operation
   */
  startOperation(operationId: string): string {
    if (!this.config.enableMetrics) {return operationId;}

    const startTime = performance.now();
    this.operations.set(operationId, startTime);
    
    this.emit('operation:start', { operationId, startTime });
    return operationId;
  }

  /**
   * End performance monitoring for an operation
   */
  endOperation(operationId: string, metadata?: Record<string, any>): PerformanceMetrics | null {
    if (!this.config.enableMetrics) {return null;}

    const startTime = this.operations.get(operationId);
    if (!startTime) {
      this.emit('operation:error', { operationId, error: 'Operation not found' });
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    
    this.operations.delete(operationId);

    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      operation: operationId,
      duration,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage ? process.cpuUsage() : undefined,
      metadata
    };

    this.metrics.push(metrics);

    // Emit profiling event if duration exceeds threshold
    if (duration > this.config.profilingThreshold) {
      this.emit('operation:slow', { operationId, duration, threshold: this.config.profilingThreshold });
    }

    this.emit('operation:end', metrics);
    return metrics;
  }

  /**
   * Time a function execution with automatic monitoring
   */
  async timeOperation<T>(
    operationName: string,
    operation: () => Promise<T> | T,
    metadata?: Record<string, any>
  ): Promise<T> {
    const operationId = `${operationName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.startOperation(operationId);
    
    try {
      const result = await operation();
      this.endOperation(operationId, { ...metadata, success: true });
      return result;
    } catch (error) {
      this.endOperation(operationId, { ...metadata, success: false, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { hits: number; misses: number; keys: number; hitRate: number } {
    if (!this.config.enableCaching) {
      return { hits: 0, misses: 0, keys: 0, hitRate: 0 };
    }

    const stats = this.cacheInstance.getStats();
    const hits = stats.hits || 0;
    const misses = stats.misses || 0;
    const total = hits + misses;
    
    return {
      hits,
      misses,
      keys: stats.keys || 0,
      hitRate: total > 0 ? (hits / total) * 100 : 0
    };
  }

  /**
   * Get performance metrics summary
   */
  getPerformanceSummary(): PerformanceReport['summary'] {
    if (this.metrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        memoryEfficiency: 100,
        cacheHitRatio: 0
      };
    }

    const durations = this.metrics.map(m => m.duration).sort((a, b) => a - b);
    const totalOperations = this.metrics.length;
    const averageDuration = durations.reduce((a, b) => a + b, 0) / totalOperations;
    
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);
    
    const p95Duration = durations[p95Index] || 0;
    const p99Duration = durations[p99Index] || 0;

    // Calculate memory efficiency (simplified metric)
    const recentMetrics = this.metrics.slice(-100); // Last 100 operations
    const avgHeapUsed = recentMetrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / recentMetrics.length;
    const avgHeapTotal = recentMetrics.reduce((sum, m) => sum + m.memoryUsage.heapTotal, 0) / recentMetrics.length;
    const memoryEfficiency = avgHeapTotal > 0 ? (1 - (avgHeapUsed / avgHeapTotal)) * 100 : 100;

    const cacheStats = this.getCacheStats();

    return {
      totalOperations,
      averageDuration,
      p95Duration,
      p99Duration,
      memoryEfficiency,
      cacheHitRatio: cacheStats.hitRate
    };
  }

  /**
   * Identify performance bottlenecks
   */
  identifyBottlenecks(): PerformanceReport['bottlenecks'] {
    const operationStats = new Map<string, { durations: number[]; count: number }>();

    // Group metrics by operation name
    for (const metric of this.metrics) {
      const baseName = metric.operation.split('-')[0]; // Remove timestamp and random suffix
      
      if (!operationStats.has(baseName)) {
        operationStats.set(baseName, { durations: [], count: 0 });
      }
      
      const stats = operationStats.get(baseName)!;
      stats.durations.push(metric.duration);
      stats.count++;
    }

    // Calculate average durations and identify bottlenecks
    const bottlenecks: PerformanceReport['bottlenecks'] = [];
    
    for (const [operation, stats] of operationStats) {
      const averageDuration = stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length;
      
      // Consider operations with >200ms average as potential bottlenecks
      if (averageDuration > 200) {
        let recommendation = 'Optimize operation performance';
        
        if (averageDuration > 1000) {
          recommendation = 'Critical: Consider caching, database optimization, or async processing';
        } else if (averageDuration > 500) {
          recommendation = 'Consider caching or algorithm optimization';
        }

        bottlenecks.push({
          operation,
          averageDuration,
          occurrences: stats.count,
          recommendation
        });
      }
    }

    return bottlenecks.sort((a, b) => b.averageDuration - a.averageDuration);
  }

  /**
   * Generate performance optimization recommendations
   */
  generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const summary = this.getPerformanceSummary();
    const bottlenecks = this.identifyBottlenecks();
    const cacheStats = this.getCacheStats();

    // Cache performance recommendations
    if (cacheStats.hitRate < 70) {
      recommendations.push(`🔄 Cache hit rate is ${cacheStats.hitRate.toFixed(1)}% - consider increasing TTL or cache size`);
    }

    if (cacheStats.keys > this.config.cacheConfig.maxKeys * 0.8) {
      recommendations.push('📦 Cache approaching capacity - consider increasing maxKeys or reducing TTL');
    }

    // Memory efficiency recommendations
    if (summary.memoryEfficiency < 60) {
      recommendations.push('🧠 Memory efficiency below 60% - investigate memory leaks or optimize data structures');
    }

    // Performance recommendations
    if (summary.p95Duration > 1000) {
      recommendations.push('⚡ 95th percentile response time >1s - immediate optimization needed');
    } else if (summary.p95Duration > 500) {
      recommendations.push('🚀 95th percentile response time >500ms - consider performance optimization');
    }

    // Bottleneck-specific recommendations
    if (bottlenecks.length > 0) {
      recommendations.push(`🎯 ${bottlenecks.length} performance bottlenecks identified - focus on slowest operations first`);
    }

    // General recommendations
    if (summary.totalOperations > 10000 && cacheStats.hitRate > 80) {
      recommendations.push('✅ Excellent performance profile - ready for high-load production deployment');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ No performance issues detected - system performing optimally');
    }

    return recommendations;
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport(): PerformanceReport {
    return {
      timestamp: new Date().toISOString(),
      summary: this.getPerformanceSummary(),
      bottlenecks: this.identifyBottlenecks(),
      cacheStats: this.getCacheStats(),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Save performance report to file
   */
  savePerformanceReport(reportPath?: string): string {
    const report = this.generatePerformanceReport();
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = reportPath || `performance-report-${timestamp}.json`;
    
    try {
      writeFileSync(filename, JSON.stringify(report, null, 2));
      this.emit('report:saved', { filename, report });
      return filename;
    } catch (error) {
      this.emit('report:error', { filename, error });
      throw error;
    }
  }

  /**
   * Load performance report from file
   */
  loadPerformanceReport(reportPath: string): PerformanceReport | null {
    try {
      if (!existsSync(reportPath)) {
        return null;
      }
      
      const content = readFileSync(reportPath, 'utf-8');
      const report = JSON.parse(content) as PerformanceReport;
      
      this.emit('report:loaded', { filename: reportPath, report });
      return report;
    } catch (error) {
      this.emit('report:error', { filename: reportPath, error });
      return null;
    }
  }

  /**
   * Print performance summary to console
   */
  printPerformanceSummary(): void {
    const report = this.generatePerformanceReport();
    
    console.log('\n⚡ PERFORMANCE OPTIMIZATION SUMMARY');
    console.log('=' .repeat(50));
    console.log(`Total Operations: ${report.summary.totalOperations}`);
    console.log(`Average Duration: ${report.summary.averageDuration.toFixed(2)}ms`);
    console.log(`95th Percentile: ${report.summary.p95Duration.toFixed(2)}ms`);
    console.log(`99th Percentile: ${report.summary.p99Duration.toFixed(2)}ms`);
    console.log(`Memory Efficiency: ${report.summary.memoryEfficiency.toFixed(1)}%`);
    console.log(`Cache Hit Rate: ${report.summary.cacheHitRatio.toFixed(1)}%`);

    if (report.bottlenecks.length > 0) {
      console.log('\n🎯 PERFORMANCE BOTTLENECKS:');
      report.bottlenecks.slice(0, 5).forEach((bottleneck, index) => {
        console.log(`  ${index + 1}. ${bottleneck.operation}: ${bottleneck.averageDuration.toFixed(2)}ms avg (${bottleneck.occurrences}x)`);
        console.log(`     💡 ${bottleneck.recommendation}`);
      });
    }

    if (report.recommendations.length > 0) {
      console.log('\n💡 OPTIMIZATION RECOMMENDATIONS:');
      report.recommendations.forEach(rec => console.log(`  ${rec}`));
    }

    console.log(`\n📊 Cache Stats: ${report.cacheStats.hits} hits, ${report.cacheStats.misses} misses, ${report.cacheStats.keys} keys`);
  }

  /**
   * Dispose and cleanup resources
   */
  dispose(): void {
    this.cacheInstance.close();
    this.operations.clear();
    this.metrics.splice(0, this.metrics.length);
    this.removeAllListeners();
  }
}

// Singleton instance for global usage
let globalPerformanceFramework: PerformanceOptimizationFramework | null = null;

/**
 * Get or create global performance framework instance
 */
export function getPerformanceFramework(config?: Partial<OptimizationConfig>): PerformanceOptimizationFramework {
  if (!globalPerformanceFramework) {
    globalPerformanceFramework = new PerformanceOptimizationFramework(config);
  }
  return globalPerformanceFramework;
}

/**
 * Convenience function to time an operation
 */
export async function timeOperation<T>(
  operationName: string,
  operation: () => Promise<T> | T,
  metadata?: Record<string, any>
): Promise<T> {
  const framework = getPerformanceFramework();
  return framework.timeOperation(operationName, operation, metadata);
}

/**
 * Convenience function to cache a value
 */
export function cacheValue(key: string, value: any, ttl?: number): boolean {
  const framework = getPerformanceFramework();
  return framework.cache(key, value, ttl);
}

/**
 * Convenience function to get a cached value
 */
export function getCachedValue<T = any>(key: string): T | undefined {
  const framework = getPerformanceFramework();
  return framework.getCached<T>(key);
}

export default PerformanceOptimizationFramework;