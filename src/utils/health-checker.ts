/**
 * @fileoverview Health check system for monitoring component status and performance
 * Provides comprehensive health monitoring with different check types and severity levels
 *
 * @author Deep Code Reasoning MCP Server
 * @version 1.0.0
 */

import { Logger } from './logger.js';
import { eventPublisher } from './event-bus.js';

/**
 * Health check status levels
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Health check types for different monitoring categories
 */
export type HealthCheckType =
  | 'startup'     // System initialization checks
  | 'dependency'  // External service dependencies
  | 'resource'    // Memory, CPU, disk usage
  | 'functional'  // Core functionality validation
  | 'integration' // End-to-end workflow validation
  | 'custom';     // User-defined checks

/**
 * Individual health check result
 */
export interface HealthCheckResult {
  readonly name: string;
  readonly type: HealthCheckType;
  readonly status: HealthStatus;
  readonly message: string;
  readonly timestamp: Date;
  readonly duration: number; // milliseconds
  readonly metadata?: Record<string, any>;
}

/**
 * Overall system health summary
 */
export interface HealthSummary {
  readonly status: HealthStatus;
  readonly timestamp: Date;
  readonly totalChecks: number;
  readonly checks: HealthCheckResult[];
  readonly uptime: number; // seconds
  readonly version: string;
}

/**
 * Health check function interface
 */
export type HealthCheckFunction = () => Promise<Omit<HealthCheckResult, 'timestamp' | 'duration'>>;

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  readonly name: string;
  readonly type: HealthCheckType;
  readonly enabled: boolean;
  readonly timeout: number; // milliseconds
  readonly interval?: number; // milliseconds (for periodic checks)
  readonly checkFn: HealthCheckFunction;
}

/**
 * Health monitoring system
 */
