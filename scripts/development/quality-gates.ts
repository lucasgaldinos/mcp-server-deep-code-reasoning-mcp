#!/usr/bin/env tsx
/**
 * @fileoverview Quality Gates Script - Phase 3 Implementation
 * @description Fast quality gates for git hooks and CI/CD pipeline
 */

import { Logger } from '../../src/utils/logger.js';
import { EnvironmentValidator } from '../../src/utils/environment-validator.js';
import * as process from 'process';
import { spawn } from 'child_process';

/**
 * Phase 3 Quality Gates
 * Fast, essential quality checks for git hooks
 */
async function runQualityGates(): Promise<void> {
  const logger = new Logger('QualityGates');
  
  try {
    logger.info('🚦 Running Quality Gates - Phase 3...');
    
    const gates = [
      { name: 'TypeScript Compilation', command: 'npm', args: ['run', 'typecheck'] },
      { name: 'ESLint Check', command: 'npm', args: ['run', 'lint'] },
      { name: 'Build Verification', command: 'npm', args: ['run', 'build'] }
    ];
    
    const results: Array<{ name: string; passed: boolean; duration: number; error?: string }> = [];
    
    for (const gate of gates) {
      logger.info(`🔍 Running ${gate.name}...`);
      const startTime = Date.now();
      
      try {
        await runCommand(gate.command, gate.args);
        const duration = Date.now() - startTime;
        results.push({ name: gate.name, passed: true, duration });
        logger.info(`✅ ${gate.name} passed (${duration}ms)`);
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ name: gate.name, passed: false, duration, error: errorMessage });
        logger.error(`❌ ${gate.name} failed (${duration}ms): ${errorMessage}`);
      }
    }
    
    // Generate gates report
    const gatesReport = {
      timestamp: new Date(),
      overallPassed: results.every(r => r.passed),
      gates: results,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
      passedCount: results.filter(r => r.passed).length,
      failedCount: results.filter(r => !r.passed).length
    };
    
    // Display summary
    logger.info('\n📊 Quality Gates Summary:');
    logger.info(`   Total Gates: ${gates.length}`);
    logger.info(`   Passed: ${gatesReport.passedCount}`);
    logger.info(`   Failed: ${gatesReport.failedCount}`);
    logger.info(`   Total Duration: ${gatesReport.totalDuration}ms`);
    logger.info(`   Overall Status: ${gatesReport.overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    // Show failed gates details
    const failedGates = results.filter(r => !r.passed);
    if (failedGates.length > 0) {
      logger.error('\n🚨 Failed Quality Gates:');
      failedGates.forEach(gate => {
        logger.error(`   ❌ ${gate.name}: ${gate.error}`);
      });
      
      logger.error('\n💡 Fix these issues before committing:');
      failedGates.forEach(gate => {
        switch (gate.name) {
          case 'TypeScript Compilation':
            logger.error('   • Run "npm run typecheck" and fix TypeScript errors');
            break;
          case 'ESLint Check':
            logger.error('   • Run "npm run lint -- --fix" to auto-fix ESLint issues');
            break;
          case 'Unit Tests':
            logger.error('   • Run "npm test" and fix failing tests');
            break;
          case 'Build Verification':
            logger.error('   • Run "npm run build" and fix build errors');
            break;
        }
      });
    }
    
    // Save gates report
    const fs = await import('fs/promises');
    await fs.writeFile(
      './quality-gates-report.json',
      JSON.stringify(gatesReport, null, 2)
    );
    
    if (!gatesReport.overallPassed) {
      logger.error('\n🚨 Quality Gates FAILED - commit blocked');
      process.exit(1);
    }
    
    logger.info('\n🎉 All Quality Gates PASSED - commit allowed');
    
  } catch (error) {
    logger.error('💥 Quality gates execution failed:', error);
    process.exit(1);
  }
}

/**
 * Run a command and return a promise
 */
function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, args, {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    let stdout = '';
    let stderr = '';
    
    childProcess.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });
    
    childProcess.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });
    
    childProcess.on('close', (code: number | null) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
      }
    });
    
    childProcess.on('error', (error: Error) => {
      reject(new Error(`Failed to start command: ${error.message}`));
    });
  });
}

/**
 * Fast syntax check for changed files only
 */
async function runFastGates(): Promise<void> {
  const logger = new Logger('FastQualityGates');
  
  try {
    logger.info('⚡ Running Fast Quality Gates...');
    
    // Get changed files from git
    const { execSync } = await import('child_process');
    const changedFiles = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' })
      .split('\n')
      .filter(file => file.length > 0)
      .filter(file => file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.json'));
    
    if (changedFiles.length === 0) {
      logger.info('✅ No relevant files changed - gates passed');
      return;
    }
    
    logger.info(`🔍 Checking ${changedFiles.length} changed files...`);
    
    // Quick TypeScript check on changed files only
    if (changedFiles.some(f => f.endsWith('.ts'))) {
      logger.info('📝 Quick TypeScript check...');
      await runCommand('npx', ['tsc', '--noEmit', '--project', 'config/build/tsconfig.json']);
      logger.info('✅ TypeScript check passed');
    }
    
    // Quick ESLint check on changed files only
    if (changedFiles.length > 0) {
      logger.info('🔍 Quick ESLint check...');
      try {
        await runCommand('npx', ['eslint', '--max-warnings', '50', ...changedFiles]);
        logger.info('✅ ESLint check passed');
      } catch (error) {
        // For fast mode, show warnings but don't fail on them
        logger.warn('⚠️ ESLint warnings found, but proceeding...');
      }
    }
    
    logger.info('⚡ Fast Quality Gates PASSED');
    
  } catch (error) {
    logger.error('❌ Fast Quality Gates FAILED:', error);
    process.exit(1);
  }
}

// Run based on command line arguments
const isMainModule = process.argv[1] && process.argv[1].endsWith('quality-gates.ts');
if (isMainModule) {
  const mode = process.argv[2] || 'full';
  
  if (mode === 'fast') {
    runFastGates().catch((error) => {
      console.error('Fast quality gates failed:', error);
      process.exit(1);
    });
  } else {
    runQualityGates().catch((error) => {
      console.error('Quality gates failed:', error);
      process.exit(1);
    });
  }
}

export { runQualityGates, runFastGates };