/**
 * @fileoverview Tests for HealthChecker monitoring system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  HealthChecker, 
  BuiltinHealthChecks,
  HealthCheckConfig,
  HealthStatus
} from '../../src/utils/health-checker.js';

describe('HealthChecker', () => {
  let healthChecker: HealthChecker;

  beforeEach(() => {
    healthChecker = HealthChecker.getInstance();
    // Clear any existing checks
    const registeredChecks = healthChecker.getRegisteredChecks();
    registeredChecks.forEach(name => healthChecker.unregisterCheck(name));
  });

  afterEach(() => {
    healthChecker.stop();
    // Clear checks again
    const registeredChecks = healthChecker.getRegisteredChecks();
    registeredChecks.forEach(name => healthChecker.unregisterCheck(name));
  });

  describe('Check Registration', () => {
    it('should register health checks', () => {
      const config: HealthCheckConfig = {
        name: 'test-check',
        type: 'functional',
        enabled: true,
        timeout: 5000,
        checkFn: async () => ({
          name: 'test-check',
          type: 'functional',
          status: 'healthy',
          message: 'Test check passed'
        })
      };

      healthChecker.registerCheck(config);
      
      const registeredChecks = healthChecker.getRegisteredChecks();
      expect(registeredChecks).toContain('test-check');
    });

    it('should unregister health checks', () => {
      const config: HealthCheckConfig = {
        name: 'test-check',
        type: 'functional',
        enabled: true,
        timeout: 5000,
        checkFn: async () => ({
          name: 'test-check',
          type: 'functional',
          status: 'healthy',
          message: 'Test check passed'
        })
      };

      healthChecker.registerCheck(config);
      expect(healthChecker.getRegisteredChecks()).toContain('test-check');
      
      healthChecker.unregisterCheck('test-check');
      expect(healthChecker.getRegisteredChecks()).not.toContain('test-check');
    });
  });

  describe('Check Execution', () => {
    it('should execute a successful health check', async () => {
      const config: HealthCheckConfig = {
        name: 'success-check',
        type: 'functional',
        enabled: true,
        timeout: 5000,
        checkFn: async () => ({
          name: 'success-check',
          type: 'functional',
          status: 'healthy',
          message: 'All systems operational',
          metadata: { version: '1.0.0' }
        })
      };

      healthChecker.registerCheck(config);
      
      const result = await healthChecker.executeCheck('success-check');
      
      expect(result.name).toBe('success-check');
      expect(result.type).toBe('functional');
      expect(result.status).toBe('healthy');
      expect(result.message).toBe('All systems operational');
      expect(result.metadata).toEqual({ version: '1.0.0' });
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle failing health checks', async () => {
      const config: HealthCheckConfig = {
        name: 'fail-check',
        type: 'functional',
        enabled: true,
        timeout: 5000,
        checkFn: async () => {
          throw new Error('Service unavailable');
        }
      };

      healthChecker.registerCheck(config);
      
      const result = await healthChecker.executeCheck('fail-check');
      
      expect(result.name).toBe('fail-check');
      expect(result.status).toBe('unhealthy');
      expect(result.message).toContain('Service unavailable');
      expect(result.metadata?.error).toBe('Service unavailable');
    });

    it('should handle timeout in health checks', async () => {
      const config: HealthCheckConfig = {
        name: 'timeout-check',
        type: 'functional',
        enabled: true,
        timeout: 100, // Very short timeout
        checkFn: async () => {
          await new Promise(resolve => setTimeout(resolve, 200)); // Longer than timeout
          return {
            name: 'timeout-check',
            type: 'functional',
            status: 'healthy',
            message: 'Should not reach here'
          };
        }
      };

      healthChecker.registerCheck(config);
      
      const result = await healthChecker.executeCheck('timeout-check');
      
      expect(result.name).toBe('timeout-check');
      expect(result.status).toBe('unhealthy');
      expect(result.message).toContain('timeout');
    });

    it('should skip disabled checks', async () => {
      const config: HealthCheckConfig = {
        name: 'disabled-check',
        type: 'functional',
        enabled: false,
        timeout: 5000,
        checkFn: async () => ({
          name: 'disabled-check',
          type: 'functional',
          status: 'healthy',
          message: 'Should not execute'
        })
      };

      healthChecker.registerCheck(config);
      
      const result = await healthChecker.executeCheck('disabled-check');
      
      expect(result.name).toBe('disabled-check');
      expect(result.status).toBe('unknown');
      expect(result.message).toBe('Check is disabled');
      expect(result.duration).toBe(0);
    });

    it('should throw error for non-existent checks', async () => {
      await expect(healthChecker.executeCheck('non-existent')).rejects.toThrow('Health check not found: non-existent');
    });
  });

  describe('Multiple Check Execution', () => {
    it('should execute all enabled checks', async () => {
      const config1: HealthCheckConfig = {
        name: 'check-1',
        type: 'functional',
        enabled: true,
        timeout: 5000,
        checkFn: async () => ({
          name: 'check-1',
          type: 'functional',
          status: 'healthy',
          message: 'Check 1 passed'
        })
      };

      const config2: HealthCheckConfig = {
        name: 'check-2',
        type: 'resource',
        enabled: true,
        timeout: 5000,
        checkFn: async () => ({
          name: 'check-2',
          type: 'resource',
          status: 'degraded',
          message: 'Check 2 degraded'
        })
      };

      const config3: HealthCheckConfig = {
        name: 'check-3',
        type: 'dependency',
        enabled: false,
        timeout: 5000,
        checkFn: async () => ({
          name: 'check-3',
          type: 'dependency',
          status: 'healthy',
          message: 'Should not execute'
        })
      };

      healthChecker.registerCheck(config1);
      healthChecker.registerCheck(config2);
      healthChecker.registerCheck(config3);
      
      const results = await healthChecker.executeAllChecks();
      
      expect(results).toHaveLength(2); // Only enabled checks
      expect(results.find(r => r.name === 'check-1')?.status).toBe('healthy');
      expect(results.find(r => r.name === 'check-2')?.status).toBe('degraded');
      expect(results.find(r => r.name === 'check-3')).toBeUndefined();
    });
  });

  describe('Health Summary', () => {
    it('should generate health summary with overall status', async () => {
      const healthyCheck: HealthCheckConfig = {
        name: 'healthy-check',
        type: 'functional',
        enabled: true,
        timeout: 5000,
        checkFn: async () => ({
          name: 'healthy-check',
          type: 'functional',
          status: 'healthy',
          message: 'All good'
        })
      };

      const degradedCheck: HealthCheckConfig = {
        name: 'degraded-check',
        type: 'resource',
        enabled: true,
        timeout: 5000,
        checkFn: async () => ({
          name: 'degraded-check',
          type: 'resource',
          status: 'degraded',
          message: 'Performance degraded'
        })
      };

      healthChecker.registerCheck(healthyCheck);
      healthChecker.registerCheck(degradedCheck);
      
      const summary = await healthChecker.getHealthSummary();
      
      expect(summary.status).toBe('degraded'); // Overall status is degraded
      expect(summary.totalChecks).toBe(2);
      expect(summary.checks).toHaveLength(2);
      expect(summary.timestamp).toBeInstanceOf(Date);
      expect(typeof summary.uptime).toBe('number');
      expect(typeof summary.version).toBe('string');
    });

    it('should report unhealthy status when any check is unhealthy', async () => {
      const healthyCheck: HealthCheckConfig = {
        name: 'healthy-check',
        type: 'functional',
        enabled: true,
        timeout: 5000,
        checkFn: async () => ({
          name: 'healthy-check',
          type: 'functional',
          status: 'healthy',
          message: 'All good'
        })
      };

      const unhealthyCheck: HealthCheckConfig = {
        name: 'unhealthy-check',
        type: 'dependency',
        enabled: true,
        timeout: 5000,
        checkFn: async () => ({
          name: 'unhealthy-check',
          type: 'dependency',
          status: 'unhealthy',
          message: 'Service down'
        })
      };

      healthChecker.registerCheck(healthyCheck);
      healthChecker.registerCheck(unhealthyCheck);
      
      const summary = await healthChecker.getHealthSummary();
      
      expect(summary.status).toBe('unhealthy');
    });
  });

  describe('System Control', () => {
    it('should start and stop the monitoring system', () => {
      expect(healthChecker.isSystemRunning()).toBe(false);
      
      healthChecker.start();
      expect(healthChecker.isSystemRunning()).toBe(true);
      
      healthChecker.stop();
      expect(healthChecker.isSystemRunning()).toBe(false);
    });

    it('should handle multiple start/stop calls gracefully', () => {
      expect(healthChecker.isSystemRunning()).toBe(false);
      
      healthChecker.start();
      healthChecker.start(); // Should not throw
      expect(healthChecker.isSystemRunning()).toBe(true);
      
      healthChecker.stop();
      healthChecker.stop(); // Should not throw
      expect(healthChecker.isSystemRunning()).toBe(false);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = HealthChecker.getInstance();
      const instance2 = HealthChecker.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});

describe('BuiltinHealthChecks', () => {
  describe('Memory Usage Check', () => {
    it('should create memory usage health check', () => {
      const config = BuiltinHealthChecks.memoryUsage();
      
      expect(config.name).toBe('memory-usage');
      expect(config.type).toBe('resource');
      expect(config.enabled).toBe(true);
      expect(config.timeout).toBe(5000);
    });

    it('should execute memory usage check', async () => {
      const config = BuiltinHealthChecks.memoryUsage();
      const result = await config.checkFn();
      
      expect(result.name).toBe('memory-usage');
      expect(result.type).toBe('resource');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
      expect(result.message).toContain('Memory usage:');
      expect(result.metadata).toBeDefined();
      expect(typeof result.metadata?.heapUsed).toBe('number');
      expect(typeof result.metadata?.heapTotal).toBe('number');
      expect(typeof result.metadata?.heapUsagePercent).toBe('number');
    });
  });

  describe('System Startup Check', () => {
    it('should create system startup health check', () => {
      const config = BuiltinHealthChecks.systemStartup();
      
      expect(config.name).toBe('system-startup');
      expect(config.type).toBe('startup');
      expect(config.enabled).toBe(true);
      expect(config.timeout).toBe(1000);
    });

    it('should execute system startup check', async () => {
      const config = BuiltinHealthChecks.systemStartup();
      const result = await config.checkFn();
      
      expect(result.name).toBe('system-startup');
      expect(result.type).toBe('startup');
      expect(result.status).toBe('healthy');
      expect(result.message).toContain('System running for');
      expect(result.metadata).toBeDefined();
      expect(typeof result.metadata?.uptimeSeconds).toBe('number');
      expect(typeof result.metadata?.nodeVersion).toBe('string');
      expect(typeof result.metadata?.platform).toBe('string');
    });
  });

  describe('Event Bus Check', () => {
    it('should create event bus health check', () => {
      const config = BuiltinHealthChecks.eventBus();
      
      expect(config.name).toBe('event-bus');
      expect(config.type).toBe('functional');
      expect(config.enabled).toBe(true);
      expect(config.timeout).toBe(2000);
    });

    it('should execute event bus check', async () => {
      const config = BuiltinHealthChecks.eventBus();
      const result = await config.checkFn();
      
      expect(result.name).toBe('event-bus');
      expect(result.type).toBe('functional');
      expect(result.status).toBe('healthy');
      expect(result.message).toContain('Event bus operational');
      expect(result.metadata).toBeDefined();
      expect(typeof result.metadata?.subscriptionCount).toBe('number');
    });
  });
});
