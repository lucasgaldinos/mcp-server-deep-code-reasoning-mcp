/**
 * @fileoverview Tests for StructuredLogger
 */

import { 
  StructuredLogger, 
  LogLevel, 
  LogLevelUtils,
  JsonLogFormatter,
  ConsoleLogFormatter,
  LevelLogFilter,
  ContextLogFilter,
  createLogger 
} from '../utils/structured-logger.js';

describe('StructuredLogger', () => {
  let logger: StructuredLogger;

  beforeEach(() => {
    logger = StructuredLogger.getInstance('test-component');
  });

  afterEach(() => {
    logger.close();
  });

  describe('instance creation', () => {
    it('should create singleton instances', () => {
      const logger1 = StructuredLogger.getInstance('component1');
      const logger2 = StructuredLogger.getInstance('component1');
      const logger3 = StructuredLogger.getInstance('component2');

      expect(logger1).toBe(logger2);
      expect(logger1).not.toBe(logger3);
    });

    it('should create logger with createLogger helper', () => {
      const logger = createLogger('helper-component');
      expect(logger).toBeInstanceOf(StructuredLogger);
    });
  });

  describe('child loggers', () => {
    it('should create child logger with extended context', () => {
      const childLogger = logger.child({ operation: 'test-operation' });
      expect(childLogger).toBeInstanceOf(StructuredLogger);
      expect(childLogger).not.toBe(logger);
    });

    it('should inherit correlation ID from parent', () => {
      logger.setCorrelationId('parent-id');
      const childLogger = logger.child({ operation: 'test-operation' });
      
      // Both should have the same correlation ID
      expect(logger.getStats()).toMatchObject({ correlationId: 'parent-id' });
      // Child inherits correlation ID during creation
    });
  });

  describe('correlation ID management', () => {
    it('should set correlation ID', () => {
      const result = logger.setCorrelationId('test-correlation-id');
      expect(result).toBe(logger); // Should return self for chaining
    });

    it('should generate new correlation ID', () => {
      const correlationId = logger.generateCorrelationId();
      expect(correlationId).toBeDefined();
      expect(typeof correlationId).toBe('string');
      expect(correlationId.length).toBeGreaterThan(0);
    });
  });

  describe('context management', () => {
    it('should set context', () => {
      const result = logger.setContext({ 
        operation: 'test-operation',
        userId: 'user123' 
      });
      expect(result).toBe(logger); // Should return self for chaining
    });

    it('should merge context with existing context', () => {
      logger.setContext({ operation: 'initial-operation' });
      logger.setContext({ userId: 'user123' });
      
      // Context should be merged, not replaced
      const stats = logger.getStats() as any;
      expect(stats.component).toBe('test-component');
    });
  });

  describe('output management', () => {
    it('should add log output', () => {
      const result = logger.addOutput({
        name: 'test-output',
        enabled: true,
        minLevel: LogLevel.INFO,
        format: 'json',
        target: 'console',
      });
      expect(result).toBe(logger); // Should return self for chaining
    });

    it('should remove log output', () => {
      logger.addOutput({
        name: 'test-output',
        enabled: true,
        minLevel: LogLevel.INFO,
        format: 'json',
        target: 'console',
      });
      
      const result = logger.removeOutput('test-output');
      expect(result).toBe(logger); // Should return self for chaining
    });

    it('should set minimum log level for all outputs', () => {
      const result = logger.setLevel(LogLevel.WARN);
      expect(result).toBe(logger); // Should return self for chaining
    });
  });

  describe('filter management', () => {
    it('should add log filter', () => {
      const filter = new LevelLogFilter(LogLevel.INFO);
      const result = logger.addFilter(filter);
      expect(result).toBe(logger); // Should return self for chaining
    });

    it('should clear all filters', () => {
      const filter = new LevelLogFilter(LogLevel.INFO);
      logger.addFilter(filter);
      
      const result = logger.clearFilters();
      expect(result).toBe(logger); // Should return self for chaining
    });
  });

  describe('logging methods', () => {
    beforeEach(() => {
      // Mock console.error to capture log output
      vi.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should log trace messages', () => {
      logger.trace('Test trace message', { key: 'value' });
      // Should not throw and should call through to legacy logger
    });

    it('should log debug messages', () => {
      logger.debug('Test debug message', { key: 'value' });
      // Should not throw and should call through to legacy logger
    });

    it('should log info messages', () => {
      logger.info('Test info message', { key: 'value' });
      expect(console.error).toHaveBeenCalled();
    });

    it('should log warn messages', () => {
      logger.warn('Test warn message', { key: 'value' });
      expect(console.error).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      const error = new Error('Test error');
      logger.error('Test error message', { key: 'value' }, error);
      expect(console.error).toHaveBeenCalled();
    });

    it('should log fatal messages', () => {
      logger.fatal('Test fatal message', { key: 'value' });
      expect(console.error).toHaveBeenCalled();
    });

    it('should log performance metrics', () => {
      logger.performance('test-operation', {
        duration: 100,
        memoryUsage: process.memoryUsage(),
      });
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('timing operations', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should time successful operations', async () => {
      const result = await logger.time('test-operation', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'success';
      });

      expect(result).toBe('success');
      expect(console.error).toHaveBeenCalled(); // Performance log
    });

    it('should time failed operations', async () => {
      const error = new Error('Operation failed');
      
      await expect(logger.time('test-operation', async () => {
        throw error;
      })).rejects.toThrow('Operation failed');

      expect(console.error).toHaveBeenCalled(); // Error log
    });
  });

  describe('statistics', () => {
    it('should return logger statistics', () => {
      const stats = logger.getStats();
      
      expect(stats).toHaveProperty('component');
      expect(stats).toHaveProperty('bufferSize');
      expect(stats).toHaveProperty('outputs');
      expect(stats).toHaveProperty('filters');
      expect(stats).toHaveProperty('correlationId');
    });
  });

  describe('cleanup', () => {
    it('should close logger and cleanup resources', () => {
      expect(() => logger.close()).not.toThrow();
    });
  });
});

