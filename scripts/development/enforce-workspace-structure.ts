#!/usr/bin/env tsx
/**
 * enforce-workspace-structure.ts
 * Enforces proper workspace organization and prevents accumulation of stray files
 */
import globModule from 'glob';
import path from 'node:path';
import fs from 'node:fs';

interface StructureViolation {
  file: string;
  issue: string;
  suggestion: string;
}

const projectRoot = process.cwd();

// Define allowed files in root directory
const allowedRootFiles = [
  // Essential project files
  'package.json', 'package-lock.json', 'tsconfig.json', 'jsconfig.json',
  // Documentation
  'README.md', 'CHANGELOG.md', 'TODO.md', 'TASKS.md', 'LICENSE',
  'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'SECURITY.md',
  // Git/CI
  '.gitignore', '.gitattributes',
  // IDE
  '.vscode',
];

// Define allowed directories in root
const allowedRootDirs = [
  'src', 'tests', 'docs', 'scripts', 'config', 'examples',
  'docker', 'k8s', 'security-reports',
  // Build/tooling (should be temporary)
  'dist', 'coverage', 'node_modules', '.git', '.husky'
];

function main(): void {
  const violations: StructureViolation[] = [];
  const globSync: any = (globModule as any).sync || (globModule as any).globSync || (globModule as any).default?.sync;

  // Check root directory for unauthorized files
  const rootItems = fs.readdirSync(projectRoot);
  
  for (const item of rootItems) {
    const fullPath = path.join(projectRoot, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isFile()) {
      if (!allowedRootFiles.includes(item) && 
          !item.startsWith('.env') && 
          !item.endsWith('.md') &&
          !item.match(/^\..*rc$/)) {
        
        // Categorize the violation
        if (item.includes('log')) {
          violations.push({
            file: item,
            issue: 'Log file in root directory',
            suggestion: 'Move to logs/ directory or remove if temporary'
          });
        } else if (item.includes('report') || item.includes('output')) {
          violations.push({
            file: item,
            issue: 'Report/output file in root directory',
            suggestion: 'Move to reports/ directory or remove if temporary'
          });
        } else if (item.includes('test') || item.includes('temp')) {
          violations.push({
            file: item,
            issue: 'Test/temp file in root directory',
            suggestion: 'Move to tests/fixtures/ or examples/ directory'
          });
        } else if (item.includes('cache')) {
          violations.push({
            file: item,
            issue: 'Cache file in root directory',
            suggestion: 'Add to .gitignore and remove from repository'
          });
        } else {
          violations.push({
            file: item,
            issue: 'Unauthorized file in root directory',
            suggestion: 'Move to appropriate subdirectory or document exception'
          });
        }
      }
    } else if (stat.isDirectory()) {
      if (!allowedRootDirs.includes(item) && !item.startsWith('.')) {
        violations.push({
          file: item + '/',
          issue: 'Unauthorized directory in root',
          suggestion: 'Move contents to appropriate existing directory'
        });
      }
    }
  }

  // Check for common organizational issues
  const tempDirs = globSync ? globSync('temp*/', { ignore: ['node_modules/**'] }) : [];
  for (const dir of tempDirs) {
    violations.push({
      file: dir,
      issue: 'Temporary directory should not be committed',
      suggestion: 'Add to .gitignore and remove from repository'
    });
  }

  // Report results
  if (violations.length) {
    console.error('\n❌ Workspace Structure Violations Found:');
    console.error('📁 PROJECT POLICY: Maintain clean, organized workspace structure\n');
    
    for (const v of violations) {
      console.error(` - ${v.file}`);
      console.error(`   Issue: ${v.issue}`);
      console.error(`   Fix: ${v.suggestion}\n`);
    }
    
    console.error('📋 Workspace Structure Rules:');
    console.error('  • Root directory: Only essential project files allowed');
    console.error('  • Source code: Must be in src/');
    console.error('  • Tests: Must be in tests/');
    console.error('  • Documentation: Must be in docs/');
    console.error('  • Scripts: Must be in scripts/');
    console.error('  • Examples: Must be in examples/');
    console.error('  • Temp files: Should not be committed\n');
    
    process.exit(1);
  } else {
    console.log('✅ Workspace structure enforcement passed: Clean and organized! 📁');
  }
}

main();