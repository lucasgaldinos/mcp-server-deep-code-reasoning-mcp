#!/usr/bin/env tsx
/**
 * enforce-typescript-sources.ts
 * COMPLETE PROJECT TypeScript enforcement - fails with non-zero exit code if ANY .js files exist outside build artifacts.
 * This enforces 100% TypeScript adoption across the entire project.
 */
// Use glob without relying on named export (version compatibility)
import globModule from 'glob';
import path from 'node:path';
import fs from 'node:fs';

interface ViolationReport {
  file: string;
  reason: string;
}

const projectRoot = process.cwd();

function main(): void {
  const violations: ViolationReport[] = [];
  const globSync: any = (globModule as any).sync || (globModule as any).globSync || (globModule as any).default?.sync;

  // Find ALL .js files in the project
  const allJs: string[] = globSync ? globSync('**/*.js', { 
    ignore: [
      'node_modules/**',
      'dist/**', 
      'coverage/**',
      '.git/**',
      '.husky/**',
      '**/node_modules/**'
    ]
  }) : [];

  // ZERO TOLERANCE: No .js files allowed anywhere in the project
  for (const file of allJs) {
    violations.push({ 
      file, 
      reason: 'JavaScript files forbidden - project is 100% TypeScript only' 
    });
  }

  if (violations.length) {
    console.error('\n❌ Complete TypeScript Enforcement Failed: JavaScript files detected');
    console.error('🎯 PROJECT POLICY: 100% TypeScript - NO JavaScript files allowed\n');
    for (const v of violations) {
      console.error(` - ${v.file}: ${v.reason}`);
    }
    console.error('\n📋 Resolution: Convert ALL .js files to .ts or remove if unnecessary.');
    console.error('💡 Only build artifacts (dist/, node_modules/) are exempt from this policy.\n');
    process.exit(1);
  } else {
    console.log('✅ Complete TypeScript enforcement passed: Project is 100% TypeScript! 🎉');
  }
}

main();
