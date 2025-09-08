/**
 * @fileoverview Memory Management System
 * @description Manages memory usage, conversation cleanup, and resource monitoring
 */

import { Logger } from '../utils/Logger.js';
import { EventBus } from '../utils/EventBus.js';

/**
 * Memory usage statistics
 */
export interface MemoryStats {
  /** Used heap in bytes */
  heapUsed: number;
  /** Total heap size in bytes */
  heapTotal: number;
  /** External memory usage in bytes */
  external: number;
  /** Resident Set Size in bytes */
  rss: number;
  /** Array buffers memory in bytes */
  arrayBuffers: number;
  /** Memory usage percentage (0-1) */
  usagePercentage: number;
  /** Available memory in bytes */
  availableMemory: number;
}

/**
 * Memory threshold configuration
 */
export interface MemoryThresholds {
  /** Warning threshold (0-1) */
  warning: number;
  /** Critical threshold (0-1) */
  critical: number;
  /** Emergency cleanup threshold (0-1) */
  emergency: number;
}

/**
 * Conversation cleanup configuration
 */
export interface ConversationCleanupConfig {
  /** Maximum age of conversations in milliseconds */
  maxAge: number;
  /** Maximum number of conversations to keep */
  maxCount: number;
  /** Cleanup interval in milliseconds */
  cleanupInterval: number;
  /** Enable automatic cleanup */
  autoCleanup: boolean;
}

/**
 * Memory monitoring configuration
 */
export interface MemoryMonitoringConfig {
  /** Monitoring interval in milliseconds */
  monitoringInterval: number;
  /** Memory thresholds */
  thresholds: MemoryThresholds;
  /** Enable garbage collection suggestions */
  enableGcSuggestions: boolean;
  /** Enable memory alerts */
  enableAlerts: boolean;
}

/**
 * Resource cleanup callback function
 */
export type CleanupCallback = () => Promise<number>;

/**
 * Memory management system for the MCP server
 */
export class MemoryManager {
  private logger = new Logger('MemoryManager');
  private eventBus = EventBus.getInstance();
  private monitoringTimer?: NodeJS.Timeout;
  private cleanupCallbacks = new Map<string, CleanupCallback>();
  private conversationCleanupTimer?: NodeJS.Timeout;
  private isMonitoring = false;

  constructor(
    private monitoringConfig: MemoryMonitoringConfig,
    private conversationConfig: ConversationCleanupConfig,
  ) {
    this.logger.info('MemoryManager initialized', {
      monitoringInterval: monitoringConfig.monitoringInterval,
      thresholds: monitoringConfig.thresholds,
    });
  }

  /**
   * Start memory monitoring
   */
  start(): void {
    if (this.isMonitoring) {
      this.logger.warn('Memory monitoring already started');
      return;
    }

    this.isMonitoring = true;
    this.startMemoryMonitoring();

    if (this.conversationConfig.autoCleanup) {
      this.startConversationCleanup();
    }

    this.logger.info('Memory monitoring started');
    this.eventBus.publish({
      type: 'system:memory_monitoring_started',
      timestamp: new Date(),
      component: 'MemoryManager',
      level: 'info',
      message: 'Memory monitoring started',
      metadata: { config: this.monitoringConfig },
    });
  }

  /**
   * Stop memory monitoring
   */
  stop(): void {
    if (!this.isMonitoring) {
      this.logger.warn('Memory monitoring not running');
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }

    if (this.conversationCleanupTimer) {
      clearInterval(this.conversationCleanupTimer);
      this.conversationCleanupTimer = undefined;
    }

    this.logger.info('Memory monitoring stopped');
    this.eventBus.publish({
      type: 'system:memory_monitoring_stopped',
      timestamp: new Date(),
      component: 'MemoryManager',
      level: 'info',
      message: 'Memory monitoring stopped',
    });
  }

