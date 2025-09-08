/**
 * @fileoverview Enhanced Structured Logging System
 *
 * This module provides a comprehensive structured logging system that builds
 * upon the existing Logger foundation. It adds context support, structured
 * data logging, log levels, filtering, and advanced features for production
 * monitoring and debugging.
 *
 * Key features:
 * - Structured log data with JSON formatting
 * - Hierarchical logging contexts
 * - Log level filtering and routing
 * - Performance metrics integration
 * - Log aggregation and correlation IDs
 * - Custom log formatters and outputs
 * - Memory-efficient log buffering
 *
 * @author Deep Code Reasoning MCP Server
 * @version 1.0.0
 * @since 2025-01-09
 */

import { Logger } from '@utils/Logger.js';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Log levels with numeric values for filtering
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
}

/**
 * Structured log entry interface
 */
export interface ILogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: ILogContext;
  data?: Record<string, any>;
  correlationId?: string;
  error?: Error | string;
  performance?: IPerformanceMetrics;
  stack?: string;
  source?: ILogSource;
}

/**
 * Logging context for hierarchical organization
 */
export interface ILogContext {
  component: string;
  operation?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  conversationId?: string;
  analysisId?: string;
  metadata?: Record<string, any>;
}

/**
 * Performance metrics for logging
 */
export interface IPerformanceMetrics {
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  customMetrics?: Record<string, number>;
}

/**
 * Log source information
 */
export interface ILogSource {
  file?: string;
  function?: string;
  line?: number;
  class?: string;
}

/**
 * Log output configuration
 */
export interface ILogOutput {
  name: string;
  enabled: boolean;
  minLevel: LogLevel;
  format: 'json' | 'text' | 'console';
  target: 'console' | 'file' | 'custom';
  options?: Record<string, any>;
}

/**
 * Log formatter interface
 */
export interface ILogFormatter {
  format(entry: ILogEntry): string;
}

/**
 * Log filter interface
 */
export interface ILogFilter {
  shouldLog(entry: ILogEntry): boolean;
}

/**
 * JSON log formatter
 */
export class JsonLogFormatter implements ILogFormatter {
  format(entry: ILogEntry): string {
    const serializable = {
      '@timestamp': entry.timestamp.toISOString(),
      level: LogLevel[entry.level].toLowerCase(),
      message: entry.message,
      context: entry.context,
      data: entry.data,
      correlationId: entry.correlationId,
      error: entry.error instanceof Error ? {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
      } : entry.error,
      performance: entry.performance,
      source: entry.source,
    };

    return JSON.stringify(serializable);
  }
}

/**
 * Console log formatter with colors
 */
export class ConsoleLogFormatter implements ILogFormatter {
  private readonly colors = {
    [LogLevel.TRACE]: '\x1b[90m',     // Gray
    [LogLevel.DEBUG]: '\x1b[36m',     // Cyan
    [LogLevel.INFO]: '\x1b[32m',      // Green
    [LogLevel.WARN]: '\x1b[33m',      // Yellow
    [LogLevel.ERROR]: '\x1b[31m',     // Red
    [LogLevel.FATAL]: '\x1b[35m',     // Magenta
  };
  private readonly reset = '\x1b[0m';

  format(entry: ILogEntry): string {
    const color = this.colors[entry.level] || '';
    const level = LogLevel[entry.level].padEnd(5);
    const timestamp = entry.timestamp.toISOString();
    const context = entry.context ? ` [${entry.context.component}]` : '';
    const correlationId = entry.correlationId ? ` (${entry.correlationId.substring(0, 8)})` : '';

    let output = `${color}${timestamp} ${level}${this.reset}${context}${correlationId} ${entry.message}`;

    if (entry.data && Object.keys(entry.data).length > 0) {
      output += `\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error instanceof Error ? entry.error.stack : entry.error}`;
    }

    if (entry.performance?.duration) {
      output += `\n  Duration: ${entry.performance.duration}ms`;
    }

    return output;
  }
}

/**
 * Level-based log filter
 */
export class LevelLogFilter implements ILogFilter {
  constructor(private minLevel: LogLevel) {}

  shouldLog(entry: ILogEntry): boolean {
    return entry.level >= this.minLevel;
  }
}

/**
 * Context-based log filter
 */
export class ContextLogFilter implements ILogFilter {
  constructor(private allowedComponents: string[]) {}

  shouldLog(entry: ILogEntry): boolean {
    if (!entry.context?.component) return true;
    return this.allowedComponents.includes(entry.context.component);
  }
}

