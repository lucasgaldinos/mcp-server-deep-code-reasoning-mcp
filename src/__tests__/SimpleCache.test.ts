/**
 * @fileoverview Simplified Tests for Personal Use Cache
 */

import { SimpleCache, AnalysisResultCache, FileContentCache } from '../cache/simple-cache.js';

describe('SimpleCache - Personal Use', () => {
  let cache: SimpleCache<string>;

  beforeEach(() => {
    cache = new SimpleCache({
      maxSize: 10,
      defaultTtl: 60 * 1000, // 1 minute
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('core functionality', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for missing keys', () => {
      expect(cache.get('missing')).toBeUndefined();
    });

    it('should check key existence', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('missing')).toBe(false);
    });

    it('should delete keys', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.delete('missing')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });
  });

  describe('basic statistics', () => {
    it('should track basic stats', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('missing'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
      expect(stats.entryCount).toBe(1);
    });
  });

  describe('TTL basic functionality', () => {
    it('should store values with custom TTL', () => {
      cache.set('key1', 'value1', 100); // 100ms TTL
      expect(cache.get('key1')).toBe('value1');
    });

    it('should use default TTL when not specified', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });
  });
});

describe('AnalysisResultCache - Personal Use', () => {
  let cache: AnalysisResultCache;

  beforeEach(() => {
    cache = new AnalysisResultCache();
  });

  afterEach(() => {
    cache.destroy();
  });

  it('should generate cache keys', () => {
    const key1 = AnalysisResultCache.generateKey('file.ts', 'syntax');
    const key2 = AnalysisResultCache.generateKey('file.ts', 'complexity');
    
    expect(key1).toContain('file.ts');
    expect(key1).toContain('syntax');
    expect(key1).not.toBe(key2);
  });

  it('should cache analysis results', () => {
    const result = { issues: [], complexity: 5 };
    const key = AnalysisResultCache.generateKey('file.ts', 'syntax');
    
    cache.set(key, result);
    expect(cache.get(key)).toEqual(result);
  });
});

describe('FileContentCache - Personal Use', () => {
  let cache: FileContentCache;

  beforeEach(() => {
    cache = new FileContentCache();
  });

  afterEach(() => {
    cache.destroy();
  });

  it('should generate file cache keys', () => {
    const key1 = FileContentCache.generateKey('/path/file.ts');
    const key2 = FileContentCache.generateKey('/path/file.ts', 123456);
    
    expect(key1).toContain('/path/file.ts');
    expect(key2).toContain('123456');
    expect(key1).not.toBe(key2);
  });

  it('should cache file contents', () => {
    const content = 'function test() { return true; }';
    const key = FileContentCache.generateKey('/path/file.ts');
    
    cache.set(key, content);
    expect(cache.get(key)).toBe(content);
  });
});
