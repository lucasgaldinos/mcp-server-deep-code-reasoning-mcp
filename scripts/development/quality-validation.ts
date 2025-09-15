#!/usr/bin/env tsx
/**
 * @fileoverview Quality Validation Script - Phase 3 Implementation
 * @description Non-blocking quality checks for development workflow
 */

import { QualityAssurance } from '../../src/testing/quality-assurance.js';
import { PerformanceBenchmark } from '../../src/testing/performance-benchmark.js';
import { TestSuiteRunner } from '../../src/testing/test-suite-runner.js';
import { Logger } from '../../src/utils/logger.js';
import { enhancedQualityThresholds } from './quality-enforcement.js';
import * as process from 'process';

/**
 * Phase 3 Quality Validation
 * Non-blocking quality assessment for development feedback
 */
async function validateQuality(): Promise<void> {
  const logger = new Logger('QualityValidation');
  
  try {
    logger.info('🔍 Starting Phase 3 Quality Validation...');
    
    // Initialize quality systems with relaxed settings for validation
    const qualityAssurance = new QualityAssurance({
      thresholds: {
        ...enhancedQualityThresholds,
        minTestCoverage: 60,    // Relaxed for development
        minCodeQuality: 60,     // Relaxed for development
      },
      failOnQualityGate: false,  // Non-blocking
      reportFormat: 'console'
    });
    
    const performanceBenchmark = new PerformanceBenchmark({
      iterations: 5,              // Faster for validation
      warmupIterations: 1,
      timeout: 15000,             // Shorter timeout
      collectMemoryStats: true,
      collectCpuStats: false      // Skip CPU for speed
    });
    
    const testSuiteRunner = new TestSuiteRunner({
      timeout: 15000,             // Shorter timeout
      coverage: true,
      parallel: true              // Faster execution
    });
    
    // Step 1: Quick quality scan
    logger.info('1️⃣ Running quick quality scan...');
    const qualityReport = await qualityAssurance.runQualityAnalysis('./src');
    
    // Step 2: Performance validation (lightweight)
    logger.info('2️⃣ Running performance validation...');
    let performanceReport;
    try {
      performanceReport = await performanceBenchmark.runAllSuites();
    } catch (error) {
      logger.warn('Performance benchmark skipped:', error);
      performanceReport = null;
    }
    
    // Step 3: Test execution
    logger.info('3️⃣ Running test validation...');
    const testResults = await testSuiteRunner.runAllSuites();
    
    // Step 4: Generate validation summary
    logger.info('4️⃣ Generating validation summary...');
    
    const validation = {
      timestamp: new Date(),
      qualityScore: qualityReport.overallScore,
      qualityStatus: qualityReport.qualityGate,
      testsPassed: testResults.summary.passed,
      testsFailed: testResults.summary.failed,
      testsSkipped: testResults.summary.skipped,
      coverage: testResults.summary.coverage?.percentage || 0,
      performanceScore: performanceReport?.summary.averagePerformance || 0,
      issues: qualityReport.issues.length,
      recommendations: qualityReport.recommendations.length
    };
    
    // Display results
    logger.info('📊 Quality Validation Summary:');
    logger.info(`   Quality Score: ${validation.qualityScore.toFixed(1)}/100 (${validation.qualityStatus})`);
    logger.info(`   Test Coverage: ${validation.coverage.toFixed(1)}%`);
    logger.info(`   Tests: ${validation.testsPassed} passed, ${validation.testsFailed} failed, ${validation.testsSkipped} skipped`);
    
    if (performanceReport) {
      logger.info(`   Performance: ${validation.performanceScore.toFixed(1)}/100`);
    }
    
    logger.info(`   Issues Found: ${validation.issues}`);
    logger.info(`   Recommendations: ${validation.recommendations}`);
    
    // Show issues if any
    if (qualityReport.issues.length > 0) {
      logger.info('\n🔍 Quality Issues Found:');
      qualityReport.issues.slice(0, 5).forEach((issue, index) => {
        logger.info(`   ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.description}`);
      });
      
      if (qualityReport.issues.length > 5) {
        logger.info(`   ... and ${qualityReport.issues.length - 5} more issues`);
      }
    }
    
    // Show recommendations if any
    if (qualityReport.recommendations.length > 0) {
      logger.info('\n💡 Quality Recommendations:');
      qualityReport.recommendations.slice(0, 3).forEach((rec, index) => {
        logger.info(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.description}`);
      });
      
      if (qualityReport.recommendations.length > 3) {
        logger.info(`   ... and ${qualityReport.recommendations.length - 3} more recommendations`);
      }
    }
    
    // Save validation report
    const fs = await import('fs/promises');
    await fs.writeFile(
      './quality-validation-report.json',
      JSON.stringify(validation, null, 2)
    );
    
    // Provide actionable guidance
    if (validation.qualityScore < 75) {
      logger.warn('\n⚠️  Quality score below enforcement threshold (75)');
      logger.info('💡 Run "npm run quality:enforce" to see blocking issues');
      logger.info('💡 Run "npm run quality:fix" to auto-fix some issues');
    } else {
      logger.info('\n✅ Quality validation passed - ready for enforcement');
    }
    
    logger.info('📄 Detailed report saved to quality-validation-report.json');
    
  } catch (error) {
    logger.error('💥 Quality validation failed with error:', error);
    // Non-blocking - don't exit with error code
    logger.info('⚠️  Validation failed but development can continue');
  }
}

// Run quality validation if called directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('quality-validation.ts');
if (isMainModule) {
  validateQuality().catch((error) => {
    console.error('Quality validation failed:', error);
    // Exit with 0 for non-blocking validation
    process.exit(0);
  });
}

export { validateQuality };