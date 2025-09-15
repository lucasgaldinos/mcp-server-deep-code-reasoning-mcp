/**
 * @fileoverview Simple Cache System for Personal Use
 * @description A simplified caching implementation using node-cache for TTL and memory management
 */

import NodeCache from 'node-cache';

/**
 * Cache entry metadata (simplified)
 */
export interface CacheEntryMetadata {
  accessCount: number;
  lastAccessed: number;
  ttl: number;
  size: number;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  /** Total number of entries in cache */
  entryCount: number;
  /** Total memory usage in bytes (estimated) */
  memoryUsage: number;
  /** Cache hit rate (0-1) */
  hitRate: number;
  /** Total number of hits */
  hits: number;
  /** Total number of misses */
  misses: number;
  /** Number of expired entries removed */
  evictions: number;
  /** Cache utilization percentage */
  utilization: number;
}

/**
 * Simple cache configuration options
 */
export interface SimpleCacheConfig {
  /** Maximum number of entries (default: 1000) */
  maxSize?: number;
  /** Default TTL in milliseconds (default: 5 minutes) */
  defaultTtl?: number;
  /** Maximum memory usage in bytes (default: 50MB) */
  maxMemoryUsage?: number;
  /** Cleanup interval in milliseconds (default: 10 minutes) */
  cleanupInterval?: number;
  /** Enable LRU eviction (default: true) */
  enableLru?: boolean;
}

/**
 * Simplified Analysis Cache using node-cache
 * Provides the same interface as the complex AnalysisCache but with simple implementation
 */
export class SimpleCache<T> {
  private cache: NodeCache;
  private hitCount = 0;
  private missCount = 0;
  private config: Required<SimpleCacheConfig>;
  private accessCounts = new Map<string, number>();
  private lastAccessTimes = new Map<string, number>();

  constructor(config: SimpleCacheConfig = {}) {
    this.config = {
      maxSize: config.maxSize ?? 1000,
      defaultTtl: config.defaultTtl ?? 5 * 60 * 1000, // 5 minutes
      maxMemoryUsage: config.maxMemoryUsage ?? 50 * 1024 * 1024, // 50MB
      cleanupInterval: config.cleanupInterval ?? 10 * 60 * 1000, // 10 minutes
      enableLru: config.enableLru ?? true,
    };

    // Initialize node-cache with appropriate settings
    this.cache = new NodeCache({
      stdTTL: Math.floor(this.config.defaultTtl / 1000), // node-cache uses seconds
      checkperiod: Math.floor(this.config.cleanupInterval / 1000), // node-cache uses seconds
      useClones: true, // Safe cloning for personal use
      maxKeys: this.config.maxSize,
      deleteOnExpire: true,
    });

    // Track hits and misses
    this.cache.on('hit', () => {
      this.hitCount++;
    });

    this.cache.on('miss', () => {
      this.missCount++;
    });
  }

  /**
   * Store a value with optional TTL
   */
  set(key: string, value: T, ttl?: number): boolean {
    try {
      if (ttl !== undefined) {
        // Convert milliseconds to seconds for node-cache
        return this.cache.set(key, value, Math.floor(ttl / 1000));
      } else {
        return this.cache.set(key, value);
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Retrieve a value by key
   */
  get(key: string): T | undefined {
    const value = this.cache.get<T>(key);
    if (value !== undefined) {
      this.hitCount++;
      // Track access metadata
      this.accessCounts.set(key, (this.accessCounts.get(key) || 0) + 1);
      this.lastAccessTimes.set(key, Date.now());
    } else {
      this.missCount++;
    }
    return value;
  }

  /**
   * Check if a key exists
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete a key
   */
  delete(key: string): boolean {
    const result = this.cache.del(key) === 1;
    if (result) {
      // Clean up metadata
      this.accessCounts.delete(key);
      this.lastAccessTimes.delete(key);
    }
    return result;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.flushAll();
    this.hitCount = 0;
    this.missCount = 0;
    this.accessCounts.clear();
    this.lastAccessTimes.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const stats = this.cache.getStats();
    const totalRequests = this.hitCount + this.missCount;

    return {
      entryCount: stats.keys,
      memoryUsage: stats.vsize + stats.ksize, // Approximate memory usage
      hitRate: totalRequests > 0 ? this.hitCount / totalRequests : 0,
      hits: this.hitCount,
      misses: this.missCount,
      evictions: 0, // node-cache doesn't track this separately
      utilization: this.config.maxSize > 0 ? stats.keys / this.config.maxSize : 0,
    };
  }

  /**
   * Get all keys (for testing)
   */
  keys(): string[] {
    return this.cache.keys();
  }

  /**
   * Get entry metadata (simplified)
   */
  getEntryMetadata(key: string): CacheEntryMetadata | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    const ttl = this.cache.getTtl(key);
    return {
      accessCount: this.accessCounts.get(key) || 0,
      lastAccessed: this.lastAccessTimes.get(key) || 0,
      ttl: ttl || 0,
      size: 0, // Simplified - not tracking exact size
    };
  }

  /**
   * Manual cleanup (simplified - node-cache handles this automatically)
   */
  cleanup(): number {
    // For compatibility, but node-cache handles cleanup automatically
    return 0;
  }

  /**
   * Destroy the cache and cleanup resources
   */
  destroy(): void {
    this.cache.close();
    this.hitCount = 0;
    this.missCount = 0;
    this.accessCounts.clear();
    this.lastAccessTimes.clear();
  }
}

/**
 * Main AnalysisCache class for backward compatibility
 */
export class AnalysisCache<T> extends SimpleCache<T> {
  constructor(config: SimpleCacheConfig = {}) {
    super(config);
  }
}

/**
 * Specialized caches for common use cases
 */
export class AnalysisResultCache extends SimpleCache<any> {
  constructor(config: SimpleCacheConfig = {}) {
    super({
      defaultTtl: 10 * 60 * 1000, // 10 minutes for analysis results
      maxSize: 500,
      ...config,
    });
  }

  /**
   * Generate a cache key for analysis results
   */
  static generateKey(filePath: string, analysisType: string, options?: any): string {
    const optionsStr = options ? JSON.stringify(options) : '';
    return `analysis:${filePath}:${analysisType}:${optionsStr}`;
  }
}

export class FileContentCache extends SimpleCache<string> {
  constructor(config: SimpleCacheConfig = {}) {
    super({
      defaultTtl: 5 * 60 * 1000, // 5 minutes for file contents
      maxSize: 200,
      ...config,
    });
  }

  /**
   * Generate a cache key for file contents
   */
  static generateKey(filePath: string, lastModified?: number): string {
    return lastModified ? `file:${filePath}:${lastModified}` : `file:${filePath}`;
  }
}
