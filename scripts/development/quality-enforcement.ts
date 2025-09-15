#!/usr/bin/env tsx
/**
 * @fileoverview Quality Enforcement Script - Phase 3 Implementation
 * @description Integrates existing QualityAssurance infrastructure into development workflow
 */

import { QualityAssurance, QualityThresholds } from '../../src/testing/quality-assurance.js';
import { PerformanceBenchmark } from '../../src/testing/performance-benchmark.js';
import { TestSuiteRunner } from '../../src/testing/test-suite-runner.js';
import { Logger } from '../../src/utils/logger.js';
import { EnvironmentValidator } from '../../src/utils/environment-validator.js';
import * as process from 'process';

/**
 * Phase 3 Quality Enforcement
 * Activates existing sophisticated infrastructure to prevent quality issues
 */
async function enforceQuality(): Promise<void> {
  const logger = new Logger('QualityEnforcement');
  
  try {
    logger.info('🚦 Starting Phase 3 Quality Enforcement...');
    
    // Initialize quality systems with existing infrastructure
    const qualityAssurance = new QualityAssurance({
      thresholds: enhancedQualityThresholds,
      failOnQualityGate: true,
      reportFormat: 'console'
    });
    
    const performanceBenchmark = new PerformanceBenchmark({
      iterations: 10,
      warmupIterations: 2,
      timeout: 30000,
      collectMemoryStats: true,
      collectCpuStats: true
    });
    
    const testSuiteRunner = new TestSuiteRunner({
      timeout: 30000,
      coverage: true,
      parallel: false // For enforcement, run sequentially for reliability
    });
    
    // Step 1: Environment Validation
    logger.info('1️⃣ Validating environment configuration...');
    const config = EnvironmentValidator.getValidatedConfig();
    logger.info('✅ Environment validation passed');
    
    // Step 2: Run quality analysis using existing infrastructure
    logger.info('2️⃣ Running comprehensive quality analysis...');
    const qualityReport = await qualityAssurance.runQualityAnalysis('./src');
    
    // Step 3: Performance validation
    logger.info('3️⃣ Running performance validation...');
    const performanceReport = await performanceBenchmark.runAllSuites();
    
    // Step 4: Test suite execution
    logger.info('4️⃣ Executing test suite with quality gates...');
    const testResults = await testSuiteRunner.runAllSuites();
    
    // Step 5: Quality gate enforcement
    logger.info('5️⃣ Enforcing quality gates...');
    
    const qualityPassed = qualityReport.overallScore >= 75;
    const testsPassed = testResults.summary.passed > 0 && testResults.summary.failed === 0;
    const performancePassed = performanceReport.summary.averagePerformance >= 70;
    
    // Generate enforcement report
    const enforcementReport = {
      timestamp: new Date(),
      qualityScore: qualityReport.overallScore,
      testsPassedCount: testResults.summary.passed,
      testsFailedCount: testResults.summary.failed,
      performanceScore: performanceReport.summary.averagePerformance,
      qualityPassed,
      testsPassed,
      performancePassed,
      overallPassed: qualityPassed && testsPassed && performancePassed
    };
    
    // Log results
    logger.info('📊 Quality Enforcement Results:');
    logger.info(`   Quality Score: ${enforcementReport.qualityScore.toFixed(1)}/100 ${qualityPassed ? '✅' : '❌'}`);
    logger.info(`   Tests: ${enforcementReport.testsPassedCount} passed, ${enforcementReport.testsFailedCount} failed ${testsPassed ? '✅' : '❌'}`);
    logger.info(`   Performance Score: ${enforcementReport.performanceScore.toFixed(1)}/100 ${performancePassed ? '✅' : '❌'}`);
    logger.info(`   Overall: ${enforcementReport.overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    // Save enforcement report
    const fs = await import('fs/promises');
    await fs.writeFile(
      './quality-enforcement-report.json',
      JSON.stringify(enforcementReport, null, 2)
    );
    
    if (!enforcementReport.overallPassed) {
      logger.error('🚨 Quality enforcement FAILED - blocking commit/push');
      logger.error('💡 Use "npm run quality:fix" to address issues automatically');
      logger.error('💡 Use "npm run quality:full" for complete quality restoration');
      process.exit(1);
    }
    
    logger.info('🎉 Quality enforcement PASSED - development can proceed');
    
  } catch (error) {
    logger.error('💥 Quality enforcement failed with error:', error);
    process.exit(1);
  }
}

// Enhanced quality configuration for Phase 3
const enhancedQualityThresholds: QualityThresholds = {
  minTestCoverage: 80,        // Higher standard for Phase 3
  minCodeQuality: 75,         // Enforce good practices
  minDocumentationCoverage: 70, // Documentation requirement
  minPerformanceScore: 70,    // Performance gate
  minSecurityScore: 85,       // Security is critical
  minMaintainabilityIndex: 70,  // Maintainability requirement
  maxTechnicalDebtRatio: 0.15 // Limit technical debt
};

// Run quality enforcement if called directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('quality-enforcement.ts');
if (isMainModule) {
  enforceQuality().catch((error) => {
    console.error('Quality enforcement failed:', error);
    process.exit(1);
  });
}

export { enforceQuality, enhancedQualityThresholds };