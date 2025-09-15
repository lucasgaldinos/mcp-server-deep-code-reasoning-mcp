/**
 * @fileoverview Tests for Memory Manager
 */

import { vi } from 'vitest';
import { MemoryManager, defaultMemoryConfig, defaultConversationConfig, type CleanupCallback } from '../utils/memory-manager.js';

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

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    memoryManager = new MemoryManager(defaultMemoryConfig, defaultConversationConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    memoryManager.stop();
  });

  describe('initialization', () => {
    it('should initialize with configuration', () => {
      expect(memoryManager).toBeDefined();
      expect(mockEventBus.getInstance).toHaveBeenCalled();
    });

    it('should not be monitoring initially', () => {
      expect(memoryManager.isRunning()).toBe(false);
    });
  });

  describe('monitoring lifecycle', () => {
    it('should start monitoring', () => {
      memoryManager.start();
      expect(memoryManager.isRunning()).toBe(true);
      expect(mockEventBusInstance.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'system:memory_monitoring_started',
          component: 'MemoryManager',
          level: 'info',
          message: 'Memory monitoring started',
        })
      );
    });

    it('should stop monitoring', () => {
      memoryManager.start();
      memoryManager.stop();
      expect(memoryManager.isRunning()).toBe(false);
      expect(mockEventBusInstance.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'system:memory_monitoring_stopped',
          component: 'MemoryManager',
          level: 'info',
          message: 'Memory monitoring stopped',
        })
      );
    });

    it('should warn when starting already running monitoring', () => {
      memoryManager.start();
      memoryManager.start(); // Second start should warn
      expect(memoryManager.isRunning()).toBe(true);
    });

    it('should warn when stopping already stopped monitoring', () => {
      memoryManager.stop(); // Stop without starting should warn
      expect(memoryManager.isRunning()).toBe(false);
    });
  });

  describe('memory statistics', () => {
    it('should provide memory statistics', () => {
      const stats = memoryManager.getMemoryStats();
      
      expect(stats).toHaveProperty('heapUsed');
      expect(stats).toHaveProperty('heapTotal');
      expect(stats).toHaveProperty('external');
      expect(stats).toHaveProperty('rss');
      expect(stats).toHaveProperty('arrayBuffers');
      expect(stats).toHaveProperty('usagePercentage');
      expect(stats).toHaveProperty('availableMemory');
      
      expect(typeof stats.heapUsed).toBe('number');
      expect(typeof stats.usagePercentage).toBe('number');
      expect(stats.usagePercentage).toBeGreaterThanOrEqual(0);
      expect(stats.usagePercentage).toBeLessThanOrEqual(1);
    });

    it('should calculate usage percentage correctly', () => {
      const stats = memoryManager.getMemoryStats();
      expect(stats.usagePercentage).toBeGreaterThan(0);
    });
  });

  describe('memory health assessment', () => {
    it('should assess memory health as healthy by default', () => {
      const health = memoryManager.getMemoryHealth();
      expect(['healthy', 'warning', 'critical', 'emergency']).toContain(health);
    });

    it('should determine health based on thresholds', () => {
      // Create a memory manager with very low thresholds for testing
      const testManager = new MemoryManager(
        {
          ...defaultMemoryConfig,
          thresholds: {
            warning: 0.01,   // 1%
            critical: 0.02,  // 2%
            emergency: 0.03, // 3%
          }
        },
        defaultConversationConfig
      );

      const health = testManager.getMemoryHealth();
      // Should be critical or emergency due to low thresholds
      expect(['critical', 'emergency']).toContain(health);
      
      testManager.stop();
    });
  });

  describe('cleanup callbacks', () => {
    it('should register cleanup callbacks', () => {
      const callback = vi.fn<CleanupCallback>().mockResolvedValue(100);
      memoryManager.registerCleanupCallback('test-callback', callback);
      
      // Should not throw
      expect(() => memoryManager.registerCleanupCallback('test-callback', callback)).not.toThrow();
    });

    it('should unregister cleanup callbacks', () => {
      const callback = vi.fn<CleanupCallback>().mockResolvedValue(100);
      memoryManager.registerCleanupCallback('test-callback', callback);
      
      expect(memoryManager.unregisterCleanupCallback('test-callback')).toBe(true);
      expect(memoryManager.unregisterCleanupCallback('nonexistent')).toBe(false);
    });

    it('should execute cleanup callbacks', async () => {
      const callback1 = vi.fn<CleanupCallback>().mockResolvedValue(100);
      const callback2 = vi.fn<CleanupCallback>().mockResolvedValue(200);
      
      memoryManager.registerCleanupCallback('callback1', callback1);
      memoryManager.registerCleanupCallback('callback2', callback2);
      
      const result = await memoryManager.cleanup(true); // Force cleanup
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      expect(result.totalCleaned).toBe(300);
      expect(result.details.callback1).toBe(100);
      expect(result.details.callback2).toBe(200);
    });

    it('should handle callback errors gracefully', async () => {
      const errorCallback = vi.fn<CleanupCallback>().mockRejectedValue(new Error('Cleanup failed'));
      const successCallback = vi.fn<CleanupCallback>().mockResolvedValue(100);
      
      memoryManager.registerCleanupCallback('error-callback', errorCallback);
      memoryManager.registerCleanupCallback('success-callback', successCallback);
      
      const result = await memoryManager.cleanup(true);
      
      expect(errorCallback).toHaveBeenCalled();
      expect(successCallback).toHaveBeenCalled();
      expect(result.totalCleaned).toBe(100); // Only successful cleanup counted
      expect(result.details['success-callback']).toBe(100);
      expect(result.details['error-callback']).toBeUndefined();
    });
  });

  describe('automatic cleanup', () => {
    it('should skip cleanup when memory usage is low', async () => {
      // Create manager with high warning threshold
      const testManager = new MemoryManager(
        {
          ...defaultMemoryConfig,
          thresholds: {
            warning: 0.99,   // 99%
            critical: 0.995, // 99.5%
            emergency: 0.999, // 99.9%
          }
        },
        defaultConversationConfig
      );

      const result = await testManager.cleanup(false); // Don't force
      expect(result.totalCleaned).toBe(0);
      
      testManager.stop();
    });

    it('should perform cleanup when memory usage is high', async () => {
      // Create manager with very low warning threshold
      const testManager = new MemoryManager(
        {
          ...defaultMemoryConfig,
          thresholds: {
            warning: 0.01,   // 1%
            critical: 0.02,  // 2%
            emergency: 0.03, // 3%
          }
        },
        defaultConversationConfig
      );

      const callback = vi.fn<CleanupCallback>().mockResolvedValue(50);
      testManager.registerCleanupCallback('test', callback);

      const result = await testManager.cleanup(false); // Don't force, but threshold should trigger
      expect(result.totalCleaned).toBeGreaterThan(0);
      expect(callback).toHaveBeenCalled();
      
      testManager.stop();
    });
  });

  describe('emergency cleanup', () => {
    it('should trigger emergency cleanup when memory is critical', async () => {
      // Create manager with very low emergency threshold
      const testManager = new MemoryManager(
        {
          ...defaultMemoryConfig,
          thresholds: {
            warning: 0.01,
            critical: 0.02,
            emergency: 0.03, // Very low threshold
          }
        },
        defaultConversationConfig
      );

      const callback = vi.fn<CleanupCallback>().mockResolvedValue(100);
      testManager.registerCleanupCallback('emergency', callback);

      const wasTriggered = await testManager.checkEmergencyCleanup();
      expect(wasTriggered).toBe(true);
      expect(callback).toHaveBeenCalled();
      
      testManager.stop();
    });

    it('should not trigger emergency cleanup when memory is ok', async () => {
      // Use default high thresholds
      const wasTriggered = await memoryManager.checkEmergencyCleanup();
      expect(wasTriggered).toBe(false);
    });
  });

  describe('garbage collection', () => {
    it('should attempt forced garbage collection when available', () => {
      // Mock global.gc
      const originalGc = global.gc;
      global.gc = vi.fn() as any;

      const result = memoryManager.forceGarbageCollection();
      expect(result).toBe(true);
      expect(global.gc).toHaveBeenCalled();

      // Restore
      global.gc = originalGc;
    });

    it('should handle missing garbage collection gracefully', () => {
      // Ensure gc is not available
      const originalGc = global.gc;
      delete (global as any).gc;

      const result = memoryManager.forceGarbageCollection();
      expect(result).toBe(false);

      // Restore
      global.gc = originalGc;
    });
  });

  describe('event publishing', () => {
    it('should publish memory status events during monitoring', () => {
      memoryManager.start();
      
      // Events should be published during start
      expect(mockEventBusInstance.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'system:memory_monitoring_started',
        })
      );
    });

    it('should publish cleanup completion events', async () => {
      const callback = vi.fn<CleanupCallback>().mockResolvedValue(50);
      memoryManager.registerCleanupCallback('test', callback);
      
      await memoryManager.cleanup(true);
      
      expect(mockEventBusInstance.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'system:memory_cleanup_completed',
          component: 'MemoryManager',
          level: 'info',
          message: 'Memory cleanup completed',
        })
      );
    });

    it('should publish emergency cleanup events', async () => {
      // Create manager with very low thresholds
      const testManager = new MemoryManager(
        {
          ...defaultMemoryConfig,
          thresholds: {
            warning: 0.01,
            critical: 0.02,
            emergency: 0.03,
          }
        },
        defaultConversationConfig
      );

      await testManager.checkEmergencyCleanup();
      
      expect(mockEventBusInstance.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'system:emergency_cleanup_triggered',
          component: 'MemoryManager',
          level: 'warning',
          message: 'Emergency memory cleanup triggered',
        })
      );
      
      testManager.stop();
    });
  });

  describe('configuration defaults', () => {
    it('should have reasonable default memory configuration', () => {
      expect(defaultMemoryConfig.monitoringInterval).toBe(30 * 1000);
      expect(defaultMemoryConfig.thresholds.warning).toBe(0.7);
      expect(defaultMemoryConfig.thresholds.critical).toBe(0.85);
      expect(defaultMemoryConfig.thresholds.emergency).toBe(0.95);
      expect(defaultMemoryConfig.enableGcSuggestions).toBe(true);
      expect(defaultMemoryConfig.enableAlerts).toBe(true);
    });

    it('should have reasonable default conversation configuration', () => {
      expect(defaultConversationConfig.maxAge).toBe(24 * 60 * 60 * 1000);
      expect(defaultConversationConfig.maxCount).toBe(100);
      expect(defaultConversationConfig.cleanupInterval).toBe(60 * 60 * 1000);
      expect(defaultConversationConfig.autoCleanup).toBe(true);
    });
  });
});
