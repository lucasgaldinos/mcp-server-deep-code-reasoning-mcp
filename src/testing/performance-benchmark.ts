/**
 * @fileoverview Performance Benchmarking System for Phase 4 Testing Infrastructure
 * @description Provides comprehensive performance testing and benchmarking capabilities
 */

import { Logger } from '@utils/logger.js';
import { EventBus } from '@utils/event-bus.js';

export interface BenchmarkConfig {
  /** Number of iterations to run */
  iterations: number;
  /** Warmup iterations before actual measurement */
  warmupIterations: number;
  /** Timeout for each iteration in milliseconds */
  timeout: number;
  /** Whether to collect memory usage during benchmarks */
  collectMemoryStats: boolean;
  /** Whether to collect CPU usage during benchmarks */
  collectCpuStats: boolean;
}

export interface BenchmarkResult {
  /** Benchmark name */
  name: string;
  /** Total iterations executed */
  iterations: number;
  /** Average execution time in milliseconds */
  averageTime: number;
  /** Minimum execution time in milliseconds */
  minTime: number;
  /** Maximum execution time in milliseconds */
  maxTime: number;
  /** Standard deviation of execution times */
  standardDeviation: number;
  /** Operations per second */
  operationsPerSecond: number;
  /** Memory statistics */
  memoryStats?: MemoryBenchmarkStats;
  /** CPU statistics */
  cpuStats?: CpuBenchmarkStats;
  /** Individual iteration timings */
  timings: number[];
  /** Timestamp when benchmark was executed */
  timestamp: Date;
}

export interface MemoryBenchmarkStats {
  /** Initial memory usage in bytes */
  initial: number;
  /** Peak memory usage in bytes */
  peak: number;
  /** Final memory usage in bytes */
  final: number;
  /** Average memory usage in bytes */
  average: number;
  /** Memory growth during benchmark in bytes */
  growth: number;
  /** Whether memory leaks were detected */
  leaksDetected: boolean;
}

export interface CpuBenchmarkStats {
  /** Average CPU usage percentage */
  averageUsage: number;
  /** Peak CPU usage percentage */
  peakUsage: number;
  /** CPU time used in microseconds */
  cpuTime: number;
}

export interface BenchmarkSuite {
  /** Suite name */
  name: string;
  /** Suite description */
  description: string;
  /** Benchmark functions */
  benchmarks: Map<string, () => Promise<void> | void>;
  /** Suite configuration */
  config: BenchmarkConfig;
}

export interface PerformanceReport {
  /** Report generation timestamp */
  timestamp: Date;
  /** Total execution time for all benchmarks */
  totalDuration: number;
  /** Number of benchmarks executed */
  benchmarkCount: number;
  /** Individual benchmark results */
  results: BenchmarkResult[];
  /** Performance summary statistics */
  summary: {
    fastestBenchmark: string;
    slowestBenchmark: string;
    averagePerformance: number;
    totalOperations: number;
    overallThroughput: number;
  };
}

/**
 * Performance Benchmarking System
 *
 * Provides comprehensive performance testing capabilities including:
 * - Execution time measurement with statistical analysis
 * - Memory usage tracking and leak detection
 * - CPU utilization monitoring
 * - Performance regression detection
 * - Detailed reporting and visualization
 */
export class PerformanceBenchmark {
  private logger: Logger;
  private eventBus: EventBus;
  private defaultConfig: BenchmarkConfig;
  private suites: Map<string, BenchmarkSuite> = new Map();

  constructor(defaultConfig: Partial<BenchmarkConfig> = {}) {
    this.defaultConfig = {
      iterations: 1000,
      warmupIterations: 100,
      timeout: 10000,
      collectMemoryStats: true,
      collectCpuStats: true,
      ...defaultConfig,
    };

    this.logger = new Logger('PerformanceBenchmark');
    this.eventBus = EventBus.getInstance();
  }

  /**
   * Create a new benchmark suite
   */
  createSuite(
    name: string,
    description: string,
    config: Partial<BenchmarkConfig> = {},
  ): BenchmarkSuite {
    const suite: BenchmarkSuite = {
      name,
      description,
      benchmarks: new Map(),
      config: { ...this.defaultConfig, ...config },
    };

    this.suites.set(name, suite);
    this.logger.info(`Created benchmark suite: ${name}`, { description, config: suite.config });

    return suite;
  }

  /**
   * Add a benchmark to a suite
   */
  addBenchmark(
    suiteName: string,
    benchmarkName: string,
    benchmarkFn: () => Promise<void> | void,
  ): void {
    const suite = this.suites.get(suiteName);
    if (!suite) {
      throw new Error(`Benchmark suite '${suiteName}' not found`);
    }

    suite.benchmarks.set(benchmarkName, benchmarkFn);
    this.logger.debug(`Added benchmark '${benchmarkName}' to suite '${suiteName}'`);
  }

