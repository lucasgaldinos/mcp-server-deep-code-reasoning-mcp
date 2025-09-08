/**
 * @fileoverview Simplified test suite for Phase 4 Testing Infrastructure
 * @description Tests for TestSuiteRunner, PerformanceBenchmark, and QualityAssurance systems
 */

import { TestSuiteRunner, TestSuiteConfig } from '../testing/TestSuiteRunner.js';
import { PerformanceBenchmark, BenchmarkConfig } from '../testing/PerformanceBenchmark.js';
import { QualityAssurance, QualityConfig } from '../testing/QualityAssurance.js';

describe('Phase 4 Testing Infrastructure', () => {
  
  describe('TestSuiteRunner', () => {
    let testRunner: TestSuiteRunner;

    beforeEach(() => {
      const config: Partial<TestSuiteConfig> = {
        timeout: 5000,
        retries: 1,
        parallel: false,
        coverage: true,
        reportFormat: 'console',
      };
      testRunner = new TestSuiteRunner(config);
    });

    afterEach(() => {
      testRunner.reset();
    });

    test('should initialize with default configuration', () => {
      const defaultRunner = new TestSuiteRunner();
      expect(defaultRunner).toBeDefined();
    });

    test('should run all test suites successfully', async () => {
      const result = await testRunner.runAllSuites();

      expect(result).toBeDefined();
      expect(result.summary.passed).toBeGreaterThan(0);
      expect(result.summary.coverage).toBeDefined();
    }, 10000);

    test('should track memory usage', async () => {
      const result = await testRunner.runAllSuites();

      expect(result.memoryUsage).toBeDefined();
      expect(result.memoryUsage?.initial).toBeGreaterThanOrEqual(0);
    }, 10000);

    test('should reset state properly', () => {
      testRunner.reset();
      const results = testRunner.getResults();
      expect(results).toHaveLength(0);
    });
  });

  describe('PerformanceBenchmark', () => {
    let benchmark: PerformanceBenchmark;

    beforeEach(() => {
      const config: Partial<BenchmarkConfig> = {
        iterations: 5,
        warmupIterations: 2,
        timeout: 5000,
        collectMemoryStats: true,
        collectCpuStats: true,
      };
      benchmark = new PerformanceBenchmark(config);
    });

    afterEach(() => {
      benchmark.clearAllSuites();
    });

    test('should create benchmark suite', () => {
      const suite = benchmark.createSuite(
        'test-suite',
        'Test benchmark suite',
        { iterations: 5 }
      );

      expect(suite).toBeDefined();
      expect(suite.name).toBe('test-suite');
      expect(suite.description).toBe('Test benchmark suite');
      expect(suite.config.iterations).toBe(5);
    });

    test('should add benchmark to suite', () => {
      benchmark.createSuite('test-suite', 'Test suite');
      
      const simpleBenchmark = async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
      };
      
      benchmark.addBenchmark('test-suite', 'test-benchmark', simpleBenchmark);

      const suites = benchmark.getSuites();
      const suite = suites.get('test-suite');
      expect(suite?.benchmarks.has('test-benchmark')).toBe(true);
    });

    test('should throw error when adding benchmark to non-existent suite', () => {
      const simpleBenchmark = () => {};
      
      expect(() => {
        benchmark.addBenchmark('non-existent', 'test', simpleBenchmark);
      }).toThrow("Benchmark suite 'non-existent' not found");
    });

    test('should run individual benchmark', async () => {
      const simpleBenchmark = async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
      };

      const config: BenchmarkConfig = {
        iterations: 3,
        warmupIterations: 1,
        timeout: 5000,
        collectMemoryStats: true,
        collectCpuStats: true,
      };

      const result = await benchmark.runBenchmark(simpleBenchmark, 'test-benchmark', config);

      expect(result).toBeDefined();
      expect(result.name).toBe('test-benchmark');
      expect(result.iterations).toBe(3);
      expect(result.averageTime).toBeGreaterThan(0);
      expect(result.timings).toHaveLength(3);
      expect(result.operationsPerSecond).toBeGreaterThan(0);
    });

    test('should run benchmark suite', async () => {
      benchmark.createSuite('test-suite', 'Test suite');
      
      const fastBenchmark = async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
      };
      
      const mediumBenchmark = async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
      };

      benchmark.addBenchmark('test-suite', 'fast', fastBenchmark);
      benchmark.addBenchmark('test-suite', 'medium', mediumBenchmark);

      const results = await benchmark.runSuite('test-suite');

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('fast');
      expect(results[1].name).toBe('medium');
      expect(results.every(r => r.iterations > 0)).toBe(true);
    });

    test('should collect memory statistics', async () => {
      const memoryBenchmark = async () => {
        const arr = new Array(1000).fill(0);
        // Use the array to prevent optimization
        arr[0] = 1;
      };

      const config: BenchmarkConfig = {
        iterations: 3,
        warmupIterations: 1,
        timeout: 5000,
        collectMemoryStats: true,
        collectCpuStats: false,
      };

      const result = await benchmark.runBenchmark(memoryBenchmark, 'memory-test', config);

      expect(result.memoryStats).toBeDefined();
      expect(result.memoryStats?.initial).toBeGreaterThan(0);
      expect(result.memoryStats?.peak).toBeGreaterThan(0);
      expect(result.memoryStats?.final).toBeGreaterThan(0);
      expect(typeof result.memoryStats?.leaksDetected).toBe('boolean');
    });
  });

  describe('QualityAssurance', () => {
    let qa: QualityAssurance;

    beforeEach(() => {
      const config: Partial<QualityConfig> = {
        thresholds: {
          minTestCoverage: 80,
          minCodeQuality: 75,
          minDocumentationCoverage: 70,
          minPerformanceScore: 80,
          minSecurityScore: 85,
          minMaintainabilityIndex: 70,
          maxTechnicalDebtRatio: 0.2,
        },
        failOnQualityGate: true,
        reportFormat: 'console',
      };
      qa = new QualityAssurance(config);
    });

    test('should initialize with default configuration', () => {
      const defaultQa = new QualityAssurance();
      expect(defaultQa).toBeDefined();
    });

    test('should run quality analysis', async () => {
      const report = await qa.runQualityAnalysis('/fake/path');

      expect(report).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
      expect(report.metrics).toBeDefined();
      expect(report.qualityGate).toMatch(/passed|failed|warning/);
    });

    test('should calculate quality metrics', async () => {
      const report = await qa.runQualityAnalysis('/fake/path');

      const metrics = report.metrics;
      expect(metrics.testCoverage).toBeGreaterThanOrEqual(0);
      expect(metrics.testCoverage).toBeLessThanOrEqual(100);
      expect(metrics.codeQuality).toBeGreaterThanOrEqual(0);
      expect(metrics.codeQuality).toBeLessThanOrEqual(100);
      expect(metrics.documentationCoverage).toBeGreaterThanOrEqual(0);
      expect(metrics.documentationCoverage).toBeLessThanOrEqual(100);
      expect(metrics.performanceScore).toBeGreaterThanOrEqual(0);
      expect(metrics.performanceScore).toBeLessThanOrEqual(100);
      expect(metrics.securityScore).toBeGreaterThanOrEqual(0);
      expect(metrics.securityScore).toBeLessThanOrEqual(100);
      expect(metrics.maintainabilityIndex).toBeGreaterThanOrEqual(0);
      expect(metrics.maintainabilityIndex).toBeLessThanOrEqual(100);
      expect(metrics.technicalDebtRatio).toBeGreaterThanOrEqual(0);
      expect(metrics.technicalDebtRatio).toBeLessThanOrEqual(1);
    });

    test('should generate recommendations', async () => {
      const report = await qa.runQualityAnalysis('/fake/path');

      expect(Array.isArray(report.recommendations)).toBe(true);
      report.recommendations.forEach(rec => {
        expect(['testing', 'documentation', 'performance', 'security', 'maintainability']).toContain(rec.category);
        expect(['low', 'medium', 'high']).toContain(rec.priority);
        expect(rec.estimatedEffort).toBeGreaterThan(0);
        expect(rec.description).toBeDefined();
        expect(rec.expectedImpact).toBeDefined();
      });
    });

    test('should update quality thresholds', () => {
      const newThresholds = {
        minTestCoverage: 90,
        minCodeQuality: 85,
      };

      qa.updateThresholds(newThresholds);
      const updatedThresholds = qa.getThresholds();

      expect(updatedThresholds.minTestCoverage).toBe(90);
      expect(updatedThresholds.minCodeQuality).toBe(85);
      expect(updatedThresholds.minDocumentationCoverage).toBe(70);
    });
  });

  describe('Integration between Testing Systems', () => {
    test('should provide comprehensive testing pipeline', async () => {
      const testRunner = new TestSuiteRunner({ 
        timeout: 5000,
        coverage: true,
        parallel: true
      });
      
      const benchmark = new PerformanceBenchmark();
      benchmark.createSuite('integration-perf', 'Integration performance tests');
      
      benchmark.addBenchmark('integration-perf', 'end-to-end', async () => {
        // Mock end-to-end operation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
      });

      const qualityAssurance = new QualityAssurance();

      // Run testing pipeline
      const testResults = await testRunner.runAllSuites();
      const perfResults = await benchmark.runAllSuites();
      const qualityResults = await qualityAssurance.runQualityAnalysis('/fake/path');

      // Verify pipeline results
      expect(testResults.summary.total).toBeGreaterThan(0);
      expect(perfResults.benchmarkCount).toBeGreaterThan(0);
      expect(qualityResults.overallScore).toBeGreaterThan(0);
    }, 15000);
  });
});