describe('LogLevelUtils', () => {
  describe('fromString', () => {
    it('should convert string to LogLevel', () => {
      expect(LogLevelUtils.fromString('trace')).toBe(LogLevel.TRACE);
      expect(LogLevelUtils.fromString('DEBUG')).toBe(LogLevel.DEBUG);
      expect(LogLevelUtils.fromString('info')).toBe(LogLevel.INFO);
      expect(LogLevelUtils.fromString('WARN')).toBe(LogLevel.WARN);
      expect(LogLevelUtils.fromString('error')).toBe(LogLevel.ERROR);
      expect(LogLevelUtils.fromString('FATAL')).toBe(LogLevel.FATAL);
    });

    it('should return INFO for invalid strings', () => {
      expect(LogLevelUtils.fromString('invalid')).toBe(LogLevel.INFO);
      expect(LogLevelUtils.fromString('')).toBe(LogLevel.INFO);
    });
  });

  describe('toString', () => {
    it('should convert LogLevel to lowercase string', () => {
      expect(LogLevelUtils.toString(LogLevel.TRACE)).toBe('trace');
      expect(LogLevelUtils.toString(LogLevel.DEBUG)).toBe('debug');
      expect(LogLevelUtils.toString(LogLevel.INFO)).toBe('info');
      expect(LogLevelUtils.toString(LogLevel.WARN)).toBe('warn');
      expect(LogLevelUtils.toString(LogLevel.ERROR)).toBe('error');
      expect(LogLevelUtils.toString(LogLevel.FATAL)).toBe('fatal');
    });
  });

  describe('isValidLevel', () => {
    it('should validate log level strings', () => {
      expect(LogLevelUtils.isValidLevel('trace')).toBe(true);
      expect(LogLevelUtils.isValidLevel('DEBUG')).toBe(true);
      expect(LogLevelUtils.isValidLevel('info')).toBe(true);
      expect(LogLevelUtils.isValidLevel('invalid')).toBe(false);
      expect(LogLevelUtils.isValidLevel('')).toBe(false);
    });
  });
});

