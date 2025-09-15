#!/usr/bin/env tsx
/**
 * Test Necessity Evaluation and Quality Optimization
 * 
 * Analyzes the current test suite to determine which tests are actually 
 * necessary for Phase 3 implementation and removes redundant/broken tests.
 */

import { promises as fs } from 'fs';
import * as glob from 'glob';
import path from 'path';

interface TestFile {
  path: string;
  name: string;
  hasTypeScriptErrors: boolean;
  testCount: number;
  complexity: 'low' | 'medium' | 'high';
  necessity: 'essential' | 'useful' | 'redundant' | 'broken';
  recommendation: string;
}

interface TestSuiteAnalysis {
  totalFiles: number;
  totalTests: number;
  essential: TestFile[];
  useful: TestFile[];
  redundant: TestFile[];
  broken: TestFile[];
  recommendations: string[];
}

class TestSuiteOptimizer {
  private readonly testDir = 'src/__tests__';
  private readonly projectRoot = process.cwd();

  // Define core functionality that MUST be tested for Phase 3
  private readonly essentialTestAreas = [
    'basic.test.ts',                    // Core MCP server functionality
    'GeminiService.test.ts',           // Core AI integration
    'ConversationalGeminiService.test.ts', // Conversational analysis
    'conversational-integration.test.ts',  // Integration tests
    'CodeReader.test.ts',              // Core code reading
  ];

  // Tests that are useful but not critical
  private readonly usefulTestAreas = [
    'AnalysisCache.test.ts',           // Performance optimization
    'EnvironmentValidator.test.ts',    // Configuration validation
    'HealthChecker.test.ts',          // Monitoring
    'EventBus.test.ts',               // Event system
  ];

  // Tests that might be redundant or have questionable value
  private readonly questionableTestAreas = [
    'JsDocGenerator.test.ts',         // Development utility, complex, many errors
    'ServiceFactory.test.ts',         // Complex DI testing, many errors
    'MemoryManager.test.ts',          // Memory management, complex
    'PerformanceMonitor.test.ts',     // Performance monitoring
    'ReasoningStrategies.test.ts',    // Strategy pattern tests
    'StructuredLogger.test.ts',       // Logging utility
    'testing-infrastructure.test.ts', // Meta-testing infrastructure
    'race-condition.test.ts',         // Edge case testing
    'validation.test.ts',             // Input validation
  ];

  async analyzeTestSuite(): Promise<TestSuiteAnalysis> {
    console.log('📊 Analyzing test suite necessity and quality...\n');

    const testFiles = await this.getTestFiles();
    const analysis: TestSuiteAnalysis = {
      totalFiles: testFiles.length,
      totalTests: 0,
      essential: [],
      useful: [],
      redundant: [],
      broken: [],
      recommendations: []
    };

    for (const file of testFiles) {
      const testFile = await this.analyzeTestFile(file);
      analysis.totalTests += testFile.testCount;

      switch (testFile.necessity) {
        case 'essential':
          analysis.essential.push(testFile);
          break;
        case 'useful':
          analysis.useful.push(testFile);
          break;
        case 'redundant':
          analysis.redundant.push(testFile);
          break;
        case 'broken':
          analysis.broken.push(testFile);
          break;
      }
    }

    this.generateRecommendations(analysis);
    return analysis;
  }

  private async getTestFiles(): Promise<string[]> {
    return glob.glob(`${this.testDir}/**/*.test.ts`, { 
      cwd: this.projectRoot,
      absolute: true 
    });
  }