  /**
   * Check if memory monitoring is running
   */
  isRunning(): boolean {
    return this.isMonitoring;
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    const memUsage = process.memoryUsage();
    const totalMemory = this.getTotalSystemMemory();
    const usagePercentage = memUsage.rss / totalMemory;
    const availableMemory = totalMemory - memUsage.rss;

    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers,
      usagePercentage,
      availableMemory,
    };
  }

  /**
   * Register a cleanup callback
   */
  registerCleanupCallback(name: string, callback: CleanupCallback): void {
    this.cleanupCallbacks.set(name, callback);
    this.logger.debug('Cleanup callback registered', { name });
  }

  /**
   * Unregister a cleanup callback
   */
  unregisterCleanupCallback(name: string): boolean {
    const removed = this.cleanupCallbacks.delete(name);
    if (removed) {
      this.logger.debug('Cleanup callback unregistered', { name });
    }
    return removed;
  }

  /**
   * Trigger manual memory cleanup
   */
  async cleanup(force = false): Promise<{ totalCleaned: number; details: Record<string, number> }> {
    const stats = this.getMemoryStats();
    const shouldCleanup = force ||
      stats.usagePercentage >= this.monitoringConfig.thresholds.warning;

    if (!shouldCleanup) {
      this.logger.debug('Cleanup skipped, memory usage below threshold');
      return { totalCleaned: 0, details: {} };
    }

    this.logger.info('Starting memory cleanup', {
      memoryUsage: stats.usagePercentage,
      force,
    });

    const details: Record<string, number> = {};
    let totalCleaned = 0;

    // Execute cleanup callbacks
    for (const [name, callback] of this.cleanupCallbacks.entries()) {
      try {
        const cleaned = await callback();
        details[name] = cleaned;
        totalCleaned += cleaned;
        this.logger.debug('Cleanup callback executed', { name, cleaned });
      } catch (error) {
        this.logger.error('Cleanup callback failed', {
          name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Suggest garbage collection if enabled
    if (this.monitoringConfig.enableGcSuggestions && global.gc) {
      const beforeGc = process.memoryUsage().heapUsed;
      global.gc();
      const afterGc = process.memoryUsage().heapUsed;
      const gcCleaned = beforeGc - afterGc;
      details.gc = gcCleaned;
      totalCleaned += gcCleaned;
      this.logger.debug('Garbage collection executed', { cleaned: gcCleaned });
    }

    this.logger.info('Memory cleanup completed', {
      totalCleaned,
      details,
    });

    this.eventBus.publish({
      type: 'system:memory_cleanup_completed',
      timestamp: new Date(),
      component: 'MemoryManager',
      level: 'info',
      message: 'Memory cleanup completed',
      metadata: { totalCleaned, details },
    });

    return { totalCleaned, details };
  }

  /**
   * Check if emergency cleanup is needed
   */
  async checkEmergencyCleanup(): Promise<boolean> {
    const stats = this.getMemoryStats();

    if (stats.usagePercentage >= this.monitoringConfig.thresholds.emergency) {
      this.logger.warn('Emergency memory cleanup triggered', {
        usagePercentage: stats.usagePercentage,
        threshold: this.monitoringConfig.thresholds.emergency,
      });

      await this.cleanup(true);

      this.eventBus.publish({
        type: 'system:emergency_cleanup_triggered',
        timestamp: new Date(),
        component: 'MemoryManager',
        level: 'warning',
        message: 'Emergency memory cleanup triggered',
        metadata: { memoryStats: stats },
      });

      return true;
    }

    return false;
  }

  /**
   * Get memory health status
   */
  getMemoryHealth(): 'healthy' | 'warning' | 'critical' | 'emergency' {
    const stats = this.getMemoryStats();
    const { thresholds } = this.monitoringConfig;

    if (stats.usagePercentage >= thresholds.emergency) return 'emergency';
    if (stats.usagePercentage >= thresholds.critical) return 'critical';
    if (stats.usagePercentage >= thresholds.warning) return 'warning';
    return 'healthy';
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): boolean {
    if (global.gc) {
      const before = process.memoryUsage().heapUsed;
      global.gc();
      const after = process.memoryUsage().heapUsed;
      const cleaned = before - after;

      this.logger.info('Forced garbage collection', {
        memoryBefore: before,
        memoryAfter: after,
        cleaned,
      });

      return true;
    }

    this.logger.warn('Garbage collection not available');
    return false;
  }

  /**
   * Get system memory information
   */
  private getTotalSystemMemory(): number {
    // Fallback to a reasonable default if os module is not available
    try {
      // Use dynamic import instead of require
      import('os').then(os => os.totalmem()).catch(() => 8 * 1024 * 1024 * 1024);
      // For synchronous fallback, return default
      return 8 * 1024 * 1024 * 1024;
    } catch {
      // Default to 8GB if we can't determine system memory
      return 8 * 1024 * 1024 * 1024;
    }
  }

  /**
   * Start memory monitoring timer
   */
  private startMemoryMonitoring(): void {
    this.monitoringTimer = setInterval(async () => {
      await this.performMemoryCheck();
    }, this.monitoringConfig.monitoringInterval);
  }

  /**
   * Start conversation cleanup timer
   */
  private startConversationCleanup(): void {
    this.conversationCleanupTimer = setInterval(async () => {
      await this.performConversationCleanup();
    }, this.conversationConfig.cleanupInterval);
  }

  /**
   * Perform periodic memory check
   */
  private async performMemoryCheck(): Promise<void> {
    const stats = this.getMemoryStats();
    const health = this.getMemoryHealth();

    // Log memory status periodically
    this.logger.debug('Memory check', {
      health,
      usage: stats.usagePercentage,
      heapUsed: stats.heapUsed,
      rss: stats.rss,
    });

    // Publish memory status event
    this.eventBus.publish({
      type: 'system:memory_status',
      timestamp: new Date(),
      component: 'MemoryManager',
      level: health === 'healthy' ? 'info' : health === 'warning' ? 'warning' : 'error',
      message: `Memory status: ${health}`,
      metadata: { stats, health },
    });

    // Handle different memory states
    switch (health) {
      case 'emergency':
        await this.checkEmergencyCleanup();
        break;

      case 'critical':
        if (this.monitoringConfig.enableAlerts) {
          this.logger.error('Critical memory usage detected', {
            usage: stats.usagePercentage,
            threshold: this.monitoringConfig.thresholds.critical,
          });
        }
        await this.cleanup();
        break;

      case 'warning':
        if (this.monitoringConfig.enableAlerts) {
          this.logger.warn('High memory usage detected', {
            usage: stats.usagePercentage,
            threshold: this.monitoringConfig.thresholds.warning,
          });
        }
        break;
    }
  }

  /**
   * Perform conversation cleanup
   */
  private async performConversationCleanup(): Promise<void> {
    this.logger.debug('Performing conversation cleanup');

    // This would integrate with conversation manager
    // For now, just emit an event that conversation manager can listen to
    this.eventBus.publish({
      type: 'system:conversation_cleanup_requested',
      timestamp: new Date(),
      component: 'MemoryManager',
      level: 'info',
      message: 'Conversation cleanup requested',
      metadata: {
        maxAge: this.conversationConfig.maxAge,
        maxCount: this.conversationConfig.maxCount,
      },
    });
  }
}

/**
 * Default memory manager configuration
 */
export const defaultMemoryConfig: MemoryMonitoringConfig = {
  monitoringInterval: 30 * 1000, // 30 seconds
  thresholds: {
    warning: 0.7,   // 70%
    critical: 0.85, // 85%
    emergency: 0.95, // 95%
  },
  enableGcSuggestions: true,
  enableAlerts: true,
};

/**
 * Default conversation cleanup configuration
 */
export const defaultConversationConfig: ConversationCleanupConfig = {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  maxCount: 100,
  cleanupInterval: 60 * 60 * 1000, // 1 hour
  autoCleanup: true,
};