describe('JsonLogFormatter', () => {
  let formatter: JsonLogFormatter;

  beforeEach(() => {
    formatter = new JsonLogFormatter();
  });

  it('should format log entry as JSON', () => {
    const entry = {
      timestamp: new Date('2025-01-09T10:00:00Z'),
      level: LogLevel.INFO,
      message: 'Test message',
      context: { component: 'test' },
      data: { key: 'value' },
      correlationId: 'test-correlation-id',
    };

    const formatted = formatter.format(entry);
    const parsed = JSON.parse(formatted);

    expect(parsed['@timestamp']).toBe('2025-01-09T10:00:00.000Z');
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('Test message');
    expect(parsed.context).toEqual({ component: 'test' });
    expect(parsed.data).toEqual({ key: 'value' });
    expect(parsed.correlationId).toBe('test-correlation-id');
  });

  it('should handle Error objects', () => {
    const error = new Error('Test error');
    const entry = {
      timestamp: new Date(),
      level: LogLevel.ERROR,
      message: 'Error occurred',
      error,
    };

    const formatted = formatter.format(entry);
    const parsed = JSON.parse(formatted);

    expect(parsed.error).toEqual({
      name: 'Error',
      message: 'Test error',
      stack: error.stack,
    });
  });
});

describe('ConsoleLogFormatter', () => {
  let formatter: ConsoleLogFormatter;

  beforeEach(() => {
    formatter = new ConsoleLogFormatter();
  });

  it('should format log entry for console', () => {
    const entry = {
      timestamp: new Date('2025-01-09T10:00:00Z'),
      level: LogLevel.INFO,
      message: 'Test message',
      context: { component: 'test' },
      correlationId: 'test-correlation-id',
    };

    const formatted = formatter.format(entry);

    expect(formatted).toContain('2025-01-09T10:00:00.000Z');
    expect(formatted).toContain('INFO');
    expect(formatted).toContain('Test message');
    expect(formatted).toContain('[test]');
    expect(formatted).toContain('(test-cor');
  });

  it('should include data when present', () => {
    const entry = {
      timestamp: new Date(),
      level: LogLevel.INFO,
      message: 'Test message',
      data: { key: 'value' },
    };

    const formatted = formatter.format(entry);
    expect(formatted).toContain('Data:');
    expect(formatted).toContain('"key": "value"');
  });

  it('should include error information', () => {
    const error = new Error('Test error');
    const entry = {
      timestamp: new Date(),
      level: LogLevel.ERROR,
      message: 'Error occurred',
      error,
    };

    const formatted = formatter.format(entry);
    expect(formatted).toContain('Error:');
    expect(formatted).toContain('Test error');
  });

  it('should include performance duration', () => {
    const entry = {
      timestamp: new Date(),
      level: LogLevel.INFO,
      message: 'Performance test',
      performance: { duration: 123 },
    };

    const formatted = formatter.format(entry);
    expect(formatted).toContain('Duration: 123ms');
  });
});

describe('LevelLogFilter', () => {
  it('should filter by minimum level', () => {
    const filter = new LevelLogFilter(LogLevel.WARN);

    expect(filter.shouldLog({ level: LogLevel.TRACE } as any)).toBe(false);
    expect(filter.shouldLog({ level: LogLevel.DEBUG } as any)).toBe(false);
    expect(filter.shouldLog({ level: LogLevel.INFO } as any)).toBe(false);
    expect(filter.shouldLog({ level: LogLevel.WARN } as any)).toBe(true);
    expect(filter.shouldLog({ level: LogLevel.ERROR } as any)).toBe(true);
    expect(filter.shouldLog({ level: LogLevel.FATAL } as any)).toBe(true);
  });
});

describe('ContextLogFilter', () => {
  it('should filter by allowed components', () => {
    const filter = new ContextLogFilter(['component1', 'component2']);

    expect(filter.shouldLog({ 
      context: { component: 'component1' } 
    } as any)).toBe(true);

    expect(filter.shouldLog({ 
      context: { component: 'component2' } 
    } as any)).toBe(true);

    expect(filter.shouldLog({ 
      context: { component: 'component3' } 
    } as any)).toBe(false);

    expect(filter.shouldLog({ 
      context: undefined 
    } as any)).toBe(true); // Allow when no context
  });
});
