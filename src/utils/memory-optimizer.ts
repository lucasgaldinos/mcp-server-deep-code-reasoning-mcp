/**
 * Memory Optimizer
 * 
 * Addresses memory efficiency issues identified in performance monitoring.
 * Target: Improve memory efficiency from 34.27% to >60%
 */
export class MemoryOptimizer {
  private static instance: MemoryOptimizer;
  private memoryThreshold = 0.8; // 80% of available memory
  private gcInterval = 30000; // 30 seconds
  private lastGCTime = 0;
  private memoryCache = new Map<string, { data: any; timestamp: number; size: number }>();
  private maxCacheSize = 100 * 1024 * 1024; // 100MB
  private currentCacheSize = 0;
  private monitoringInterval?: NodeJS.Timeout;

  private constructor() {
    this.startMemoryMonitoring();
  }

  static getInstance(): MemoryOptimizer {
    if (!MemoryOptimizer.instance) {
      MemoryOptimizer.instance = new MemoryOptimizer();
    }
    return MemoryOptimizer.instance;
  }

  /**
   * Optimize memory usage for large analysis operations
   */
  async optimizeForAnalysis<T>(operation: () => Promise<T>): Promise<T> {
    // Pre-operation cleanup
    await this.cleanup();
    
    const startMemory = process.memoryUsage();
    
    try {
      const result = await operation();
      
      // Post-operation cleanup if memory usage is high
      const currentMemory = process.memoryUsage();
      const memoryIncrease = currentMemory.heapUsed - startMemory.heapUsed;
      
      if (memoryIncrease > 50 * 1024 * 1024) { // If operation used >50MB
        await this.aggressiveCleanup();
      }
      
      return result;
    } catch (error) {
      // Cleanup on error as well
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Cache data with automatic size management
   */
  cacheSet(key: string, data: any): void {
    // Estimate data size
    const size = this.estimateSize(data);
    
    // Check if we need to evict items
    if (this.currentCacheSize + size > this.maxCacheSize) {
      this.evictLRUItems(size);
    }
    
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      size
    });
    
    this.currentCacheSize += size;
  }

  /**
   * Retrieve cached data
   */
  cacheGet(key: string): any | undefined {
    const item = this.memoryCache.get(key);
    if (!item) {return undefined;}
    
    // Update timestamp for LRU
    item.timestamp = Date.now();
    return item.data;
  }

  /**
   * Clear specific cache entry
   */
  cacheClear(key: string): void {
    const item = this.memoryCache.get(key);
    if (item) {
      this.currentCacheSize -= item.size;
      this.memoryCache.delete(key);
    }
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): {
    usage: NodeJS.MemoryUsage;
    efficiency: number;
    cacheSize: number;
    cacheEntries: number;
    recommendations: string[];
  } {
    const usage = process.memoryUsage();
    const efficiency = this.calculateMemoryEfficiency(usage);
    
    const recommendations: string[] = [];
    
    if (efficiency < 60) {
      recommendations.push('Memory efficiency below target - consider reducing cache size');
    }
    
    if (usage.heapUsed > 500 * 1024 * 1024) { // >500MB
      recommendations.push('High memory usage detected - run garbage collection');
    }
    
    if (this.currentCacheSize > this.maxCacheSize * 0.9) { // >90% cache full
      recommendations.push('Cache nearly full - consider evicting old entries');
    }
    
    return {
      usage,
      efficiency,
      cacheSize: this.currentCacheSize,
      cacheEntries: this.memoryCache.size,
      recommendations
    };
  }

  /**
   * Force memory optimization
   */
  async forceOptimization(): Promise<{
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    freed: number;
    efficiency: number;
  }> {
    const before = process.memoryUsage();
    
    // Clear cache
    this.clearCache();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Wait a bit for GC to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const after = process.memoryUsage();
    const freed = before.heapUsed - after.heapUsed;
    const efficiency = this.calculateMemoryEfficiency(after);
    
    return { before, after, freed, efficiency };
  }