/**
 * Enhanced Structured Logger
 *
 * Provides comprehensive logging with structured data, contexts,
 * performance metrics, and multiple output targets.
 */
export class StructuredLogger extends EventEmitter {
  private static instances = new Map<string, StructuredLogger>();
  private readonly legacyLogger: Logger;
  private readonly outputs = new Map<string, ILogOutput>();
  private readonly formatters = new Map<string, ILogFormatter>();
  private readonly filters: ILogFilter[] = [];
  private context: ILogContext;
  private correlationId?: string;
  private bufferSize = 1000;
  private logBuffer: ILogEntry[] = [];
  private flushInterval = 5000; // 5 seconds
  private flushTimer?: NodeJS.Timeout;

  private constructor(component: string) {
    super();
    this.legacyLogger = new Logger(`[${component}]`);
    this.context = { component };

    // Setup default outputs
    this.addOutput({
      name: 'console',
      enabled: true,
      minLevel: LogLevel.INFO,
      format: 'console',
      target: 'console',
    });

    // Setup default formatters
    this.formatters.set('json', new JsonLogFormatter());
    this.formatters.set('console', new ConsoleLogFormatter());

    // Setup auto-flush
    this.setupAutoFlush();
  }

  /**
   * Get or create a structured logger instance
   */
  static getInstance(component: string): StructuredLogger {
    if (!this.instances.has(component)) {
      this.instances.set(component, new StructuredLogger(component));
    }
    return this.instances.get(component)!;
  }

  /**
   * Create a child logger with extended context
   */
  child(contextExtension: Partial<ILogContext>): StructuredLogger {
    const childComponent = `${this.context.component}.${contextExtension.operation || 'child'}`;
    const child = StructuredLogger.getInstance(childComponent);
    child.context = { ...this.context, ...contextExtension };
    child.correlationId = this.correlationId;
    return child;
  }

  /**
   * Set correlation ID for request tracing
   */
  setCorrelationId(id: string): this {
    this.correlationId = id;
    return this;
  }

  /**
   * Generate new correlation ID
   */
  generateCorrelationId(): string {
    this.correlationId = uuidv4();
    return this.correlationId;
  }

  /**
   * Update logging context
   */
  setContext(context: Partial<ILogContext>): this {
    this.context = { ...this.context, ...context };
    return this;
  }

  /**
   * Add log output configuration
   */
  addOutput(output: ILogOutput): this {
    this.outputs.set(output.name, output);
    return this;
  }

  /**
   * Remove log output
   */
  removeOutput(name: string): this {
    this.outputs.delete(name);
    return this;
  }

  /**
   * Add log filter
   */
  addFilter(filter: ILogFilter): this {
    this.filters.push(filter);
    return this;
  }

  /**
   * Clear all filters
   */
  clearFilters(): this {
    this.filters.length = 0;
    return this;
  }

  /**
   * Set minimum log level for all outputs
   */
  setLevel(level: LogLevel): this {
    for (const output of this.outputs.values()) {
      output.minLevel = level;
    }
    return this;
  }

