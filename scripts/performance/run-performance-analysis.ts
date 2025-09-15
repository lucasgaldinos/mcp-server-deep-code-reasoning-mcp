#!/usr/bin/env tsx
/**
 * Performance Optimization Script
 * Runs performance analysis and generates optimization recommendations
 */

import { getPerformanceFramework } from '../../src/performance/performance-optimization-framework.js';

async function runPerformanceAnalysis() {
  console.log('⚡ Starting Performance Analysis...\n');

  const framework = getPerformanceFramework({
    enableCaching: true,
    enableMetrics: true,
    enableProfiling: true,
    cacheConfig: {
      stdTTL: 600,
      checkperiod: 120,
      useClones: false,
      deleteOnExpire: true,
      maxKeys: 1000
    },
    metricsRetentionDays: 7,
    profilingThreshold: 100
  });

  // Demo some operations for analysis
  console.log('🧪 Running sample operations for analysis...');

  // Simulate some operations
  await framework.timeOperation('gemini-api-call', async () => {
    await new Promise(resolve => setTimeout(resolve, 250)); // Simulate 250ms API call
    return 'API response';
  }, { type: 'external-api', service: 'gemini' });

  await framework.timeOperation('code-analysis', async () => {
    await new Promise(resolve => setTimeout(resolve, 150)); // Simulate 150ms analysis
    return 'Analysis result';
  }, { type: 'computation', complexity: 'medium' });

  await framework.timeOperation('cache-lookup', async () => {
    await new Promise(resolve => setTimeout(resolve, 5)); // Simulate fast cache lookup
    return 'Cached value';
  }, { type: 'cache', hit: true });

  // Test caching
  framework.cache('test-key', { data: 'test-value', timestamp: Date.now() });
  const cached = framework.getCached('test-key');
  console.log('✅ Cache test:', cached ? 'SUCCESS' : 'FAILED');

  // Generate and print report
  console.log('\n📊 Generating performance report...');
  framework.printPerformanceSummary();

  // Save report
  const reportFile = framework.savePerformanceReport();
  console.log(`\n📁 Performance report saved to: ${reportFile}`);

  // Cleanup
  framework.dispose();
}

async function main() {
  try {
    await runPerformanceAnalysis();
  } catch (error) {
    console.error('Performance analysis failed:', error);
    process.exit(1);
  }
}

main();