  /**
   * Stream large data processing to reduce memory footprint
   */
  async processInChunks<T, R>(
    data: T[],
    processor: (chunk: T[]) => Promise<R[]>,
    chunkSize: number = 100
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      
      // Process chunk
      const chunkResults = await this.optimizeForAnalysis(() => processor(chunk));
      results.push(...chunkResults);
      
      // Cleanup after each chunk
      if (i % (chunkSize * 5) === 0) { // Every 5 chunks
        await this.cleanup();
      }
    }
    
    return results;
  }

  /**
   * Monitor memory usage and trigger cleanup when needed
   */
  private startMemoryMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      const usage = process.memoryUsage();
      const efficiency = this.calculateMemoryEfficiency(usage);
      
      if (efficiency < 40) { // Critical memory situation
        console.warn('MemoryOptimizer: Critical memory usage detected, forcing cleanup');
        await this.aggressiveCleanup();
      } else if (efficiency < 60) { // Below target
        await this.cleanup();
      }
      
    }, this.gcInterval);
  }

  /**
   * Stop memory monitoring
   */
  private stopMemoryMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Regular cleanup
   */
  private async cleanup(): Promise<void> {
    const now = Date.now();
    
    // Only run GC if enough time has passed
    if (now - this.lastGCTime < this.gcInterval) {
      return;
    }
    
    // Clear old cache entries (older than 5 minutes)
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const entries = Array.from(this.memoryCache.entries());
    for (const [key, item] of entries) {
      if (item.timestamp < fiveMinutesAgo) {
        this.cacheClear(key);
      }
    }
    
    // Run garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    this.lastGCTime = now;
  }

  /**
   * Aggressive cleanup for critical situations
   */
  private async aggressiveCleanup(): Promise<void> {
    // Clear all cache
    this.clearCache();
    
    // Multiple GC passes
    if (global.gc) {
      for (let i = 0; i < 3; i++) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    this.lastGCTime = Date.now();
  }

  /**
   * Evict least recently used cache items
   */
  private evictLRUItems(spaceNeeded: number): void {
    const items = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    let freedSpace = 0;
    for (const [key, item] of items) {
      this.cacheClear(key);
      freedSpace += item.size;
      
      if (freedSpace >= spaceNeeded) {
        break;
      }
    }
  }

  /**
   * Clear all cache
   */
  private clearCache(): void {
    this.memoryCache.clear();
    this.currentCacheSize = 0;
  }

  /**
   * Estimate object size in bytes
   */
  private estimateSize(obj: any): number {
    try {
      const str = JSON.stringify(obj);
      return str.length * 2; // Rough estimate (UTF-16)
    } catch {
      return 1024; // Default size for non-serializable objects
    }
  }

  /**
   * Calculate memory efficiency percentage
   */
  private calculateMemoryEfficiency(usage: NodeJS.MemoryUsage): number {
    // Efficiency = (1 - heapUsed/rss) * 100
    const efficiency = (1 - usage.heapUsed / usage.rss) * 100;
    return Math.max(0, Math.min(100, efficiency));
  }

  /**
   * Memory-efficient string operations
   */
  static optimizeString(str: string, maxLength: number = 10000): string {
    if (str.length <= maxLength) {return str;}
    
    // Truncate with ellipsis
    return str.substring(0, maxLength - 3) + '...';
  }

  /**
   * Memory-efficient array operations
   */
  static optimizeArray<T>(arr: T[], maxLength: number = 1000): T[] {
    if (arr.length <= maxLength) {return arr;}
    
    // Return first and last elements with indication of truncation
    const truncated = [
      ...arr.slice(0, maxLength / 2),
      ...arr.slice(-maxLength / 2)
    ];
    
    return truncated;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.stopMemoryMonitoring();
    this.clearCache();
    // Clear the singleton instance
    MemoryOptimizer.instance = undefined as any;
  }
}