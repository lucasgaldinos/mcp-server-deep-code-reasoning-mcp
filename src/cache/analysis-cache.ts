/**
 * @fileoverview Analysis Cache System
 * @description Implements caching for analysis results and file contents with TTL support
 */

import { Logger } from '../utils/logger.js';

/**
 * Interface for cached entries with TTL support
 */
export interface CacheEntry<T> {
  /** The cached value */
  value: T;
  /** Timestamp when the entry was created */
  timestamp: number;
  /** Time to live in milliseconds */
  ttl: number;
  /** Size of the cached entry in bytes */
  size: number;
  /** Number of times this entry has been accessed */
  accessCount: number;
  /** Last access timestamp */
  lastAccessed: number;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  /** Total number of entries in cache */
  entryCount: number;
  /** Total memory usage in bytes */
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
 * Cache configuration options
 */
export interface CacheConfig {
  /** Maximum number of entries */
  maxSize: number;
  /** Default TTL in milliseconds */
  defaultTtl: number;
  /** Maximum memory usage in bytes */
  maxMemoryUsage: number;
  /** Cleanup interval in milliseconds */
  cleanupInterval: number;
  /** Enable LRU eviction */
  enableLru: boolean;
}

/**
 * Analysis cache implementation with TTL, size limits, and LRU eviction
 */
export class AnalysisCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };
  private cleanupTimer?: NodeJS.Timeout;
  private logger = new Logger('AnalysisCache');

  constructor(private config: CacheConfig) {
    this.startCleanupTimer();
    this.logger.info('AnalysisCache initialized', {
      maxSize: config.maxSize,
      defaultTtl: config.defaultTtl,
      maxMemoryUsage: config.maxMemoryUsage,
    });
  }

  /**
   * Store a value in the cache
   */
  set(key: string, value: T, ttl?: number): void {
    const entryTtl = ttl ?? this.config.defaultTtl;
    const size = this.calculateSize(value);
    const now = Date.now();

    // Check memory limits before adding
    if (this.shouldEvictForMemory(size)) {
      this.evictLru();
    }

    // Check size limits
    if (this.cache.size >= this.config.maxSize) {
      this.evictLru();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      ttl: entryTtl,
      size,
      accessCount: 0,
      lastAccessed: now,
    };

    this.cache.set(key, entry);

    this.logger.debug('Cache entry added', {
      key,
      size,
      ttl: entryTtl,
      totalEntries: this.cache.size,
    });
  }

  /**
   * Retrieve a value from the cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.logger.debug('Cache miss', { key });
      return undefined;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      this.logger.debug('Cache entry expired', { key });
      return undefined;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    this.logger.debug('Cache hit', {
      key,
      accessCount: entry.accessCount,
    });

    return entry.value;
  }

  /**
   * Check if a key exists in the cache (without updating access stats)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Remove a specific key from the cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug('Cache entry deleted', { key });
    }
    return deleted;
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    this.stats.evictions += count;
    this.logger.info('Cache cleared', { evictedEntries: count });
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    const memoryUsage = this.calculateTotalMemoryUsage();
    const utilization = this.config.maxSize > 0 ? this.cache.size / this.config.maxSize : 0;

    return {
      entryCount: this.cache.size,
      memoryUsage,
      hitRate,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      utilization,
    };
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entry metadata without accessing the value
   */
  getEntryMetadata(key: string): Omit<CacheEntry<T>, 'value'> | undefined {
    const entry = this.cache.get(key);
    if (!entry) {return undefined;}

    return {
      timestamp: entry.timestamp,
      ttl: entry.ttl,
      size: entry.size,
      accessCount: entry.accessCount,
      lastAccessed: entry.lastAccessed,
    };
  }

  /**
   * Remove expired entries manually
   */
  cleanup(): number {
    const _initialSize = this.cache.size;
    const _now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }

    const removedCount = expiredKeys.length;
    this.stats.evictions += removedCount;

    if (removedCount > 0) {
      this.logger.debug('Cleanup completed', {
        removedEntries: removedCount,
        remainingEntries: this.cache.size,
      });
    }

    return removedCount;
  }

  /**
   * Destroy the cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
    this.logger.info('AnalysisCache destroyed');
  }

  /**
   * Start the automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.config.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, this.config.cleanupInterval);
    }
  }

  /**
   * Check if an entry has expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Calculate the approximate size of a value in bytes
   */
  private calculateSize(value: T): number {
    try {
      // Simple estimation based on JSON serialization
      const jsonString = JSON.stringify(value);
      return Buffer.byteLength(jsonString, 'utf8');
    } catch {
      // Fallback estimation for non-serializable objects
      return 1024; // 1KB default
    }
  }

  /**
   * Calculate total memory usage of the cache
   */
  private calculateTotalMemoryUsage(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.size;
    }
    return total;
  }

  /**
   * Check if we should evict entries due to memory constraints
   */
  private shouldEvictForMemory(newEntrySize: number): boolean {
    const currentUsage = this.calculateTotalMemoryUsage();
    return currentUsage + newEntrySize > this.config.maxMemoryUsage;
  }

  /**
   * Evict the least recently used entry
   */
  private evictLru(): void {
    if (this.cache.size === 0) {return;}

    let lruKey: string | undefined;
    let lruTime = Number.MAX_SAFE_INTEGER; // Start with maximum value to find minimum

    // Find the least recently used entry
    for (const [key, entry] of this.cache.entries()) {
      if (this.config.enableLru) {
        if (entry.lastAccessed < lruTime) {
          lruTime = entry.lastAccessed;
          lruKey = key;
        }
      } else {
        // If LRU is disabled, use FIFO (oldest timestamp)
        if (entry.timestamp < lruTime) {
          lruTime = entry.timestamp;
          lruKey = key;
        }
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
      this.logger.debug('LRU eviction', {
        evictedKey: lruKey,
        strategy: this.config.enableLru ? 'LRU' : 'FIFO',
      });
    }
  }
}

/**
 * Specialized cache for analysis results
 */
export class AnalysisResultCache extends AnalysisCache<any> {
  constructor(config?: Partial<CacheConfig>) {
    const defaultConfig: CacheConfig = {
      maxSize: 1000,
      defaultTtl: 30 * 60 * 1000, // 30 minutes
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      enableLru: true,
    };

    super({ ...defaultConfig, ...config });
  }

  /**
   * Generate a cache key for analysis results
   */
  static generateKey(
    analysisType: string,
    fileHashes: string[],
    query: string,
    options?: Record<string, any>,
  ): string {
    const hashPart = fileHashes.sort().join(',');
    const optionsPart = options ? JSON.stringify(options) : '';
    const content = `${analysisType}:${hashPart}:${query}:${optionsPart}`;

    // Create a simple hash
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `analysis:${Math.abs(hash).toString(36)}`;
  }
}

/**
 * Specialized cache for file contents
 */
export class FileContentCache extends AnalysisCache<string> {
  constructor(config?: Partial<CacheConfig>) {
    const defaultConfig: CacheConfig = {
      maxSize: 500,
      defaultTtl: 15 * 60 * 1000, // 15 minutes
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
      cleanupInterval: 2 * 60 * 1000, // 2 minutes
      enableLru: true,
    };

    super({ ...defaultConfig, ...config });
  }

  /**
   * Generate a cache key for file contents
   */
  static generateKey(filePath: string, lastModified?: number): string {
    const modifiedPart = lastModified ? `:${lastModified}` : '';
    return `file:${filePath}${modifiedPart}`;
  }
}