export class HealthChecker {
  private static instance: HealthChecker;
  private readonly logger = new Logger('[HealthChecker]');
  private readonly checks = new Map<string, HealthCheckConfig>();
  private readonly periodicIntervals = new Map<string, NodeJS.Timeout>();
  private readonly startTime = Date.now();
  private isRunning = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): HealthChecker {
    if (!HealthChecker.instance) {
      HealthChecker.instance = new HealthChecker();
    }
    return HealthChecker.instance;
  }

  /**
   * Register a health check
   */
  public registerCheck(config: HealthCheckConfig): void {
    this.checks.set(config.name, config);

    this.logger.info(`Registered health check: ${config.name}`, {
      type: config.type,
      enabled: config.enabled,
      timeout: config.timeout,
      interval: config.interval,
    });

    // Set up periodic execution if interval is specified
    if (config.interval && config.enabled && this.isRunning) {
      this.schedulePeriodicCheck(config);
    }
  }

  /**
   * Unregister a health check
   */
  public unregisterCheck(name: string): void {
    this.checks.delete(name);

    // Clear periodic interval if exists
    const interval = this.periodicIntervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.periodicIntervals.delete(name);
    }

    this.logger.info(`Unregistered health check: ${name}`);
  }

  /**
   * Execute a specific health check
   */
  public async executeCheck(name: string): Promise<HealthCheckResult> {
    const config = this.checks.get(name);
    if (!config) {
      throw new Error(`Health check not found: ${name}`);
    }

    if (!config.enabled) {
      return {
        name,
        type: config.type,
        status: 'unknown',
        message: 'Check is disabled',
        timestamp: new Date(),
        duration: 0,
      };
    }

    const startTime = Date.now();

    try {
      this.logger.debug(`Executing health check: ${name}`);

      // Execute with timeout
      const result = await Promise.race([
        config.checkFn(),
        this.createTimeoutPromise(config.timeout, name),
      ]);

      const duration = Date.now() - startTime;

      const healthResult: HealthCheckResult = {
        ...result,
        timestamp: new Date(),
        duration,
      };

      this.logger.debug(`Health check completed: ${name}`, {
        status: healthResult.status,
        duration: healthResult.duration,
      });

      // Publish health check event
      await eventPublisher.publishSystemHealthCheck(
        name,
        healthResult.status === 'healthy' ? 'healthy' : 'unhealthy',
        {
          type: config.type,
          duration: healthResult.duration,
          status: healthResult.status,
          message: healthResult.message,
        },
      );

      return healthResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Health check failed: ${name}`, {
        error: errorMessage,
        duration,
      });

      const healthResult: HealthCheckResult = {
        name,
        type: config.type,
        status: 'unhealthy',
        message: `Check failed: ${errorMessage}`,
        timestamp: new Date(),
        duration,
        metadata: { error: errorMessage },
      };

      // Publish failure event
      await eventPublisher.publishSystemHealthCheck(
        name,
        'unhealthy',
        {
          type: config.type,
          duration: healthResult.duration,
          error: errorMessage,
        },
      );

      return healthResult;
    }
  }

  /**
   * Execute all registered health checks
   */
  public async executeAllChecks(): Promise<HealthCheckResult[]> {
    const enabledChecks = Array.from(this.checks.values()).filter(config => config.enabled);

    this.logger.info(`Executing ${enabledChecks.length} health checks`);

    const promises = enabledChecks.map(config => this.executeCheck(config.name));
    const results = await Promise.allSettled(promises);

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const config = enabledChecks[index];
        this.logger.error(`Health check promise rejected: ${config.name}`, {
          error: result.reason,
        });

        return {
          name: config.name,
          type: config.type,
          status: 'unhealthy' as HealthStatus,
          message: `Promise rejected: ${result.reason}`,
          timestamp: new Date(),
          duration: 0,
          metadata: { error: result.reason },
        };
      }
    });
  }

  /**
   * Get overall system health summary
   */
  public async getHealthSummary(): Promise<HealthSummary> {
    const checks = await this.executeAllChecks();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    // Determine overall status
    let status: HealthStatus = 'healthy';
    if (checks.some(check => check.status === 'unhealthy')) {
      status = 'unhealthy';
    } else if (checks.some(check => check.status === 'degraded')) {
      status = 'degraded';
    } else if (checks.some(check => check.status === 'unknown')) {
      status = 'unknown';
    }

    return {
      status,
      timestamp: new Date(),
      totalChecks: checks.length,
      checks,
      uptime,
      version: process.env.npm_package_version || '0.1.0',
    };
  }

  /**
   * Start the health monitoring system
   */
  public start(): void {
    if (this.isRunning) {
      this.logger.warn('HealthChecker is already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting health monitoring system');

    // Schedule all periodic checks
    for (const config of this.checks.values()) {
      if (config.interval && config.enabled) {
        this.schedulePeriodicCheck(config);
      }
    }
  }

  /**
   * Stop the health monitoring system
   */
  public stop(): void {
    if (!this.isRunning) {
      this.logger.warn('HealthChecker is not running');
      return;
    }

    this.isRunning = false;
    this.logger.info('Stopping health monitoring system');

    // Clear all periodic intervals
    for (const interval of this.periodicIntervals.values()) {
      clearInterval(interval);
    }
    this.periodicIntervals.clear();
  }

  /**
   * Get list of registered checks
   */
  public getRegisteredChecks(): string[] {
    return Array.from(this.checks.keys());
  }

  /**
   * Check if system is running
   */
  public isSystemRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Schedule periodic execution of a health check
   */
  private schedulePeriodicCheck(config: HealthCheckConfig): void {
    if (!config.interval) {return;}

    // Clear existing interval if any
    const existingInterval = this.periodicIntervals.get(config.name);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Schedule new interval
    const interval = setInterval(async () => {
      try {
        await this.executeCheck(config.name);
      } catch (error) {
        this.logger.error(`Periodic health check error: ${config.name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, config.interval);

    this.periodicIntervals.set(config.name, interval);

    this.logger.debug(`Scheduled periodic health check: ${config.name}`, {
      interval: config.interval,
    });
  }

  /**
   * Create a timeout promise for health check execution
   */
  private createTimeoutPromise(timeout: number, checkName: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check timeout after ${timeout}ms: ${checkName}`));
      }, timeout);
    });
  }
}

/**
 * Pre-defined health check functions
 */
export class BuiltinHealthChecks {
  /**
   * Memory usage health check
   */
  public static memoryUsage(): HealthCheckConfig {
    return {
      name: 'memory-usage',
      type: 'resource',
      enabled: true,
      timeout: 5000,
      checkFn: async () => {
        const usage = process.memoryUsage();
        const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
        const heapUsagePercent = Math.round((usage.heapUsed / usage.heapTotal) * 100);

        let status: HealthStatus = 'healthy';
        let message = `Memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapUsagePercent}%)`;

        if (heapUsagePercent > 90) {
          status = 'unhealthy';
          message += ' - Critical memory usage';
        } else if (heapUsagePercent > 80) {
          status = 'degraded';
          message += ' - High memory usage';
        }

        return {
          name: 'memory-usage',
          type: 'resource',
          status,
          message,
          metadata: {
            heapUsed: usage.heapUsed,
            heapTotal: usage.heapTotal,
            external: usage.external,
            rss: usage.rss,
            heapUsagePercent,
          },
        };
      },
    };
  }

  /**
   * Basic system startup check
   */
  public static systemStartup(): HealthCheckConfig {
    return {
      name: 'system-startup',
      type: 'startup',
      enabled: true,
      timeout: 1000,
      checkFn: async () => {
        const uptimeSeconds = process.uptime();

        return {
          name: 'system-startup',
          type: 'startup',
          status: 'healthy' as HealthStatus,
          message: `System running for ${Math.floor(uptimeSeconds)}s`,
          metadata: {
            uptimeSeconds,
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
          },
        };
      },
    };
  }

  /**
   * Event bus functionality check
   */
  public static eventBus(): HealthCheckConfig {
    return {
      name: 'event-bus',
      type: 'functional',
      enabled: true,
      timeout: 2000,
      checkFn: async () => {
        try {
          // Simple functional test of event bus
          const { eventBus } = await import('./event-bus.js');
          const subscriptionCount = eventBus.getSubscriptionCount();

          return {
            name: 'event-bus',
            type: 'functional',
            status: 'healthy' as HealthStatus,
            message: `Event bus operational with ${subscriptionCount} subscriptions`,
            metadata: {
              subscriptionCount,
            },
          };
        } catch (error) {
          return {
            name: 'event-bus',
            type: 'functional',
            status: 'unhealthy' as HealthStatus,
            message: `Event bus error: ${error instanceof Error ? error.message : String(error)}`,
            metadata: {
              error: error instanceof Error ? error.message : String(error),
            },
          };
        }
      },
    };
  }
}

// Export singleton instance for convenience
export const healthChecker = HealthChecker.getInstance();
