/**
 * @fileoverview Performance Monitoring System
 * @description Tracks and monitors performance metrics for analysis operations
 */

import { Logger } from '../utils/Logger.js';
import { EventBus } from '../utils/EventBus.js';

/**
 * Performance metric data
 */
export interface PerformanceMetric {
  /** Metric name */
  name: string;
  /** Metric value */
  value: number;
  /** Metric unit (ms, bytes, count, etc.) */
  unit: string;
  /** Timestamp when metric was recorded */
  timestamp: Date;
  /** Optional labels for grouping */
  labels?: Record<string, string>;
}

/**
 * Operation timing data
 */
export interface OperationTiming {
  /** Operation name */
  operation: string;
  /** Start time in milliseconds */
  startTime: number;
  /** End time in milliseconds */
  endTime?: number;
  /** Duration in milliseconds */
  duration?: number;
  /** Operation metadata */
  metadata?: Record<string, any>;
}

/**
 * Resource usage snapshot
 */
export interface ResourceUsage {
  /** Memory usage in bytes */
  memory: number;
  /** CPU usage percentage (0-100) */
  cpu: number;
  /** Heap size in bytes */
  heapSize: number;
  /** Event loop lag in milliseconds */
  eventLoopLag: number;
  /** Active handles count */
  activeHandles: number;
  /** Timestamp of the snapshot */
  timestamp: Date;
}

/**
 * Performance statistics
 */
export interface PerformanceStats {
  /** Average operation duration */
  averageDuration: number;
  /** Minimum operation duration */
  minDuration: number;
  /** Maximum operation duration */
  maxDuration: number;
  /** Total operations count */
  operationCount: number;
  /** Operations per second */
  operationsPerSecond: number;
  /** 95th percentile duration */
  p95Duration: number;
  /** 99th percentile duration */
  p99Duration: number;
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
  /** Enable performance monitoring */
  enabled: boolean;
  /** Metric collection interval in milliseconds */
  collectionInterval: number;
  /** Maximum number of metrics to keep in memory */
  maxMetrics: number;
  /** Enable operation timing */
  enableOperationTiming: boolean;
  /** Enable resource usage monitoring */
  enableResourceMonitoring: boolean;
  /** Sample rate for expensive operations (0-1) */
  sampleRate: number;
}

/**
 * Performance monitoring system
 */
export class PerformanceMonitor {
  private logger = new Logger('PerformanceMonitor');
  private eventBus = EventBus.getInstance();
  private metrics = new Map<string, PerformanceMetric[]>();
  private activeOperations = new Map<string, OperationTiming>();
  private resourceUsageHistory: ResourceUsage[] = [];
  private monitoringTimer?: NodeJS.Timeout;
  private isMonitoring = false;
  private operationDurations: number[] = [];

  constructor(private config: PerformanceConfig) {
    this.logger.info('PerformanceMonitor initialized', { config });
  }

  /**
   * Start performance monitoring
   */
  start(): void {
    if (!this.config.enabled) {
      this.logger.debug('Performance monitoring disabled');
      return;
    }

    if (this.isMonitoring) {
      this.logger.warn('Performance monitoring already started');
      return;
    }

    this.isMonitoring = true;

    if (this.config.enableResourceMonitoring) {
      this.startResourceMonitoring();
    }

    this.logger.info('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (!this.isMonitoring) {
      this.logger.warn('Performance monitoring not running');
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }

    this.logger.info('Performance monitoring stopped');
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    if (!this.config.enabled) return;

    // Sample rate check for expensive operations
    if (Math.random() > this.config.sampleRate) {
      return;
    }

    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }

    const metricList = this.metrics.get(metric.name)!;
    metricList.push(metric);

    // Keep only the most recent metrics
    if (metricList.length > this.config.maxMetrics) {
      metricList.shift();
    }

