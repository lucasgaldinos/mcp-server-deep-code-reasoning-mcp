/**
 * @fileoverview Simple Service Manager Tests for Personal Use
 */

import { SimpleServiceManager, getServiceManager, resetServiceManager } from '../utils/simple-service-manager.js';
import { SimpleCache } from '../cache/simple-cache.js';

describe('SimpleServiceManager - Personal Use', () => {
  let manager: SimpleServiceManager;

  beforeEach(() => {
    manager = new SimpleServiceManager({
      devMode: true,
      cache: {
        defaultTtl: 60000,
        maxSize: 100,
      },
    });
  });

  afterEach(() => {
    manager.clear();
  });

  describe('core functionality', () => {
    it('should create and return services', () => {
      const cache = manager.get<SimpleCache<any>>('analysisCache');
      expect(cache).toBeDefined();
      expect(cache).toBeInstanceOf(SimpleCache);
    });

    it('should return same instance for repeated calls (singleton)', () => {
      const cache1 = manager.get<SimpleCache<any>>('analysisCache');
      const cache2 = manager.get<SimpleCache<any>>('analysisCache');
      expect(cache1).toBe(cache2);
    });

    it('should check service existence', () => {
      expect(manager.has('analysisCache')).toBe(false);
      manager.get('analysisCache');
      expect(manager.has('analysisCache')).toBe(true);
    });

    it('should clear all services', () => {
      manager.get('analysisCache');
      expect(manager.has('analysisCache')).toBe(true);
      manager.clear();
      expect(manager.has('analysisCache')).toBe(false);
    });

    it('should throw error for unknown service', () => {
      expect(() => manager.get('unknownService')).toThrow('Unknown service: unknownService');
    });
  });

  describe('service creation', () => {
    it('should create analysis cache with config', () => {
      const cache = manager.get<SimpleCache<any>>('analysisCache');
      expect(cache).toBeDefined();
    });

    it('should create analysis result cache', () => {
      const cache = manager.get('analysisResultCache');
      expect(cache).toBeDefined();
    });

    it('should create file content cache', () => {
      const cache = manager.get('fileContentCache');
      expect(cache).toBeDefined();
    });

    it('should create conversation manager', () => {
      const manager = getServiceManager().get('conversationManager');
      expect(manager).toBeDefined();
    });
  });

  describe('statistics', () => {
    it('should provide service statistics', () => {
      manager.get('analysisCache');
      manager.get('fileContentCache');

      const stats = manager.getStats();
      expect(stats.serviceCount).toBe(2);
      expect(stats.services).toEqual(['analysisCache', 'fileContentCache']);
      expect(stats.config.devMode).toBe(true);
    });
  });

  describe('global manager', () => {
    afterEach(() => {
      resetServiceManager();
    });

    it('should provide global service manager', () => {
      const manager1 = getServiceManager();
      const manager2 = getServiceManager();
      expect(manager1).toBe(manager2);
    });

    it('should reset global manager', () => {
      const manager1 = getServiceManager();
      resetServiceManager();
      const manager2 = getServiceManager();
      expect(manager1).not.toBe(manager2);
    });
  });
});