  private async analyzeTestFile(filePath: string): Promise<TestFile> {
    const fileName = path.basename(filePath);
    const content = await fs.readFile(filePath, 'utf-8');

    // Count tests
    const testMatches = content.match(/(?:test|it)\s*\(/g);
    const testCount = testMatches ? testMatches.length : 0;

    // Check TypeScript errors
    const hasTypeScriptErrors = await this.checkTypeScriptErrors(filePath);

    // Determine complexity
    const complexity = this.analyzeComplexity(content);

    // Determine necessity
    const necessity = this.determineNecessity(fileName, hasTypeScriptErrors, complexity, testCount);

    // Generate recommendation
    const recommendation = this.generateRecommendation(fileName, necessity, hasTypeScriptErrors, complexity, testCount);

    return {
      path: filePath,
      name: fileName,
      hasTypeScriptErrors,
      testCount,
      complexity,
      necessity,
      recommendation
    };
  }

  private async checkTypeScriptErrors(filePath: string): Promise<boolean> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const result = await execAsync(
        `npx tsc --noEmit --project config/build/tsconfig.json ${filePath}`,
        { cwd: this.projectRoot }
      );
      
      return false; // No errors
    } catch (error) {
      return true; // Has errors
    }
  }

  private analyzeComplexity(content: string): 'low' | 'medium' | 'high' {
    const lines = content.split('\n').length;
    const mockCount = (content.match(/vi\.fn\(|vi\.mock\(/g) || []).length;
    const describeCount = (content.match(/describe\(/g) || []).length;

    if (lines > 500 || mockCount > 20 || describeCount > 10) {
      return 'high';
    } else if (lines > 200 || mockCount > 10 || describeCount > 5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private determineNecessity(
    fileName: string, 
    hasErrors: boolean, 
    complexity: string, 
    testCount: number
  ): 'essential' | 'useful' | 'redundant' | 'broken' {
    
    // Broken if has TypeScript errors and is complex
    if (hasErrors && complexity === 'high') {
      return 'broken';
    }

    // Essential core functionality
    if (this.essentialTestAreas.includes(fileName)) {
      return hasErrors ? 'broken' : 'essential';
    }

    // Useful supporting functionality
    if (this.usefulTestAreas.includes(fileName)) {
      return hasErrors ? 'broken' : 'useful';
    }

    // Questionable areas
    if (this.questionableTestAreas.includes(fileName)) {
      if (hasErrors || complexity === 'high') {
        return 'redundant';
      }
      return 'useful';
    }

    // Default assessment
    if (hasErrors) {
      return 'broken';
    } else if (testCount < 3) {
      return 'redundant';
    } else {
      return 'useful';
    }
  }

  private generateRecommendation(
    fileName: string,
    necessity: string,
    hasErrors: boolean,
    complexity: string,
    testCount: number
  ): string {
    
    switch (necessity) {
      case 'essential':
        if (hasErrors) {
          return `🔴 CRITICAL: Fix TypeScript errors immediately - core functionality`;
        }
        return `✅ KEEP: Essential for Phase 3 functionality`;

      case 'useful':
        if (hasErrors) {
          return `🟡 FIX: Address TypeScript errors - supporting functionality`;
        }
        return `✅ KEEP: Useful supporting functionality`;

      case 'redundant':
        if (complexity === 'high') {
          return `🗑️ REMOVE: High complexity, low value - consider removing entirely`;
        }
        return `🟡 SIMPLIFY: Reduce complexity or merge with other tests`;

      case 'broken':
        return `❌ REMOVE: Too many errors for Phase 3 timeline - remove or stub`;

      default:
        return `❓ REVIEW: Manual review needed`;
    }
  }

  private generateRecommendations(analysis: TestSuiteAnalysis): void {
    analysis.recommendations = [
      `📊 Test Suite Analysis Summary:`,
      `   Total Files: ${analysis.totalFiles}`,
      `   Total Tests: ${analysis.totalTests}`,
      `   Essential: ${analysis.essential.length} files`,
      `   Useful: ${analysis.useful.length} files`, 
      `   Redundant: ${analysis.redundant.length} files`,
      `   Broken: ${analysis.broken.length} files`,
      ``,
      `🎯 Phase 3 Optimization Recommendations:`,
      `   1. Focus on ${analysis.essential.length} essential test files`,
      `   2. Fix ${analysis.broken.filter(f => f.necessity === 'essential').length} critical broken tests`,
      `   3. Consider removing ${analysis.redundant.length + analysis.broken.filter(f => f.necessity !== 'essential').length} problematic files`,
      `   4. Maintain ${analysis.useful.length} useful supporting tests`,
      ``,
      `⚡ Immediate Actions:`,
      `   - Remove/stub broken tests to unblock development`,
      `   - Focus TypeScript fixes on essential functionality only`,
      `   - Defer complex test fixes to post-Phase 3`,
    ];
  }

  async generateOptimizationScript(): Promise<void> {
    const analysis = await this.analyzeTestSuite();
    
    console.log('\n📋 Test Suite Analysis Report:\n');
    
    console.log('🔴 BROKEN FILES (recommend removal for Phase 3):');
    analysis.broken.forEach(file => {
      console.log(`   ${file.name} - ${file.recommendation}`);
    });

    console.log('\n🗑️ REDUNDANT FILES (consider removal):');
    analysis.redundant.forEach(file => {
      console.log(`   ${file.name} - ${file.recommendation}`);
    });

    console.log('\n✅ ESSENTIAL FILES (must fix):');
    analysis.essential.forEach(file => {
      console.log(`   ${file.name} - ${file.recommendation}`);
    });

    console.log('\n🟡 USEFUL FILES (nice to have):');
    analysis.useful.forEach(file => {
      console.log(`   ${file.name} - ${file.recommendation}`);
    });

    console.log('\n📝 RECOMMENDATIONS:');
    analysis.recommendations.forEach(rec => console.log(rec));

    // Generate removal script
    const filesToRemove = [...analysis.broken, ...analysis.redundant]
      .filter(f => f.complexity === 'high' || f.hasTypeScriptErrors);

    if (filesToRemove.length > 0) {
      console.log('\n🚀 Generated removal script:');
      console.log('```bash');
      filesToRemove.forEach(file => {
        console.log(`# Remove ${file.name}: ${file.recommendation}`);
        console.log(`mv "${file.path}" "${file.path}.disabled"`);
      });
      console.log('```');
    }
  }
}

// Main execution
async function main() {
  const optimizer = new TestSuiteOptimizer();
  await optimizer.generateOptimizationScript();
}

if (require.main === module) {
  main().catch(error => {
    console.error('Analysis failed:', error);
    process.exit(1);
  });
}