    this.logger.debug('Metric recorded', {
      name: metric.name,
      value: metric.value,
      unit: metric.unit,
    });
  }

  /**
   * Start timing an operation
   */
  startOperation(operationId: string, operationName: string, metadata?: Record<string, any>): void {
    if (!this.config.enabled || !this.config.enableOperationTiming) return;

    const timing: OperationTiming = {
      operation: operationName,
      startTime: performance.now(),
      metadata,
    };

    this.activeOperations.set(operationId, timing);

    this.logger.debug('Operation started', {
      operationId,
      operation: operationName,
    });
  }

  /**
   * End timing an operation
   */
  endOperation(operationId: string): number | undefined {
    if (!this.config.enabled || !this.config.enableOperationTiming) return;

    const timing = this.activeOperations.get(operationId);
    if (!timing) {
      this.logger.warn('Operation not found', { operationId });
      return;
    }

    timing.endTime = performance.now();
    timing.duration = timing.endTime - timing.startTime;

    this.activeOperations.delete(operationId);
    this.operationDurations.push(timing.duration);

    // Keep only recent durations for statistics
    if (this.operationDurations.length > this.config.maxMetrics) {
      this.operationDurations.shift();
    }

    // Record as metric
    this.recordMetric({
      name: `operation_duration_${timing.operation}`,
      value: timing.duration,
      unit: 'ms',
      timestamp: new Date(),
      labels: {
        operation: timing.operation,
      },
    });

    this.logger.debug('Operation completed', {
      operationId,
      operation: timing.operation,
      duration: timing.duration,
    });

    return timing.duration;
  }

  /**
   * Record operation with automatic timing
   */
  async timeOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>,
  ): Promise<T> {
    const operationId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.startOperation(operationId, operationName, metadata);

    try {
      const result = await operation();
      this.endOperation(operationId);
      return result;
    } catch (error) {
      this.endOperation(operationId);

      // Record error metric
      this.recordMetric({
        name: `operation_error_${operationName}`,
        value: 1,
        unit: 'count',
        timestamp: new Date(),
        labels: {
          operation: operationName,
          error: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): PerformanceStats {
    const durations = [...this.operationDurations].sort((a, b) => a - b);
    const count = durations.length;

    if (count === 0) {
      return {
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        operationCount: 0,
        operationsPerSecond: 0,
        p95Duration: 0,
        p99Duration: 0,
      };
    }

    const sum = durations.reduce((a, b) => a + b, 0);
    const averageDuration = sum / count;
    const minDuration = durations[0];
    const maxDuration = durations[count - 1];

    // Calculate percentiles
    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);
    const p95Duration = durations[p95Index] || 0;
    const p99Duration = durations[p99Index] || 0;

    // Calculate operations per second (based on recent operations)
    const recentOperations = durations.slice(-100); // Last 100 operations
    const recentAverage = recentOperations.length > 0
      ? recentOperations.reduce((a, b) => a + b, 0) / recentOperations.length
      : averageDuration;
    const operationsPerSecond = recentAverage > 0 ? 1000 / recentAverage : 0;

    return {
      averageDuration,
      minDuration,
      maxDuration,
      operationCount: count,
      operationsPerSecond,
      p95Duration,
      p99Duration,
    };
  }

  /**
   * Get specific metric values
   */
  getMetric(name: string): PerformanceMetric[] {
    return this.metrics.get(name) || [];
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Get current resource usage
   */
  getCurrentResourceUsage(): ResourceUsage {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Calculate CPU percentage (this is a simplified calculation)
    const totalCpu = cpuUsage.user + cpuUsage.system;
    const cpuPercent = totalCpu / 1000000; // Convert microseconds to seconds

    return {
      memory: memUsage.rss,
      cpu: cpuPercent,
      heapSize: memUsage.heapTotal,
      eventLoopLag: this.measureEventLoopLag(),
      activeHandles: this.getActiveHandlesCount(),
      timestamp: new Date(),
    };
  }

  /**
   * Get resource usage history
   */
  getResourceUsageHistory(): ResourceUsage[] {
    return [...this.resourceUsageHistory];
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.operationDurations.length = 0;
    this.resourceUsageHistory.length = 0;
    this.logger.info('All metrics cleared');
  }

  /**
   * Get monitoring status
   */
  isRunning(): boolean {
    return this.isMonitoring;
  }

  /**
   * Export metrics in a structured format
   */
  exportMetrics(): { metrics: Record<string, PerformanceMetric[]>; stats: PerformanceStats; resourceUsage: ResourceUsage[] } {
    const metricsObj: Record<string, PerformanceMetric[]> = {};
    for (const [name, values] of this.metrics.entries()) {
      metricsObj[name] = values;
    }

    return {
      metrics: metricsObj,
      stats: this.getPerformanceStats(),
      resourceUsage: this.getResourceUsageHistory(),
    };
  }

  /**
   * Start resource usage monitoring
   */
  private startResourceMonitoring(): void {
    this.monitoringTimer = setInterval(() => {
      const usage = this.getCurrentResourceUsage();
      this.resourceUsageHistory.push(usage);

      // Keep only recent history
      if (this.resourceUsageHistory.length > this.config.maxMetrics) {
        this.resourceUsageHistory.shift();
      }

      // Record as individual metrics
      this.recordMetric({
        name: 'resource_memory',
        value: usage.memory,
        unit: 'bytes',
        timestamp: usage.timestamp,
      });

      this.recordMetric({
        name: 'resource_cpu',
        value: usage.cpu,
        unit: 'percent',
        timestamp: usage.timestamp,
      });

      this.recordMetric({
        name: 'resource_heap_size',
        value: usage.heapSize,
        unit: 'bytes',
        timestamp: usage.timestamp,
      });

      this.recordMetric({
        name: 'resource_event_loop_lag',
        value: usage.eventLoopLag,
        unit: 'ms',
        timestamp: usage.timestamp,
      });

    }, this.config.collectionInterval);
  }

  /**
   * Measure event loop lag
   */
  private measureEventLoopLag(): number {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
      return lag;
    });
    return 0; // Simplified for now
  }

  /**
   * Get active handles count
   */
  private getActiveHandlesCount(): number {
    try {
      // Safe way to access internal Node.js API
      const process_any = process as any;
      if (typeof process_any._getActiveHandles === 'function') {
        return process_any._getActiveHandles().length;
      }
    } catch {
      // Fallback if the API is not available
    }
    return 0;
  }
}

/**
 * Default performance monitoring configuration
 */
export const defaultPerformanceConfig: PerformanceConfig = {
  enabled: true,
  collectionInterval: 30 * 1000, // 30 seconds
  maxMetrics: 1000,
  enableOperationTiming: true,
  enableResourceMonitoring: true,
  sampleRate: 1.0, // 100% sampling
};
