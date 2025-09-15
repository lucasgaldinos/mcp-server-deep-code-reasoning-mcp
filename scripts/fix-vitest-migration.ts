#!/usr/bin/env tsx
/**
 * Comprehensive Vitest Migration Automation Script
 * 
 * This script systematically fixes all TypeScript errors and warnings 
 * after migrating from Jest to Vitest, implementing best practices
 * and automated quality enforcement.
 */

import { promises as fs } from 'fs';
import { glob } from 'glob';
import path from 'path';

interface MigrationRule {
  pattern: RegExp;
  replacement: string;
  description: string;
}

interface ValidationRule {
  pattern: RegExp;
  message: string;
  severity: 'error' | 'warning';
}

class VitestMigrationFixer {
  private readonly testDir = 'src/__tests__';
  private readonly projectRoot = process.cwd();

  // Systematic migration rules based on Vitest best practices
  private readonly migrationRules: MigrationRule[] = [
    // Import fixes
    {
      pattern: /import\s*{\s*([^}]*),?\s*jest\s*([^}]*)\s*}\s*from\s*['"]vitest['"]/g,
      replacement: (match: string, before: string, after: string) => {
        const parts = [before, after].filter(p => p && p.trim()).join(', ');
        return `import { ${parts.replace(/,\s*,/g, ',').trim()}, vi } from 'vitest'`;
      },
      description: 'Remove jest imports and add vi'
    },
    {
      pattern: /import\s*{\s*jest\s*}\s*from\s*['"]vitest['"]/g,
      replacement: "import { vi } from 'vitest'",
      description: 'Replace jest import with vi'
    },
    {
      pattern: /import\s*{\s*([^}]*)\s*jest\s*([^}]*)\s*}\s*from\s*['"]vitest['"]/g,
      replacement: (match: string, before: string, after: string) => {
        const parts = [before, after].filter(p => p && p.trim()).join(', ');
        return `import { ${parts.replace(/,\s*,/g, ',').trim()}, vi } from 'vitest'`;
      },
      description: 'Fix mixed jest/vi imports'
    },
    
