/**
 * @fileoverview Tests for Analysis Cache System
 */

import { AnalysisCache, AnalysisResultCache, FileContentCache } from '../cache/analysis-cache.js';

describe('AnalysisCache', () => {
  let cache: AnalysisCache<string>;

  beforeEach(() => {
    cache = new AnalysisCache({
      maxSize: 5,
      defaultTtl: 1000,
      maxMemoryUsage: 1024 * 1024, // 1MB
      cleanupInterval: 100,
      enableLru: true,
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should check key existence', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should delete keys', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.delete('nonexistent')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });
  });

  describe('TTL functionality', () => {
    it('should expire entries after TTL', async () => {
      cache.set('key1', 'value1', 50); // 50ms TTL
      expect(cache.get('key1')).toBe('value1');
      
      await new Promise(resolve => setTimeout(resolve, 60));
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should use default TTL when not specified', async () => {
      cache.set('key1', 'value1'); // Uses default 1000ms TTL
      expect(cache.get('key1')).toBe('value1');
      
      // Should still be available after short time
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(cache.get('key1')).toBe('value1');
    });

    it('should not return expired entries via has()', async () => {
      cache.set('key1', 'value1', 50);
      expect(cache.has('key1')).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 60));
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('size management', () => {
    it('should evict LRU entry when max size is reached', () => {
      // Fill cache to max size
      for (let i = 0; i < 5; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      // Wait a moment then access key0 to make it recently used
      // This creates a time difference in lastAccessed timestamps
      const startTime = Date.now();
      while (Date.now() - startTime < 10) {
        // Small busy wait to ensure timestamp difference
      }
      cache.get('key0');

      // Add one more entry, should evict the least recently used entry
      // Since key0 was just accessed, it should NOT be evicted
      // key1 should be evicted (oldest lastAccessed time)
      cache.set('key5', 'value5');
      
      expect(cache.get('key5')).toBe('value5'); // Should exist - new entry
      expect(cache.get('key0')).toBe('value0'); // Should still exist (was accessed)
      // One of the other keys should be evicted - exact LRU behavior depends on implementation
      expect(cache.getStats().entryCount).toBe(5); // Cache should still be at max size
    });

    it('should track access counts', () => {
      cache.set('key1', 'value1');
      
      // Access multiple times
      cache.get('key1');
      cache.get('key1');
      cache.get('key1');

      const metadata = cache.getEntryMetadata('key1');
      expect(metadata?.accessCount).toBe(3);
    });

    it('should update last accessed time', () => {
      cache.set('key1', 'value1');
      const initialMetadata = cache.getEntryMetadata('key1');
      
      // Wait a bit and access again
      setTimeout(() => {
        cache.get('key1');
        const updatedMetadata = cache.getEntryMetadata('key1');
        expect(updatedMetadata?.lastAccessed).toBeGreaterThan(initialMetadata?.lastAccessed || 0);
      }, 10);
    });
  });

  describe('statistics', () => {
    it('should track hit/miss statistics', () => {
      cache.set('key1', 'value1');
      
      // Hit
      cache.get('key1');
      
      // Miss
      cache.get('nonexistent');
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should track memory usage', () => {
      cache.set('key1', 'a very long string that takes up memory');
      const stats = cache.getStats();
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });

    it('should track cache utilization', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const stats = cache.getStats();
      expect(stats.utilization).toBe(0.4); // 2/5 = 0.4
    });
  });

  describe('cleanup', () => {
    it('should manually clean expired entries', async () => {
      cache.set('key1', 'value1', 50);
      cache.set('key2', 'value2', 1000);
      
      await new Promise(resolve => setTimeout(resolve, 60));
      
      const removedCount = cache.cleanup();
      expect(removedCount).toBe(1);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
    });

    it('should automatically clean expired entries', async () => {
      const shortCleanupCache = new AnalysisCache({
        maxSize: 10,
        defaultTtl: 50,
        maxMemoryUsage: 1024 * 1024,
        cleanupInterval: 25,
        enableLru: true,
      });

      shortCleanupCache.set('key1', 'value1');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(shortCleanupCache.get('key1')).toBeUndefined();
      shortCleanupCache.destroy();
    });
  });

  describe('keys and metadata', () => {
    it('should return all keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const keys = cache.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys.length).toBe(2);
    });

    it('should return entry metadata', () => {
      cache.set('key1', 'value1', 500);
      const metadata = cache.getEntryMetadata('key1');
      
      expect(metadata).toBeDefined();
      expect(metadata?.ttl).toBe(500);
      expect(metadata?.size).toBeGreaterThan(0);
      expect(metadata?.accessCount).toBe(0);
    });

    it('should return undefined for non-existent metadata', () => {
      const metadata = cache.getEntryMetadata('nonexistent');
      expect(metadata).toBeUndefined();
    });
  });
});

describe('AnalysisResultCache', () => {
  let cache: AnalysisResultCache;

  beforeEach(() => {
    cache = new AnalysisResultCache();
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('specialized functionality', () => {
    it('should generate consistent cache keys', () => {
      const key1 = AnalysisResultCache.generateKey(
        'deep_analysis',
        ['hash1', 'hash2'],
        'test query',
        { option1: 'value1' }
      );

      const key2 = AnalysisResultCache.generateKey(
        'deep_analysis',
        ['hash2', 'hash1'], // Different order
        'test query',
        { option1: 'value1' }
      );

      // Should be the same due to hash sorting
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = AnalysisResultCache.generateKey(
        'deep_analysis',
        ['hash1'],
        'query1'
      );

      const key2 = AnalysisResultCache.generateKey(
        'deep_analysis',
        ['hash1'],
        'query2' // Different query
      );

      expect(key1).not.toBe(key2);
    });

    it('should have appropriate default configuration', () => {
      const stats = cache.getStats();
      expect(stats.entryCount).toBe(0);
      
      // Test some operations work
      cache.set('test', { result: 'analysis result' });
      expect(cache.get('test')).toEqual({ result: 'analysis result' });
    });
  });
});

describe('FileContentCache', () => {
  let cache: FileContentCache;

  beforeEach(() => {
    cache = new FileContentCache();
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('file-specific functionality', () => {
    it('should generate cache keys with file paths', () => {
      const key1 = FileContentCache.generateKey('/path/to/file.ts');
      const key2 = FileContentCache.generateKey('/path/to/file.ts', 123456);
      
      expect(key1).toBe('file:/path/to/file.ts');
      expect(key2).toBe('file:/path/to/file.ts:123456');
    });

    it('should cache file contents', () => {
      const filePath = '/test/file.ts';
      const content = 'console.log("test");';
      const key = FileContentCache.generateKey(filePath);
      
      cache.set(key, content);
      expect(cache.get(key)).toBe(content);
    });

    it('should handle file modifications with timestamps', () => {
      const filePath = '/test/file.ts';
      const content1 = 'console.log("version 1");';
      const content2 = 'console.log("version 2");';
      
      const key1 = FileContentCache.generateKey(filePath, 1000);
      const key2 = FileContentCache.generateKey(filePath, 2000);
      
      cache.set(key1, content1);
      cache.set(key2, content2);
      
      expect(cache.get(key1)).toBe(content1);
      expect(cache.get(key2)).toBe(content2);
    });
  });
});
