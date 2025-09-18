#!/usr/bin/env tsx
/**
 * enforce-typescript-sources.ts
 * Fails with non-zero exit code if disallowed .js source files are present in the project.
 * Allowed exceptions: tool-required config files (jest.config.js etc.), generated/vendor, dist output, husky hooks.
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

// Patterns considered allowed (tooling constraints)
const allowedConfigPatterns = [
  'jest.config.js',
  'eslint.config.js',
  'vite.config.js',
  'vitest.config.js',
  'tsconfig.*.js',
];

function isAllowedConfig(file: string): boolean {
  return allowedConfigPatterns.some(p => file.endsWith(p));
}

function main(): void {
  const violations: ViolationReport[] = [];

  // Disallow any raw JS inside src/ except __mocks__ and explicitly documented vendor shims
  const globSync: any = (globModule as any).sync || (globModule as any).globSync || (globModule as any).default?.sync;
  const srcJs: string[] = globSync ? globSync('src/**/*.js', { ignore: ['src/**/__mocks__/**'] }) : [];
  for (const file of srcJs) {
    violations.push({ file, reason: 'Disallowed JavaScript in src – migrate to TypeScript' });
  }

  // Disallow JS in scripts/** (all internal automation must be TypeScript)
  const scriptJs: string[] = globSync ? globSync('scripts/**/*.js') : [];
  for (const file of scriptJs) {
    // Skip Husky internal shim or empty placeholder if any future need
    if (file.includes('.husky/') || file.endsWith('husky.sh')) continue;
    // Skip allowed config patterns if someone placed them there (rare)
    if (isAllowedConfig(file)) continue;
    violations.push({ file, reason: 'Scripts must use TypeScript (.ts)' });
  }

  // Root-level .js files (except allowed configs) should be migrated or relocated
  const rootJs: string[] = globSync ? globSync('*.js') : [];
  for (const file of rootJs) {
    if (isAllowedConfig(file)) continue;
    // If it is clearly a build artifact, skip (none expected in root, but guard anyway)
    const stat = fs.statSync(path.join(projectRoot, file));
    if (stat.isFile()) {
      violations.push({ file, reason: 'Root JavaScript file – relocate & migrate to TypeScript' });
    }
  }

  if (violations.length) {
    console.error('\n❌ TypeScript Enforcement Failed: Disallowed JavaScript sources found');
    for (const v of violations) {
      console.error(` - ${v.file}: ${v.reason}`);
    }
    console.error('\nResolution: Migrate listed files to .ts or document an explicit exception.');
    process.exit(1);
  } else {
    console.log('✅ TypeScript enforcement passed: No disallowed .js sources detected.');
  }
}

main();
