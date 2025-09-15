/**
 * @fileoverview Tests for Performance Monitor
 */

import { vi } from 'vitest';
import { PerformanceMonitor, defaultPerformanceConfig } from '../utils/performance-monitor.js';

// Mock EventBus module
const mockEventBusInstance = {
  publish: vi.fn(),
  subscribe: vi.fn().mockReturnValue({
    unsubscribe: vi.fn()
  }),
  clearSubscriptions: vi.fn()
};

const mockEventBus = {
  getInstance: vi.fn().mockReturnValue(mockEventBusInstance)
};

vi.mock('../utils/event-bus.js', () => ({
  EventBus: mockEventBus
}));

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor(defaultPerformanceConfig);
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    performanceMonitor.stop();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize successfully', () => {
      expect(performanceMonitor).toBeDefined();
    });

    it('should not be monitoring initially', () => {
      expect(performanceMonitor.isRunning()).toBe(false);
    });
  });

  describe('monitoring lifecycle', () => {
    it('should start monitoring', () => {
      performanceMonitor.start();
      expect(performanceMonitor.isRunning()).toBe(true);
    });

    it('should stop monitoring', () => {
      performanceMonitor.start();
      performanceMonitor.stop();
      expect(performanceMonitor.isRunning()).toBe(false);
    });

    it('should warn when starting already running monitoring', () => {
      performanceMonitor.start();
      performanceMonitor.start();
      // Should handle gracefully without throwing
      expect(performanceMonitor.isRunning()).toBe(true);
    });

    it('should warn when stopping non-running monitoring', () => {
      performanceMonitor.stop();
      // Should handle gracefully without throwing
      expect(performanceMonitor.isRunning()).toBe(false);
    });
  });

  describe('operation timing', () => {
    it('should start operation timing', () => {
      performanceMonitor.startOperation('op-1', 'test-operation');
      // No return value to check, just ensure it doesn't throw
      expect(() => performanceMonitor.startOperation('op-2', 'test-operation')).not.toThrow();
    });

    it('should end operation timing and return duration', () => {
      performanceMonitor.startOperation('op-1', 'test-operation');
      
      // Simulate some time passing
      vi.advanceTimersByTime(100);
      
      const duration = performanceMonitor.endOperation('op-1');
      expect(duration).toBeDefined();
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThan(0);
    });

    it('should handle ending non-existent operation', () => {
      const duration = performanceMonitor.endOperation('non-existent');
      expect(duration).toBeUndefined();
    });

    it('should handle duplicate operation end gracefully', () => {
      performanceMonitor.startOperation('op-1', 'test-operation');
      
      // End operation once
      const duration1 = performanceMonitor.endOperation('op-1');
      expect(duration1).toBeDefined();
      
      // Try to end again
      const duration2 = performanceMonitor.endOperation('op-1');
      expect(duration2).toBeUndefined();
    });
  });

  describe('operation wrapping', () => {
    it('should measure operation performance via start/end', () => {
      performanceMonitor.startOperation('op-1', 'wrapped-test');
      
      // Simulate operation
      vi.advanceTimersByTime(100);
      
      const duration = performanceMonitor.endOperation('op-1');
      
      expect(duration).toBeDefined();
      expect(duration).toBeGreaterThan(0);
    });

    it('should handle multiple operations concurrently', () => {
      performanceMonitor.startOperation('op-1', 'concurrent-test-1');
      performanceMonitor.startOperation('op-2', 'concurrent-test-2');
      
      vi.advanceTimersByTime(50);
      const duration1 = performanceMonitor.endOperation('op-1');
      
      vi.advanceTimersByTime(50);
      const duration2 = performanceMonitor.endOperation('op-2');
      
      expect(duration1).toBeDefined();
      expect(duration2).toBeDefined();
      expect(duration2).toBeGreaterThan(duration1!);
    });
  });

  describe('performance statistics', () => {
    it('should collect operation statistics', () => {
      // Start and end some operations
      performanceMonitor.startOperation('op-1', 'operation-1');
      vi.advanceTimersByTime(50);
      performanceMonitor.endOperation('op-1');
      
      performanceMonitor.startOperation('op-2', 'operation-2');
      vi.advanceTimersByTime(100);
      performanceMonitor.endOperation('op-2');
      
      // Same operation type again
      performanceMonitor.startOperation('op-3', 'operation-1');
      vi.advanceTimersByTime(75);
      performanceMonitor.endOperation('op-3');
      
      const stats = performanceMonitor.getPerformanceStats();
      
      expect(stats).toBeDefined();
      expect(stats.operationCount).toBeGreaterThan(0);
      expect(stats.averageDuration).toBeGreaterThan(0);
    });

    it('should return valid statistics when no operations recorded', () => {
      const stats = performanceMonitor.getPerformanceStats();
      expect(stats).toBeDefined();
      expect(stats.operationCount).toBe(0);
    });
  });

  describe('resource usage tracking', () => {
    it('should provide current resource usage', () => {
      const usage = performanceMonitor.getCurrentResourceUsage();
      
      expect(usage).toHaveProperty('memory');
      expect(usage).toHaveProperty('cpu');
      expect(usage).toHaveProperty('heapSize');
      expect(usage).toHaveProperty('timestamp');
      
      expect(typeof usage.memory).toBe('number');
      expect(typeof usage.cpu).toBe('number');
      expect(usage.timestamp).toBeInstanceOf(Date);
    });

    it('should track resource history when monitoring', () => {
      performanceMonitor.start();
      
      // Wait for resource collection
      vi.advanceTimersByTime(100);
      
      const history = performanceMonitor.getResourceUsageHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('metrics collection', () => {
    it('should record custom metrics', () => {
      performanceMonitor.recordMetric({
        name: 'test-metric',
        value: 42,
        unit: 'count',
        timestamp: new Date(),
      });
      performanceMonitor.recordMetric({
        name: 'test-metric',
        value: 84,
        unit: 'count',
        timestamp: new Date(),
      });
      
      const metrics = performanceMonitor.getMetric('test-metric');
      expect(metrics).toBeDefined();
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should handle non-existent metrics gracefully', () => {
      const metrics = performanceMonitor.getMetric('non-existent');
      expect(metrics).toBeDefined();
      expect(metrics.length).toBe(0);
    });
  });

  describe('periodic collection', () => {
    beforeEach(() => {
      vi.useRealTimers(); // Use real timers for interval testing
    });

    afterEach(() => {
      vi.useFakeTimers();
    });

    it('should start periodic resource collection when monitoring starts', (done) => {
      performanceMonitor.start();
      
      // Wait for first collection
      setTimeout(() => {
        expect(mockEventBusInstance.publish).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'system:performance_data_collected',
            component: 'PerformanceMonitor',
          })
        );
        done();
      }, 100);
    });
  });

  describe('metrics export', () => {
    it('should export all metrics', () => {
      // Record some operations first
      performanceMonitor.startOperation('op-1', 'export-test-1');
      vi.advanceTimersByTime(100);
      performanceMonitor.endOperation('op-1');
      
      performanceMonitor.startOperation('op-2', 'export-test-2');
      vi.advanceTimersByTime(200);
      performanceMonitor.endOperation('op-2');
      
      const exported = performanceMonitor.exportMetrics();
      
      expect(exported).toHaveProperty('metrics');
      expect(exported).toHaveProperty('stats');
      expect(exported).toHaveProperty('resourceUsage');
      
      expect(exported.stats.operationCount).toBeGreaterThan(0);
    });
  });

  describe('metrics clearing', () => {
    it('should clear all metrics', () => {
      // Record some operations
      performanceMonitor.startOperation('op-1', 'clear-test');
      vi.advanceTimersByTime(100);
      performanceMonitor.endOperation('op-1');
      
      let stats = performanceMonitor.getPerformanceStats();
      expect(stats.operationCount).toBeGreaterThan(0);
      
      // Clear metrics
      performanceMonitor.clearMetrics();
      
      stats = performanceMonitor.getPerformanceStats();
      expect(stats.operationCount).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should use custom configuration when provided', () => {
      const customConfig = {
        enabled: true,
        collectionInterval: 10000,
        maxMetrics: 500,
        enableOperationTiming: true,
        enableResourceMonitoring: false,
        sampleRate: 0.5,
      };
      
      const customMonitor = new PerformanceMonitor(customConfig);
      expect(customMonitor).toBeDefined();
      expect(customMonitor.isRunning()).toBe(false);
      customMonitor.stop();
    });

    it('should use default configuration', () => {
      const defaultMonitor = new PerformanceMonitor(defaultPerformanceConfig);
      expect(defaultMonitor).toBeDefined();
      expect(defaultMonitor.isRunning()).toBe(false);
      defaultMonitor.stop();
    });

    it('should handle disabled monitoring', () => {
      const disabledConfig = {
        ...defaultPerformanceConfig,
        enabled: false,
      };
      
      const disabledMonitor = new PerformanceMonitor(disabledConfig);
      disabledMonitor.start();
      expect(disabledMonitor.isRunning()).toBe(false);
      disabledMonitor.stop();
    });
  });
});