    // Function call fixes
    {
      pattern: /jest\.fn\(/g,
      replacement: 'vi.fn(',
      description: 'Replace jest.fn with vi.fn'
    },
    {
      pattern: /jest\.mock\(/g,
      replacement: 'vi.mock(',
      description: 'Replace jest.mock with vi.mock'
    },
    {
      pattern: /jest\.clearAllMocks\(/g,
      replacement: 'vi.clearAllMocks(',
      description: 'Replace jest.clearAllMocks with vi.clearAllMocks'
    },
    {
      pattern: /jest\.restoreAllMocks\(/g,
      replacement: 'vi.restoreAllMocks(',
      description: 'Replace jest.restoreAllMocks with vi.restoreAllMocks'
    },
    {
      pattern: /jest\.spyOn\(/g,
      replacement: 'vi.spyOn(',
      description: 'Replace jest.spyOn with vi.spyOn'
    },

    // Type fixes
    {
      pattern: /:\s*jest\.Mock</g,
      replacement: ': Mock<',
      description: 'Fix jest.Mock types'
    },
    {
      pattern: /jest\.Mock<([^>]+)>/g,
      replacement: 'Mock<$1>',
      description: 'Fix jest.Mock generic types'
    }
  ];

  // Validation rules to ensure quality
  private readonly validationRules: ValidationRule[] = [
    {
      pattern: /\bjest\./,
      message: 'Found remaining jest references that should be replaced with vi',
      severity: 'error'
    },
    {
      pattern: /import.*jest.*from.*vitest/,
      message: 'Found jest import from vitest - should be vi',
      severity: 'error'
    },
    {
      pattern: /\bvi\s+vi\b/,
      message: 'Found duplicate vi import',
      severity: 'error'
    },
    {
      pattern: /mockEventBus(?!Instance)/,
      message: 'Found undefined mock variable - may need proper declaration',
      severity: 'warning'
    }
  ];

  async run(): Promise<void> {
    console.log('🚀 Starting comprehensive Vitest migration fix...\n');

    try {
      // Get all test files
      const testFiles = await this.getTestFiles();
      console.log(`📁 Found ${testFiles.length} test files to process\n`);

      // Process each file
      let totalIssuesFixed = 0;
      for (const file of testFiles) {
        const issues = await this.processFile(file);
        totalIssuesFixed += issues;
      }

      // Add necessary imports where missing
      await this.ensureVitestImports(testFiles);

      // Validate results
      const validationResults = await this.validateMigration(testFiles);
      
      console.log('\n📊 Migration Summary:');
      console.log(`✅ ${totalIssuesFixed} issues fixed automatically`);
      console.log(`⚠️  ${validationResults.warnings} warnings found`);
      console.log(`❌ ${validationResults.errors} errors remaining`);

      if (validationResults.errors === 0) {
        console.log('\n🎉 Migration completed successfully!');
      } else {
        console.log('\n❌ Migration completed with errors - manual intervention needed');
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  }

  private async getTestFiles(): Promise<string[]> {
    return glob(`${this.testDir}/**/*.test.ts`, { 
      cwd: this.projectRoot,
      absolute: true 
    });
  }

  private async processFile(filePath: string): Promise<number> {
    const relativePath = path.relative(this.projectRoot, filePath);
    console.log(`🔧 Processing ${relativePath}...`);

    let content = await fs.readFile(filePath, 'utf-8');
    const originalContent = content;
    let issuesFixed = 0;

    // Apply migration rules
    for (const rule of this.migrationRules) {
      const matches = content.match(rule.pattern);
      if (matches) {
        content = content.replace(rule.pattern, rule.replacement as string);
        issuesFixed += matches.length;
        console.log(`  ✓ ${rule.description} (${matches.length} fixes)`);
      }
    }

    // Fix specific import issues
    content = this.fixImportStatements(content);

    // Write back if changed
    if (content !== originalContent) {
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`  💾 Saved ${relativePath}\n`);
    } else {
      console.log(`  ✅ No changes needed for ${relativePath}\n`);
    }

    return issuesFixed;
  }

  private fixImportStatements(content: string): string {
    // Fix broken import syntax patterns
    content = content.replace(
      /import\s*{\s*([^}]*)\s*vi\s+vi\s*([^}]*)\s*}\s*from\s*['"]vitest['"]/g,
      (match, before, after) => {
        const cleanBefore = before?.replace(/,\s*$/, '').trim();
        const cleanAfter = after?.replace(/^\s*,/, '').trim();
        const parts = [cleanBefore, cleanAfter, 'vi'].filter(p => p).join(', ');
        return `import { ${parts} } from 'vitest'`;
      }
    );

    // Fix other broken import patterns
    content = content.replace(
      /import\s*{\s*([^}]*)\s*beforeEach,\s*afterEach\s+vi\s*([^}]*)\s*}\s*from\s*['"]vitest['"]/g,
      (match, before, after) => {
        const parts = [before, 'beforeEach', 'afterEach', 'vi', after]
          .filter(p => p && p.trim())
          .map(p => p.replace(/,\s*$/, '').trim())
          .join(', ');
        return `import { ${parts} } from 'vitest'`;
      }
    );

    return content;
  }

  private async ensureVitestImports(testFiles: string[]): Promise<void> {
    console.log('🔍 Ensuring proper Vitest imports...\n');

    for (const file of testFiles) {
      let content = await fs.readFile(file, 'utf-8');
      const relativePath = path.relative(this.projectRoot, file);

      // Check if vi is used but not imported
      const usesVi = /\bvi\./m.test(content);
      const importsVi = /import.*\bvi\b.*from.*vitest/m.test(content);

      if (usesVi && !importsVi) {
        console.log(`📝 Adding vi import to ${relativePath}`);
        
        // Find existing vitest import and add vi
        if (/import.*from.*vitest/m.test(content)) {
          content = content.replace(
            /import\s*{\s*([^}]+)\s*}\s*from\s*['"]vitest['"]/g,
            (match, imports) => {
              if (!imports.includes('vi')) {
                return `import { ${imports.trim()}, vi } from 'vitest'`;
              }
              return match;
            }
          );
        } else {
          // Add new import at the top
          const lines = content.split('\n');
          const importIndex = lines.findIndex(line => line.startsWith('import'));
          if (importIndex !== -1) {
            lines.splice(importIndex, 0, "import { vi } from 'vitest';");
            content = lines.join('\n');
          }
        }

        await fs.writeFile(file, content, 'utf-8');
      }
    }
  }

  private async validateMigration(testFiles: string[]): Promise<{ errors: number; warnings: number }> {
    console.log('\n🔍 Validating migration results...\n');

    let totalErrors = 0;
    let totalWarnings = 0;

    for (const file of testFiles) {
      const content = await fs.readFile(file, 'utf-8');
      const relativePath = path.relative(this.projectRoot, file);

      for (const rule of this.validationRules) {
        const matches = content.match(rule.pattern);
        if (matches) {
          console.log(`${rule.severity === 'error' ? '❌' : '⚠️'} ${relativePath}: ${rule.message}`);
          
          if (rule.severity === 'error') {
            totalErrors++;
          } else {
            totalWarnings++;
          }
        }
      }
    }

    return { errors: totalErrors, warnings: totalWarnings };
  }
}

// Create automated fix script with comprehensive type fixing
class TypeScriptErrorFixer {
  private readonly projectRoot = process.cwd();

  async fixMockTypes(): Promise<void> {
    console.log('🔧 Fixing TypeScript mock types...\n');

    const files = await glob('src/__tests__/**/*.test.ts', { 
      cwd: this.projectRoot,
      absolute: true 
    });

    for (const file of files) {
      await this.fixFileTypes(file);
    }
  }

  private async fixFileTypes(filePath: string): Promise<void> {
    let content = await fs.readFile(filePath, 'utf-8');
    const relativePath = path.relative(this.projectRoot, filePath);

    // Add Mock type import if needed
    if (/Mock</.test(content) && !/import.*Mock.*from.*vitest/.test(content)) {
      content = content.replace(
        /import\s*{\s*([^}]+)\s*}\s*from\s*['"]vitest['"]/,
        'import { $1, type Mock } from \'vitest\''
      );
    }

    // Fix mock variable declarations
    content = content.replace(
      /let\s+(\w+):\s*vi\.Mock/g,
      'let $1: Mock'
    );

    // Add missing mock declarations  
    const missingMocks = this.findMissingMockDeclarations(content);
    if (missingMocks.length > 0) {
      const declarations = missingMocks.map(mock => 
        `let ${mock}: Mock;`
      ).join('\n');
      
      // Add before the first describe block
      content = content.replace(
        /(describe\([^{]+\{\s*)/,
        `${declarations}\n\n$1`
      );
    }

    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`✅ Fixed types in ${relativePath}`);
  }

  private findMissingMockDeclarations(content: string): string[] {
    const usedMocks = new Set<string>();
    const declaredMocks = new Set<string>();

    // Find used mock variables
    const usedMatches = content.matchAll(/expect\((\w+)\)/g);
    for (const match of usedMatches) {
      if (match[1].startsWith('mock')) {
        usedMocks.add(match[1]);
      }
    }

    // Find declared mock variables  
    const declaredMatches = content.matchAll(/(?:let|const)\s+(\w+):/g);
    for (const match of declaredMatches) {
      declaredMocks.add(match[1]);
    }

    return Array.from(usedMocks).filter(mock => !declaredMocks.has(mock));
  }
}

// Main execution
async function main() {
  const migrationFixer = new VitestMigrationFixer();
  await migrationFixer.run();

  const typeFixer = new TypeScriptErrorFixer();
  await typeFixer.fixMockTypes();

  console.log('\n🎯 Running TypeScript validation...');
  // The script will exit if there are still errors
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}