  /**
   * Run a specific benchmark
   */
  async runBenchmark(
    benchmarkFn: () => Promise<void> | void,
    name: string,
    config: BenchmarkConfig,
  ): Promise<BenchmarkResult> {
    this.logger.info(`Starting benchmark: ${name}`, { config });

    const timings: number[] = [];
    const memoryStats: number[] = [];
    const initialMemory = process.memoryUsage();
    let peakMemory = initialMemory.heapUsed;

    // Warmup phase
    this.logger.debug(`Running ${config.warmupIterations} warmup iterations`);
    for (let i = 0; i < config.warmupIterations; i++) {
      await this.executeBenchmarkIteration(benchmarkFn, config.timeout);
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Actual benchmark phase
    this.logger.debug(`Running ${config.iterations} benchmark iterations`);
    const benchmarkStartTime = Date.now();

    for (let i = 0; i < config.iterations; i++) {
      const iterationStartTime = process.hrtime.bigint();

      await this.executeBenchmarkIteration(benchmarkFn, config.timeout);

      const iterationEndTime = process.hrtime.bigint();
      const duration = Number(iterationEndTime - iterationStartTime) / 1000000; // Convert to ms
      timings.push(duration);

      // Collect memory stats
      if (config.collectMemoryStats) {
        const currentMemory = process.memoryUsage().heapUsed;
        memoryStats.push(currentMemory);
        peakMemory = Math.max(peakMemory, currentMemory);
      }
    }

    const benchmarkEndTime = Date.now();
    const finalMemory = process.memoryUsage();

    return this.calculateBenchmarkResult(
      name,
      timings,
      config,
      benchmarkStartTime,
      benchmarkEndTime,
      initialMemory,
      finalMemory,
      peakMemory,
      memoryStats,
    );
  }

  /**
   * Run all benchmarks in a suite
   */
  async runSuite(suiteName: string): Promise<BenchmarkResult[]> {
    const suite = this.suites.get(suiteName);
    if (!suite) {
      throw new Error(`Benchmark suite '${suiteName}' not found`);
    }

    this.logger.info(`Running benchmark suite: ${suiteName}`, {
      benchmarkCount: suite.benchmarks.size,
      config: suite.config,
    });

    const results: BenchmarkResult[] = [];

    for (const [benchmarkName, benchmarkFn] of suite.benchmarks) {
      try {
        const result = await this.runBenchmark(benchmarkFn, benchmarkName, suite.config);
        results.push(result);

        this.logger.info(`Completed benchmark: ${benchmarkName}`, {
          averageTime: result.averageTime,
          operationsPerSecond: result.operationsPerSecond,
        });

      } catch (error) {
        this.logger.error(`Benchmark failed: ${benchmarkName}`, { error });
        throw error;
      }
    }

    return results;
  }

  /**
   * Run all benchmark suites
   */
  async runAllSuites(): Promise<PerformanceReport> {
    const reportStartTime = Date.now();
    const allResults: BenchmarkResult[] = [];

    this.logger.info('Running all benchmark suites', {
      suiteCount: this.suites.size,
    });

    for (const suiteName of this.suites.keys()) {
      try {
        const suiteResults = await this.runSuite(suiteName);
        allResults.push(...suiteResults);
      } catch (error) {
        this.logger.error(`Failed to run benchmark suite: ${suiteName}`, { error });
        throw error;
      }
    }

    const reportEndTime = Date.now();
    const totalDuration = reportEndTime - reportStartTime;

    return this.generatePerformanceReport(allResults, totalDuration);
  }

  /**
   * Execute a single benchmark iteration with timeout protection
   */
  private async executeBenchmarkIteration(
    benchmarkFn: () => Promise<void> | void,
    timeout: number,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Benchmark iteration timed out after ${timeout}ms`));
      }, timeout);

      try {
        await benchmarkFn();
        clearTimeout(timeoutId);
        resolve();
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Calculate benchmark result statistics
   */
  private calculateBenchmarkResult(
    name: string,
    timings: number[],
    config: BenchmarkConfig,
    startTime: number,
    endTime: number,
    initialMemory: NodeJS.MemoryUsage,
    finalMemory: NodeJS.MemoryUsage,
    peakMemory: number,
    memoryStats: number[],
  ): BenchmarkResult {
    // Time statistics
    const averageTime = timings.reduce((sum, time) => sum + time, 0) / timings.length;
    const minTime = Math.min(...timings);
    const maxTime = Math.max(...timings);

    // Standard deviation calculation
    const variance = timings.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / timings.length;
    const standardDeviation = Math.sqrt(variance);

    const operationsPerSecond = 1000 / averageTime;

    // Memory statistics
    let memoryBenchmarkStats: MemoryBenchmarkStats | undefined;
    if (config.collectMemoryStats && memoryStats.length > 0) {
      const averageMemory = memoryStats.reduce((sum, mem) => sum + mem, 0) / memoryStats.length;
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const leaksDetected = memoryGrowth > (initialMemory.heapUsed * 0.1); // 10% growth threshold

      memoryBenchmarkStats = {
        initial: initialMemory.heapUsed,
        peak: peakMemory,
        final: finalMemory.heapUsed,
        average: averageMemory,
        growth: memoryGrowth,
        leaksDetected,
      };
    }

    // CPU statistics (simplified - would need more sophisticated monitoring in production)
    let cpuBenchmarkStats: CpuBenchmarkStats | undefined;
    if (config.collectCpuStats) {
      const cpuUsage = process.cpuUsage();
      cpuBenchmarkStats = {
        averageUsage: 0, // Would need OS-level monitoring
        peakUsage: 0,    // Would need OS-level monitoring
        cpuTime: cpuUsage.user + cpuUsage.system,
      };
    }

    return {
      name,
      iterations: config.iterations,
      averageTime,
      minTime,
      maxTime,
      standardDeviation,
      operationsPerSecond,
      memoryStats: memoryBenchmarkStats,
      cpuStats: cpuBenchmarkStats,
      timings,
      timestamp: new Date(),
    };
  }

  /**
   * Generate comprehensive performance report
   */
  private generatePerformanceReport(
    results: BenchmarkResult[],
    totalDuration: number,
  ): PerformanceReport {
    if (results.length === 0) {
      throw new Error('No benchmark results to generate report from');
    }

    // Find fastest and slowest benchmarks
    const fastestBenchmark = results.reduce((fastest, current) =>
      current.averageTime < fastest.averageTime ? current : fastest,
    );

    const slowestBenchmark = results.reduce((slowest, current) =>
      current.averageTime > slowest.averageTime ? current : slowest,
    );

    // Calculate overall statistics
    const averagePerformance = results.reduce((sum, result) =>
      sum + result.averageTime, 0) / results.length;

    const totalOperations = results.reduce((sum, result) =>
      sum + result.iterations, 0);

    const overallThroughput = totalOperations / (totalDuration / 1000); // ops per second

    const report: PerformanceReport = {
      timestamp: new Date(),
      totalDuration,
      benchmarkCount: results.length,
      results,
      summary: {
        fastestBenchmark: fastestBenchmark.name,
        slowestBenchmark: slowestBenchmark.name,
        averagePerformance,
        totalOperations,
        overallThroughput,
      },
    };

    this.logPerformanceReport(report);
    return report;
  }

  /**
   * Log performance report summary
   */
  private logPerformanceReport(report: PerformanceReport): void {
    this.logger.info('Performance Benchmark Report', {
      benchmarkCount: report.benchmarkCount,
      totalDuration: `${report.totalDuration}ms`,
      fastestBenchmark: report.summary.fastestBenchmark,
      slowestBenchmark: report.summary.slowestBenchmark,
      averagePerformance: `${report.summary.averagePerformance.toFixed(2)}ms`,
      overallThroughput: `${report.summary.overallThroughput.toFixed(2)} ops/sec`,
    });

    // Log detailed results
    for (const result of report.results) {
      this.logger.debug(`Benchmark: ${result.name}`, {
        averageTime: `${result.averageTime.toFixed(2)}ms`,
        minTime: `${result.minTime.toFixed(2)}ms`,
        maxTime: `${result.maxTime.toFixed(2)}ms`,
        standardDeviation: `${result.standardDeviation.toFixed(2)}ms`,
        operationsPerSecond: `${result.operationsPerSecond.toFixed(2)} ops/sec`,
        memoryGrowth: result.memoryStats?.growth ? `${(result.memoryStats.growth / 1024 / 1024).toFixed(2)}MB` : 'N/A',
        leaksDetected: result.memoryStats?.leaksDetected || false,
      });
    }
  }

  /**
   * Get all registered benchmark suites
   */
  getSuites(): Map<string, BenchmarkSuite> {
    return new Map(this.suites);
  }

  /**
   * Remove a benchmark suite
   */
  removeSuite(suiteName: string): boolean {
    return this.suites.delete(suiteName);
  }

  /**
   * Clear all benchmark suites
   */
  clearAllSuites(): void {
    this.suites.clear();
    this.logger.info('Cleared all benchmark suites');
  }
}