  /**
   * Log trace message
   */
  trace(message: string, data?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.TRACE, message, data, error);
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.DEBUG, message, data, error);
  }

  /**
   * Log info message
   */
  info(message: string, data?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.INFO, message, data, error);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.WARN, message, data, error);
  }

  /**
   * Log error message
   */
  error(message: string, data?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  /**
   * Log fatal message
   */
  fatal(message: string, data?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.FATAL, message, data, error);
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, metrics: IPerformanceMetrics, data?: Record<string, any>): void {
    this.log(LogLevel.INFO, `Performance: ${operation}`, data, undefined, metrics);
  }

  /**
   * Time an operation
   */
  async time<T>(operation: string, fn: () => Promise<T>, data?: Record<string, any>): Promise<T> {
    const start = process.hrtime.bigint();
    const startCpu = process.cpuUsage();
    const startMemory = process.memoryUsage();

    try {
      const result = await fn();
      const duration = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
      const cpuUsage = process.cpuUsage(startCpu);
      const memoryUsage = process.memoryUsage();

      this.performance(operation, {
        duration,
        cpuUsage,
        memoryUsage: {
          rss: memoryUsage.rss - startMemory.rss,
          heapUsed: memoryUsage.heapUsed - startMemory.heapUsed,
          heapTotal: memoryUsage.heapTotal - startMemory.heapTotal,
          external: memoryUsage.external - startMemory.external,
          arrayBuffers: memoryUsage.arrayBuffers - startMemory.arrayBuffers,
        },
      }, data);

      return result;
    } catch (error) {
      const duration = Number(process.hrtime.bigint() - start) / 1000000;
      this.error(`Performance: ${operation} failed`, { duration, ...data }, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, any>,
    error?: Error,
    performance?: IPerformanceMetrics,
  ): void {
    const entry: ILogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: { ...this.context },
      data,
      correlationId: this.correlationId,
      error,
      performance,
      source: this.getLogSource(),
    };

    // Apply filters
    if (!this.shouldLog(entry)) {
      return;
    }

    // Add to buffer for batch processing
    this.logBuffer.push(entry);

    // Immediately output critical messages
    if (level >= LogLevel.ERROR) {
      this.flushBuffer();
    }

    // Emit event for external listeners
    this.emit('log', entry);

    // Fallback to legacy logger for MCP compliance
    this.legacyLoggerFallback(entry);
  }

  /**
   * Check if log entry should be logged based on filters
   */
  private shouldLog(entry: ILogEntry): boolean {
    return this.filters.every(filter => filter.shouldLog(entry));
  }

  /**
   * Get log source information
   */
  private getLogSource(): ILogSource {
    const stack = new Error().stack;
    if (!stack) return {};

    const lines = stack.split('\n');
    const callerLine = lines[4]; // Skip error constructor, this method, log method, and public method

    if (!callerLine) return {};

    const match = callerLine.match(/at (?:(.+?)\s+\()?(?:(.+?):(\d+):(\d+))\)?/);
    if (!match) return {};

    return {
      function: match[1],
      file: match[2] ? path.basename(match[2]) : undefined,
      line: match[3] ? parseInt(match[3], 10) : undefined,
    };
  }

  /**
   * Fallback to legacy logger for MCP stderr compliance
   */
  private legacyLoggerFallback(entry: ILogEntry): void {
    const message = `${entry.message}${entry.data ? ` ${JSON.stringify(entry.data)}` : ''}`;

    switch (entry.level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        this.legacyLogger.debug(message);
        break;
      case LogLevel.INFO:
        this.legacyLogger.info(message);
        break;
      case LogLevel.WARN:
        this.legacyLogger.warn(message);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        this.legacyLogger.error(message, entry.error);
        break;
    }
  }

  /**
   * Setup automatic buffer flushing
   */
  private setupAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushBuffer();
    }, this.flushInterval);
  }

  /**
   * Flush log buffer to outputs
   */
  private flushBuffer(): void {
    if (this.logBuffer.length === 0) return;

    const entriesToFlush = this.logBuffer.splice(0);

    for (const [name, output] of this.outputs) {
      if (!output.enabled) continue;

      try {
        this.writeToOutput(output, entriesToFlush);
      } catch (error) {
        console.error(`Failed to write to log output ${name}:`, error);
      }
    }
  }

  /**
   * Write entries to specific output
   */
  private writeToOutput(output: ILogOutput, entries: ILogEntry[]): void {
    const formatter = this.formatters.get(output.format);
    if (!formatter) {
      throw new Error(`Unknown log format: ${output.format}`);
    }

    const filteredEntries = entries.filter(entry => entry.level >= output.minLevel);

    for (const entry of filteredEntries) {
      const formatted = formatter.format(entry);

      switch (output.target) {
        case 'console':
          console.error(formatted); // Use stderr for MCP compliance
          break;
        case 'file':
          this.writeToFile(output, formatted);
          break;
        default:
          // Custom output handling can be added here
          break;
      }
    }
  }

  /**
   * Write formatted log to file
   */
  private writeToFile(output: ILogOutput, formatted: string): void {
    const filePath = output.options?.filePath || './logs/structured.log';
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.appendFileSync(filePath, formatted + '\n');
  }

  /**
   * Get logger statistics
   */
  getStats(): object {
    return {
      component: this.context.component,
      bufferSize: this.logBuffer.length,
      outputs: Array.from(this.outputs.keys()),
      filters: this.filters.length,
      correlationId: this.correlationId,
    };
  }

  /**
   * Close logger and cleanup resources
   */
  close(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushBuffer();
    this.removeAllListeners();
  }
}

// Utility function to create logger instances
export function createLogger(component: string): StructuredLogger {
  return StructuredLogger.getInstance(component);
}

// Export log level utilities
export const LogLevelUtils = {
  fromString(level: string): LogLevel {
    const upperLevel = level.toUpperCase();
    return (LogLevel as any)[upperLevel] ?? LogLevel.INFO;
  },

  toString(level: LogLevel): string {
    return LogLevel[level].toLowerCase();
  },

  isValidLevel(level: string): boolean {
    return Object.values(LogLevel).includes(level.toUpperCase() as any);
  },
};
